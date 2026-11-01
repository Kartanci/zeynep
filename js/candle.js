// Mum sahnesi. Ekran odadaki tek ışık olduğu için alevin titremesi görüntülü aramada yüze de yansır.
// Titreme gerçek zamandan hesaplanıyor, iki ekran aşağı yukarı aynı anda titriyor.
function flicker(t) {
  const hash = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
  const noise = (v) => {
    const i = Math.floor(v), f = v - i, u = f * f * (3 - 2 * f);
    return hash(i) + (hash(i + 1) - hash(i)) * u;
  };
  return 0.5 * noise(t * 1.1) + 0.3 * noise(t * 2.7 + 10) + 0.2 * noise(t * 5.9 + 20);
}

class CandleScene {
  constructor(parent, { strokes, candle, touch = false, onOut = () => {}, onWick = () => {} }) {
    Object.assign(this, { parent, touch, onOut, onWick });
    this.strokes = strokes && strokes.length ? strokes : CakeArt.fallback();
    this.candle = candle || { x: 500, y: 830 };
    this.phase = 'dark';
    this.I = 0;
    this.target = 0;
    this.press = 0;
    this.bend = 0;
    this.outAt = 0;
    this.calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.root = el('div', 'mum-sahne');
    this.ambient = el('div', 'mum-ortam');
    this.pale = el('canvas', 'mum-katman');
    this.darkInk = el('canvas', 'mum-katman mum-isikli');
    this.fx = el('canvas', 'mum-alev');
    this.text = el('div', 'mum-yazi');
    this.root.append(this.ambient, this.pale, this.darkInk, this.fx, this.text);
    parent.append(this.root);
    this.layout();
    this.resizer = () => this.layout();
    window.addEventListener('resize', this.resizer);
    if (touch) this.bind();
    this.alive = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    requestAnimationFrame(() => this.root.classList.add('acik'));
  }

  layout() {
    const r = this.root.getBoundingClientRect();
    const sw = r.width || innerWidth, sh = r.height || innerHeight;
    this.sw = sw;
    this.sh = sh;
    const CH = 200;
    const c = this.candle;
    const wick = { x: c.x + 2, y: c.y - CH - 18 };
    let minX = c.x - 40, maxX = c.x + 40, maxY = c.y;
    for (const st of this.strokes) {
      if (st.k === 'f') continue;
      for (let i = 0; i < st.pts.length; i += 2) {
        minX = Math.min(minX, st.pts[i]);
        maxX = Math.max(maxX, st.pts[i]);
        maxY = Math.max(maxY, st.pts[i + 1]);
      }
    }
    const ss = clamp(Math.min((0.88 * sw) / (maxX - minX), (0.5 * sh) / Math.max(1, maxY - wick.y)), 0.2, Math.min(0.75, sw / 620));
    let tx = sw / 2 + (wick.x - (minX + maxX) / 2) * ss;
    tx = clamp(tx, sw * 0.26, sw * 0.74);
    const ty = sh * 0.42;
    this.wx = tx;
    this.wy = ty;
    this.flameH = Math.max(76, CH * ss * 0.9);
    const ox = tx - wick.x * ss, oy = ty - wick.y * ss;
    this.root.style.setProperty('--wx', `${tx}px`);
    this.root.style.setProperty('--wy', `${ty - this.flameH * 0.4}px`);

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const art = [...this.strokes, ...(this.candleArt || (this.candleArt = CakeArt.candle(c.x, c.y, CH)))];
    this.darkInk.style.setProperty('--wx', `${tx}px`);
    this.darkInk.style.setProperty('--wy', `${ty - this.flameH * 0.4}px`);
    [[this.pale, 'rgba(255,226,186,.3)', 0], [this.darkInk, 'rgba(58,28,8,.82)', 0.5]].forEach(([cv, color, hi]) => {
      cv.width = Math.round(sw * dpr);
      cv.height = Math.round(sh * dpr);
      const x = cv.getContext('2d');
      x.scale(dpr, dpr);
      CakeArt.draw(x, art, { s: ss, ox, oy, color, hi, width: Math.max(1.6, 5.6 * ss) });
    });

    this.fxW = 320;
    this.fxH = Math.min(ty + 110, 520);
    this.fx.width = this.fxW * dpr;
    this.fx.height = this.fxH * dpr;
    this.fx.style.width = `${this.fxW}px`;
    this.fx.style.height = `${this.fxH}px`;
    this.fx.style.left = `${tx - this.fxW / 2}px`;
    this.fx.style.top = `${ty + 110 - this.fxH}px`;
    this.fxBaseY = this.fxH - 110;
    this.fxDpr = dpr;
  }

