// İki telefon arasındaki canlı hat. Küçük bir MQTT istemcisi; sunucular herkese açık olduğu için
// mesajlar şifreli gider. Hat kurulamazsa defter yine çalışır, sadece canlı kısımlar devreye girmez.
const LIVE_BROKERS = [
  { url: 'wss://broker.hivemq.com:8884/mqtt' },
  { url: 'wss://broker.emqx.io:8084/mqtt' },
  { url: 'wss://public.cloud.shiftr.io', user: 'public', pass: 'public' },
  { url: 'wss://demo.tbmq.io/mqtt', user: 'demo' },
];
// ?oda=prova gibi bir ekle prova, Zeynep'in hattına karışmaz.
const LIVE_TOPIC = `defter/9c41e7a2d06b4f58/${new URLSearchParams(location.search).get('oda') || 'z'}`;
const LIVE_KEY = '5f1ad93c7e2b48a6b0c3d7e19a64f208';

class BrokerLink {
  constructor(cfg, clientId, onPayload, onChange) {
    Object.assign(this, { cfg, clientId, onPayload, onChange });
    this.ready = false;
    this.retry = 2000;
    this.buf = new Uint8Array(0);
    this.connect();
  }

  connect() {
    clearTimeout(this.retryTimer);
    let ws;
    try { ws = new WebSocket(this.cfg.url, ['mqtt']); } catch (e) { return this.scheduleRetry(); }
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    this.buf = new Uint8Array(0);
    this.openTimer = setTimeout(() => { try { ws.close(); } catch (e) {} }, 9000);
    ws.onopen = () => ws.send(this.packetConnect());
    ws.onmessage = (e) => this.feed(new Uint8Array(e.data));
    ws.onerror = () => {};
    ws.onclose = () => {
      clearTimeout(this.openTimer);
      clearInterval(this.pingTimer);
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.ready) { this.ready = false; this.onChange(); }
      this.scheduleRetry();
    };
  }

  scheduleRetry() {
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.connect(), this.retry);
    this.retry = Math.min(this.retry * 2, 45000);
  }

  wake() {
    if (!this.ws) { this.retry = 2000; this.connect(); }
  }

  static str(s) {
    const b = new TextEncoder().encode(s);
    return [b.length >> 8, b.length & 255, ...b];
  }

  static frame(head, body) {
    const len = [];
    let n = body.length;
    do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; len.push(d); } while (n > 0);
    const out = new Uint8Array(1 + len.length + body.length);
    out[0] = head;
    out.set(len, 1);
    out.set(body, 1 + len.length);
    return out;
  }

  packetConnect() {
    const { user, pass } = this.cfg;
    const flags = 2 | (user ? 128 : 0) | (pass ? 64 : 0);
    const body = [...BrokerLink.str('MQTT'), 4, flags, 0, 30, ...BrokerLink.str(this.clientId)];
    if (user) body.push(...BrokerLink.str(user));
    if (pass) body.push(...BrokerLink.str(pass));
    return BrokerLink.frame(0x10, new Uint8Array(body));
  }

  feed(chunk) {
    const merged = new Uint8Array(this.buf.length + chunk.length);
    merged.set(this.buf);
    merged.set(chunk, this.buf.length);
    let pos = 0;
    while (pos + 2 <= merged.length) {
      let i = pos + 1, mult = 1, len = 0, b, complete = true;
      do {
        if (i >= merged.length) { complete = false; break; }
        b = merged[i++];
        len += (b & 127) * mult;
        mult *= 128;
      } while (b & 128);
      if (!complete || i + len > merged.length) break;
      this.handle(merged[pos], merged.subarray(i, i + len));
      pos = i + len;
    }
    this.buf = merged.slice(pos);
  }

  handle(head, body) {
    const type = head >> 4;
    if (type === 2) {
      clearTimeout(this.openTimer);
      if (body[1] !== 0) { try { this.ws.close(); } catch (e) {} return; }
      const sub = [0, 1, ...BrokerLink.str(LIVE_TOPIC), 0];
      this.ws.send(BrokerLink.frame(0x82, new Uint8Array(sub)));
    } else if (type === 9) {
      this.ready = true;
      this.retry = 2000;
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === 1) this.ws.send(new Uint8Array([0xc0, 0]));
      }, 20000);
      this.onChange();
    } else if (type === 3) {
      const topicLen = (body[0] << 8) | body[1];
      const qos = (head >> 1) & 3;
      this.onPayload(body.slice(2 + topicLen + (qos ? 2 : 0)));
    }
  }

  publish(bytes) {
    if (!this.ready || !this.ws || this.ws.readyState !== 1) return;
    const topic = BrokerLink.str(LIVE_TOPIC);
    const body = new Uint8Array(topic.length + bytes.length);
    body.set(topic);
    body.set(bytes, topic.length);
    try { this.ws.send(BrokerLink.frame(0x30, body)); } catch (e) {}
  }
}