  bind() {
    const nearFlame = (e) => {
      const r = this.root.getBoundingClientRect();
      const dx = e.clientX - r.left - this.wx;
      const dy = e.clientY - r.top - (this.wy - this.flameH * 0.5);
      return { dx, dy, d: Math.hypot(dx, dy) };
    };
    this.root.addEventListener('pointerdown', (e) => {
      const n = nearFlame(e);
      if (this.phase === 'dark') {
        if (Math.hypot(n.dx, n.dy) < 120) this.onWick();
        return;
      }
      if (this.phase !== 'lit' || this.target < 0.5) return;
      this.tracking = true;
      this.travel = 0;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      if (n.d < 95) this.pressing = true;
    });
    this.root.addEventListener('pointermove', (e) => {
      if (!this.tracking || this.phase !== 'lit') return;
      const n = nearFlame(e);
      if (n.d < 110) {
        this.pressing = true;
        this.travel += Math.hypot(e.clientX - this.lastX, e.clientY - this.lastY);
        this.bend = clamp(-n.dx / 50, -1, 1) * (1 - n.d / 130);
        if (this.travel > 70) this.blow();
      } else {
        this.pressing = false;
      }
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    const up = () => { this.tracking = false; this.pressing = false; };
    this.root.addEventListener('pointerup', up);
    this.root.addEventListener('pointercancel', up);
  }

  light() {
    if (this.phase !== 'dark') return;
    this.phase = 'lit';
    this.target = 1;
    this.litAt = performance.now();
    this.root.classList.add('yandi');
  }

  blow() {
    if (this.phase !== 'lit') return;
    this.phase = 'out';
    this.target = 0;
    this.I = 0;
    this.outAt = performance.now();
    this.ambient.style.opacity = 0;
    this.root.classList.remove('yandi');
    this.root.classList.add('sondu');
    buzz(30);
    this.onOut();
  }

  say(html, cls = '') {
    this.text.className = `mum-yazi ${cls}`;
    this.text.innerHTML = html || '';
    this.text.classList.toggle('dolu', !!html);
  }

  loop(now) {
    if (!this.alive) return;
    const t = (Date.now() / 1000) % 100000;
    const k = Math.min(3, (now - (this.lastFrame || now)) / 16.67);
    this.lastFrame = now;
    if (this.phase === 'lit') {
      if (this.pressing) this.press = Math.min(1, this.press + 0.014 * k);
      else this.press = Math.max(0, this.press - 0.03 * k);
      if (this.press >= 1) this.blow();
      const goal = this.target * (1 - this.press * 0.92);
      const rate = this.press > 0 ? 0.12 : 0.012;
      this.I += (goal - this.I) * Math.min(1, rate * k);
      if (!this.pressing) this.bend *= Math.pow(0.92, k);
    }
    const amp = this.calm ? 0.05 : 0.17;
    const fl = flicker(t);
    this.ambient.style.opacity = (this.I * (1 - amp + amp * fl)).toFixed(3);
    this.darkInk.style.opacity = this.phase === 'lit' ? Math.min(1, this.I * 1.5).toFixed(3) : 0;
    if (this.phase === 'lit') this.pale.style.opacity = Math.max(0, 1 - this.I * 3).toFixed(3);
    else if (this.phase === 'out') this.pale.style.opacity = clamp(1 - (now - this.outAt) / 9000, 0.35, 1).toFixed(3);
    this.drawFx(now, t, fl);
    requestAnimationFrame(this.loop);
  }

  drawFx(now, t, fl) {
    const ctx = this.fx.getContext('2d');
    const d = this.fxDpr;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, this.fxW, this.fxH);
    const x = this.fxW / 2, y = this.fxBaseY;
    if (this.phase === 'lit') {
      const grow = clamp((now - this.litAt) / 900, 0, 1);
      const k = (1 - this.press * 0.8) * (0.25 + 0.75 * grow);
      const h = this.flameH * k * (0.9 + 0.16 * fl);
      const w = this.flameH * 0.27 * k * (0.94 + 0.1 * fl);
      const sway = (Math.sin(t * 2.3) * 0.5 + (fl - 0.5) * 1.4) * this.flameH * 0.09 + this.bend * this.flameH * 0.5;
      this.drawFlame(ctx, x, y, h, w, sway, k);
    } else if (this.phase === 'out') {
      this.drawSmoke(ctx, x, y, (now - this.outAt) / 1000, t);
    }
  }

  drawFlame(ctx, x, y, h, w, sway, k) {
    const hx = x + sway * 0.3, hy = y - h * 0.5, hr = h * 1.3;
    const halo = ctx.createRadialGradient(hx, hy, h * 0.1, hx, hy, hr);
    halo.addColorStop(0, `rgba(255,246,205,${0.5 * k})`);
    halo.addColorStop(0.5, `rgba(255,222,140,${0.15 * k})`);
    halo.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();

    // İç içe damlalar: dış kenar turuncu, orta sarı, göbek beyaz.
    const drop = (sc, color, lift, blur) => {
      const H = h * sc, W = w * sc, by = y - lift * h;
      ctx.shadowBlur = blur;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, by + 2);
      ctx.bezierCurveTo(x - W * 1.3, by - H * 0.12, x - W * 0.78 + sway * 0.3 * sc, by - H * 0.58, x + sway * sc, by - H);
      ctx.bezierCurveTo(x + W * 0.78 + sway * 0.3 * sc, by - H * 0.58, x + W * 1.3, by - H * 0.12, x, by + 2);
      ctx.closePath();
      ctx.fill();
    };
    drop(1, '#ff8d14', 0, 10);
    drop(0.84, '#ffc02e', 0.04, 6);
    drop(0.62, '#ffe680', 0.09, 5);
    drop(0.4, '#fffdf0', 0.14, 6);
    ctx.shadowBlur = 0;

    const r = w * 0.72;
    const base = ctx.createRadialGradient(x, y - h * 0.05, 1, x, y - h * 0.05, r);
    base.addColorStop(0, 'rgba(40,70,210,.55)');
    base.addColorStop(1, 'rgba(40,70,210,0)');
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(x, y - h * 0.05, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(35,15,5,.85)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x + sway * 0.08, y - h * 0.09);
    ctx.stroke();
  }

  drawSmoke(ctx, x, y, age, t) {
    const fade = clamp(1 - (age - 1.5) / 6, 0, 1);
    if (fade <= 0) return;
    const rise = Math.min(y, age * 90);
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const v = (i / 40) * rise;
        const swing = Math.sin(v * 0.028 + t * 1.3 + k * 1.9) * (v * 0.09 + 1) + Math.sin(v * 0.07 + t * 0.8 + k) * (v * 0.03);
        const px = x + swing, py = y - v;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(214,214,214,${(0.26 - k * 0.05) * fade})`;
      ctx.lineWidth = 1.5 + k * 0.9;
      ctx.stroke();
    }
    if (age < 0.8) {
      const a = 1 - age / 0.8;
      ctx.fillStyle = `rgba(255,120,40,${a})`;
      ctx.beginPath();
      ctx.arc(x, y + 1, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  async close(ms = 1400) {
    this.root.classList.add('kapaniyor');
    this.root.style.transitionDuration = `${ms}ms`;
    await sleep(ms);
    this.destroy();
  }

  destroy() {
    this.alive = false;
    window.removeEventListener('resize', this.resizer);
    this.root.remove();
  }
}