class Live {
  constructor({ role, onMessage, onPeer, onReady }) {
    Object.assign(this, { role, onMessage, onPeer, onReady });
    this.id = role + Math.random().toString(36).slice(2, 9);
    this.counter = 0;
    this.seen = new Set();
    this.links = [];
    this.lastPeer = 0;
    this.peerOnline = false;
    this.wasReady = false;
  }

  get connected() { return this.links.some((l) => l.ready); }

  async start() {
    try {
      if (crypto.subtle) {
        const raw = new Uint8Array(LIVE_KEY.match(/../g).map((h) => parseInt(h, 16)));
        this.key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
      }
    } catch (e) {}
    this.links = LIVE_BROKERS.map((cfg, i) => new BrokerLink(cfg, `${this.id}-${i}`, (b) => this.receive(b), () => this.linkChanged()));
    setInterval(() => { if (this.connected) this.send({ t: 'beat' }); }, 5000);
    setInterval(() => this.checkPeer(), 2000);
    const wake = () => this.links.forEach((l) => l.wake());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    window.addEventListener('online', wake);
  }

  linkChanged() {
    const now = this.connected;
    if (now) this.send({ t: 'hello' });
    if (now && this.onReady) this.onReady();
    this.wasReady = now;
  }

  checkPeer() {
    const on = Date.now() - this.lastPeer < 13000;
    if (on !== this.peerOnline) {
      this.peerOnline = on;
      if (this.onPeer) this.onPeer(on);
    }
  }

  async seal(text) {
    const data = new TextEncoder().encode(text);
    if (!this.key) return new Uint8Array([0, ...data]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, data));
    const out = new Uint8Array(13 + ct.length);
    out[0] = 1;
    out.set(iv, 1);
    out.set(ct, 13);
    return out;
  }

  async unseal(bytes) {
    if (bytes[0] === 0) return new TextDecoder().decode(bytes.slice(1));
    if (bytes[0] !== 1 || !this.key) return null;
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(1, 13) }, this.key, bytes.slice(13));
    return new TextDecoder().decode(pt);
  }

  send(obj) {
    if (!this.links.length) return;
    const msg = JSON.stringify({ ...obj, _f: this.id, _n: ++this.counter });
    this.seal(msg).then((bytes) => this.links.forEach((l) => l.publish(bytes))).catch(() => {});
  }

  async receive(bytes) {
    let m;
    try { m = JSON.parse(await this.unseal(bytes)); } catch (e) { return; }
    if (!m || m._f === this.id) return;
    const tag = `${m._f}:${m._n}`;
    if (this.seen.has(tag)) return;
    if (this.seen.size > 6000) this.seen.clear();
    this.seen.add(tag);
    this.lastPeer = Date.now();
    if (!this.peerOnline) this.checkPeer();
    if (m.t !== 'beat' && this.onMessage) this.onMessage(m);
  }
}
