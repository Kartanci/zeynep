// Zeynep'in defteri
const STORE_KEY = 'zeynep-defter-v2';
const params = new URLSearchParams(location.search);
if (params.has('sifirla')) {
  try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  params.delete('sifirla');
  history.replaceState(null, '', location.pathname + (params.toString() ? `?${params}` : ''));
}
const FAST = params.has('hizli');
const PAPER = '#fbf8ee';
const COVER = '#1d3a86';
const BOARD = '#2c4a3b';

const S = Object.assign({ page: 'kapak', bozulan: [] }, (() => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
})());
if (params.get('sayfa')) S.page = params.get('sayfa');
if (S.page === 'sira') S.bitti = true;

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {}
}

function setTheme(color) {
  document.querySelector('meta[name=theme-color]').content = color;
  document.body.style.background = color;
}

function examScore() {
  if (!S.sinav) return null;
  const q = ICERIK.sorular;
  if (S.sinav.marks.some((m) => m === null || m === undefined)) return null;
  return q.reduce((sum, item, i) => sum + (S.sinav.marks[i] ? item.puan : 0), 0);
}

function gradeComment(score) {
  if (score >= 100) return 'Pekiyi. Şımarmasın.';
  if (score >= 85) return 'İyi. Daha iyisini biliyor, yapmıyor.';
  if (score >= 70) return 'Orta. Potansiyeli var, kullanmıyor.';
  if (score >= 50) return 'Geçer. Bu seferlik.';
  return 'Yarın velisiyle gelsin.';
}

function wrongCount() {
  return S.sinav ? S.sinav.marks.filter((m) => m === 0).length : 0;
}

function broadcast() {
  Book.live.send({
    t: 'state',
    s: {
      page: S.page,
      kas: S.kas || null,
      sinav: S.sinav || null,
      oyun: S.oyun || null,
      candle: S.pasta ? S.pasta.candle : null,
      isik: S.isik,
      mum: S.mum || null,
      mumSaat: S.mumSaat || null,
      kazilan: S.kazi ? S.kazi.won.map((i) => ICERIK.kuponlar[i]) : [],
      biletKalan: S.kazi ? S.kazi.order.length - S.kazi.won.length : 0,
      odev: S.odev === undefined ? null : S.odev,
      gorus: S.gorus || null,
      portre: S.portre ? { bitti: !!S.portre.bitti, asildi: !!S.portre.asildi, ciziyor: !!S.portre.ciziyor } : null,
      bitti: !!S.bitti,
    },
  });
}

// Harfleri tek tek açılacak parçalara ayırır.
function splitLetters(node) {
  const text = node.textContent;
  node.textContent = '';
  const out = [];
  for (const ch of text) {
    const c = el('span', 'harf');
    c.textContent = ch === ' ' ? ' ' : ch;
    c.style.transform = `translateY(${rand(-0.8, 0.8).toFixed(1)}px) rotate(${rand(-2, 2).toFixed(1)}deg)`;
    node.append(c);
    out.push(c);
  }
  return out;
}

// Sayfa dışındaki yerlerde (etiket gibi) kalemle yazdırma.
function revealWithPen(chars, speed, ink) {
  return new Promise((res) => {
    if (FAST) {
      chars.forEach((c) => c.classList.add('v'));
      return res();
    }
    Scribe.begin(ink);
    let i = 0;
    let due = performance.now();
    const step = () => {
      const now = performance.now();
      while (i < chars.length && now >= due) {
        chars[i++].classList.add('v');
        due += rand(26, 58) / speed;
      }
      if (i) Scribe.toChar(chars[i - 1]);
      if (i < chars.length) setTimeout(step, 16);
      else {
        Scribe.idle(350);
        res();
      }
    };
    step();
  });
}

// Karneye damga vurulunca dökülen delgeç pulları. Sitede başka konfeti yok.
function punchBurst(leaf, origin) {
  if (FAST) return;
  const lr = leaf.getBoundingClientRect();
  const o = origin.getBoundingClientRect();
  const cv = el('canvas', 'talas');
  cv.width = lr.width;
  cv.height = lr.height;
  leaf.append(cv);
  const x = cv.getContext('2d');
  const colors = ['#fffdf6', '#f6f1e2', '#d9e6f1', '#fbf8ee', '#c9dcec'];
  const bits = [];
  for (let i = 0; i < 34; i++) {
    bits.push({
      x: o.left - lr.left + o.width * Math.random(),
      y: o.top - lr.top + o.height * Math.random(),
      vx: rand(-2.6, 2.6),
      vy: rand(-6.2, -1.4),
      r: rand(2.4, 4.2),
      a: rand(0, 6.28),
      va: rand(0.08, 0.26),
      c: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  const start = performance.now();
  const frame = (now) => {
    x.clearRect(0, 0, cv.width, cv.height);
    for (const b of bits) {
      b.vy += 0.17;
      b.vx *= 0.985;
      b.x += b.vx;
      b.y += b.vy;
      b.a += b.va;
      const flat = Math.abs(Math.cos(b.a));
      x.fillStyle = 'rgba(40,30,10,.18)';
      x.beginPath();
      x.ellipse(b.x + 1, b.y + 1.4, b.r, Math.max(0.5, b.r * flat), 0, 0, 7);
      x.fill();
      x.fillStyle = b.c;
      x.beginPath();
      x.ellipse(b.x, b.y, b.r, Math.max(0.5, b.r * flat), 0, 0, 7);
      x.fill();
    }
    if (now - start < 2400) requestAnimationFrame(frame);
    else cv.remove();
  };
  requestAnimationFrame(frame);
}

function sendBoardDump() {
  const list = S.pasta && S.pasta.strokes;
  if (!list || !list.length) return;
  for (let i = 0; i < list.length; i += 14) {
    setTimeout(() => Book.live.send({ t: 'dall', part: list.slice(i, i + 14) }), i * 4);
  }
}

class Page {
  constructor(id) {
    this.id = id;
    this.leaf = el('section', 'yaprak');
    this.leaf.dataset.sayfa = id;
    this.body = el('div', 'icerik');
    this.leaf.append(this.body);
    this.skipFlag = false;
    this.tapWaiters = [];
    this.canTurn = false;
    this.bindGestures();
  }

  drawMargin() {
    const h = Math.max(innerHeight, 700);
    const s = Pen.svg(10, h, 'marj');
    Pen.stroke(s, Pen.shape.line(4, -6, 5, h + 6), { color: 'var(--marj)', width: 1.3, dur: 0, step: 40, amp: 0.7 });
    const staples = el('div', 'zimba', '<i></i><i></i>');
    this.leaf.prepend(s, staples);
    const no = ORDER.indexOf(this.id);
    if (no > 0) {
      const n = el('div', 'sayfa-no');
      n.textContent = no;
      n.style.transform = `rotate(${rand(-4, 4).toFixed(1)}deg)`;
      this.leaf.append(n);
    }
  }

  // Kalemle çizilerek akışa eklenen karalama.
  async doodle(name, { scale = 1, cls = '', color, width, into = this.body, pen = true } = {}) {
    const d = Doodle.make(name, { scale, cls, color, width });
    into.append(d.el);
    this.reveal(d.el);
    if (FAST || this.instant) {
      d.paint();
      return d.el;
    }
    if (pen) Scribe.begin('mavi');
    await d.draw();
    if (pen) Scribe.idle();
    return d.el;
  }

  // Sayfaya önceden çizilmiş duran karalama.
  decor(name, style, { scale = 1, rotate = 0, color, width = 1.5 } = {}) {
    const d = Doodle.make(name, { scale, color, width, cls: 'kenar-karalama' });
    d.paint();
    Object.assign(d.el.style, style);
    d.el.style.transform = `rotate(${rotate}deg)`;
    this.leaf.append(d.el);
    return d.el;
  }

  // Tarih defterin açıldığı gün olarak kalır; sonradan bakınca o akşam yazar.
  printDate() {
    if (!S.tarih) {
      S.tarih = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }).format(new Date());
      save();
    }
    const d = el('div', 'tarih');
    d.textContent = S.tarih;
    this.body.append(d);
  }

  bindGestures() {
    let sx = 0, sy = 0, moved = false, dragging = false, last = 0, lastT = 0, speed = 0, pid = null;
    const leaf = this.leaf;
    leaf.addEventListener('pointerdown', (e) => {
      sx = last = e.clientX;
      sy = e.clientY;
      lastT = e.timeStamp;
      moved = false;
      dragging = false;
      pid = e.pointerId;
    });
    leaf.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid || pid === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
      if (!this.canTurn || Book.flipping) return;
      if (!dragging && dx < -14 && Math.abs(dx) > Math.abs(dy) * 1.2 && !e.target.closest('.tuval,canvas,input')) {
        dragging = Book.beginDrag();
        if (dragging) { try { leaf.setPointerCapture(e.pointerId); } catch (err) {} }
      }
      if (dragging) {
        speed = (e.clientX - last) / Math.max(1, e.timeStamp - lastT);
        last = e.clientX;
        lastT = e.timeStamp;
        Book.dragTo(clamp(dx / leaf.clientWidth, -1, 0));
      }
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      if (dragging) {
        dragging = false;
        Book.endDrag(speed < -0.35);
        return;
      }
      if (!moved && !e.target.closest('button,input,a,.tuval,.bilet-alan,.surukle-mum')) this.tapped();
    };
    leaf.addEventListener('pointerup', end);
    leaf.addEventListener('pointercancel', end);
  }

  tapped() {
    this.skipFlag = true;
    const w = this.tapWaiters;
    this.tapWaiters = [];
    w.forEach((r) => r());
    setTimeout(() => { this.skipFlag = false; }, 30);
  }

  wait(ms) {
    if (FAST || this.instant) return Promise.resolve();
    return new Promise((res) => {
      const t = setTimeout(res, ms);
      this.tapWaiters.push(() => { clearTimeout(t); res(); });
    });
  }

  reveal(node) {
    const box = this.body;
    requestAnimationFrame(() => {
      const r = node.getBoundingClientRect(), b = box.getBoundingClientRect();
      if (r.bottom > b.bottom - 44) box.scrollTo({ top: box.scrollTop + r.bottom - b.bottom + 64, behavior: FAST ? 'auto' : 'smooth' });
    });
  }

  // Metni harf harf yazar. ~~metin~~ üstü çizilir, ==metin== fosforlanır. pen: kalem görünerek yazar.
  async write(text, { cls = '', into = this.body, pause = 240, speed = 1, tag = 'p', pen = false } = {}) {
    const ink = !pen ? null : cls.includes('enes-el') ? 'siyah' : cls.includes('kirmizi') ? 'kirmizi' : 'mavi';
    const p = el(tag, `el ${cls}`);
    const parts = text.split(/(~~.+?~~|==.+?==)/).filter(Boolean);
    const runs = parts.map((part) => {
      let kind = '';
      let body = part;
      if (part.startsWith('~~')) { kind = 'cizik'; body = part.slice(2, -2); }
      if (part.startsWith('==')) { kind = 'fosfor'; body = part.slice(2, -2); }
      const run = { chars: [], struck: [] };
      body.split(/( )/).forEach((w) => {
        if (w === '') return;
        if (w === ' ') { p.append(' '); return; }
        const word = el('span', `kelime ${kind}`);
        for (const ch of w) {
          const c = el('span', 'harf');
          c.textContent = ch;
          c.style.setProperty('--o', rand(0.8, 1).toFixed(2));
          c.style.transform = `translateY(${rand(-0.9, 0.9).toFixed(1)}px) rotate(${rand(-1.8, 1.8).toFixed(1)}deg)`;
          word.append(c);
          run.chars.push(c);
        }
        if (kind === 'cizik') run.struck.push(word);
        p.append(word);
      });
      return run;
    });
    into.append(p);
    this.reveal(p);
    for (const run of runs) {
      await this.revealChars(run.chars, speed, ink);
      if (run.struck.length) await this.strike(p, run.struck, ink);
    }
    if (ink) Scribe.idle();
    await this.wait(pause);
    return p;
  }

  revealChars(chars, speed, ink = null) {
    return new Promise((res) => {
      if (FAST || this.instant) {
        chars.forEach((c) => c.classList.add('v'));
        return res();
      }
      if (ink) Scribe.begin(ink);
      let i = 0;
      let due = performance.now();
      const step = () => {
        const now = performance.now();
        if (this.skipFlag) {
          chars.forEach((c) => c.classList.add('v'));
          this.skipFlag = false;
          return res();
        }
        while (i < chars.length && now >= due) {
          const c = chars[i++];
          c.classList.add('v');
          const ch = c.textContent;
          due += (ch === '.' || ch === '?' || ch === '!' ? 150 : ch === ',' ? 100 : rand(13, 32)) / speed;
        }
        if (ink && i) Scribe.toChar(chars[i - 1]);
        if (i < chars.length) setTimeout(step, 16);
        else res();
      };
      step();
    });
  }

  async strike(p, words, ink = null) {
    await this.wait(260);
    p.style.position = 'relative';
    const pr = p.getBoundingClientRect();
    const lines = new Map();
    words.forEach((w) => {
      const r = w.getBoundingClientRect();
      const key = Math.round(r.top);
      const cur = lines.get(key) || { x0: r.left, x1: r.right, y: r.top + r.height * 0.56 };
      cur.x0 = Math.min(cur.x0, r.left);
      cur.x1 = Math.max(cur.x1, r.right);
      lines.set(key, cur);
    });
    const s = Pen.svg(pr.width, pr.height, 'cizik-katman');
    p.append(s);
    for (const l of lines.values()) {
      const x0 = l.x0 - pr.left - 3, x1 = l.x1 - pr.left + 3, y = l.y - pr.top;
      const dur = FAST || this.instant ? 0 : 240;
      if (ink && dur) Scribe.begin(ink);
      await Pen.stroke(s, `M${x0} ${y + 1}L${x1} ${y - 2}`, { width: 2, dur, step: 12, amp: 0.9, trace: !!ink });
      await Pen.stroke(s, `M${x1 - 2} ${y + 2}L${x0 + 4} ${y + 3}`, { width: 1.6, dur: dur * 0.7, step: 12, amp: 0.9, trace: !!ink });
    }
  }

  choose(labels, { into = this.body } = {}) {
    return new Promise((res) => {
      const box = el('div', 'secenekler');
      let locked = false;
      labels.forEach((label, i) => {
        const b = el('button', 'secenek');
        const s = Pen.svg(26, 26);
        Pen.stroke(s, Pen.shape.box(2, 3, 21, 20), { width: 1.8, dur: 0, step: 5, amp: 0.5 });
        const t = el('span');
        t.textContent = label;
        b.append(s, t);
        b.onclick = async (e) => {
          e.stopPropagation();
          if (locked) return;
          locked = true;
          buzz(10);
          await Pen.stroke(s, Pen.shape.tick(5, 3, 21), { color: 'var(--kirmizi)', width: 2.6, dur: FAST ? 0 : 170, step: 5, amp: 0.4 });
          box.querySelectorAll('.secenek').forEach((o) => { if (o !== b) o.classList.add('soluk'); });
          await sleep(FAST ? 0 : 320);
          res(i);
        };
        box.append(b);
      });
      into.append(box);
      this.reveal(box);
    });
  }

  ask(placeholder) {
    return new Promise((res) => {
      const f = el('form', 'soru-form');
      const input = el('input', 'el-giris');
      input.maxLength = 28;
      input.placeholder = placeholder;
      input.autocomplete = 'off';
      input.autocapitalize = 'off';
      input.setAttribute('autocorrect', 'off');
      input.enterKeyHint = 'done';
      const b = el('button', 'kucuk-dugme', 'yaz');
      f.append(input, b);
      f.onsubmit = (e) => {
        e.preventDefault();
        input.blur();
        res(input.value.trim());
      };
      this.body.append(f);
      this.reveal(f);
      setTimeout(() => input.focus(), 150);
    });
  }

  postit(text, cls = '') {
    const n = el('div', `postit ${cls}`);
    n.textContent = text;
    this.body.append(n);
    this.reveal(n);
    requestAnimationFrame(() => n.classList.add('v'));
    return n;
  }

  clear() {
    this.body.innerHTML = '';
    this.body.scrollTop = 0;
  }

  done(label = 'sayfayı çevir') {
    if (this.canTurn) return;
    this.canTurn = true;
    if (S.bitti && this.id !== 'son' && this.id !== 'arka') label = 'sıraya dön';
    const go = (e) => { e.stopPropagation(); Book.next(); };
    const b = el('button', 'cevir');
    const t = el('span');
    t.textContent = label;
    const s = Pen.svg(34, 14);
    Pen.stroke(s, 'M1 7C10 5 20 9 31 7', { width: 2, dur: 0, step: 6, amp: 0.5 });
    Pen.stroke(s, 'M25 2L32 7L25 12', { width: 2, dur: 0, step: 4, amp: 0.4 });
    b.append(t, s);
    b.onclick = go;
    const ear = el('button', 'kulak');
    ear.setAttribute('aria-label', label);
    ear.onclick = go;
    (this.body.querySelector(':scope > .araclar') || this.body).append(b);
    if (!this.leaf.classList.contains('kapak')) this.leaf.append(ear);
    this.reveal(b);
  }
}

/* ---------- Sayfalar ---------- */
const ORDER = ['kapak', 'psst', 'dogumgunu', 'sinav', 'kazi', 'teneffus', 'portre', 'pasta', 'mum', 'karne', 'son', 'arka'];
const PAGES = {};

// Sıradan yakınlaşınca görünen tam ekran kapak. Yazılar hazır gelir, hemen ardından çevrilir.
PAGES.kapak = {
  build(p) {
    p.leaf.classList.add('kapak');
    p.body.remove();
    p.leaf.innerHTML = `${Desk.notebookHtml()}
      <div class="postit kapak-not v">bunu bende unutmuşsun.<small>(aç)</small></div>`;
    p.leaf.querySelectorAll('[data-yaz]').forEach((b) => {
      const text = b.textContent;
      b.textContent = '';
      for (const ch of text) {
        const c = el('span', 'harf');
        c.textContent = ch === ' ' ? ' ' : ch;
        c.style.transform = `translateY(${rand(-0.8, 0.8).toFixed(1)}px) rotate(${rand(-2, 2).toFixed(1)}deg)`;
        b.append(c);
      }
    });
    // Jelatin kaplığın kırışıkları
    const W = Math.max(innerWidth, 320), H = Math.max(innerHeight, 560);
    const folds = Pen.svg(W, H, 'kapak-kirisik');
    [
      `M${W * 0.62} -10C${W * 0.7} ${H * 0.25} ${W * 0.56} ${H * 0.5} ${W * 0.76} ${H + 10}`,
      `M-10 ${H * 0.66}C${W * 0.3} ${H * 0.6} ${W * 0.55} ${H * 0.74} ${W + 10} ${H * 0.7}`,
      `M${W * 0.14} ${H + 10}C${W * 0.2} ${H * 0.86} ${W * 0.34} ${H * 0.8} ${W * 0.42} ${H * 0.72}`,
    ].forEach((d) => Pen.stroke(folds, d, { color: 'rgba(255,255,255,.075)', width: 1.4, dur: 0, step: 28, amp: 1.2 }));
    p.leaf.prepend(folds);
    p.leaf.querySelectorAll('.harf').forEach((c) => c.classList.add('v'));
  },
  async run() {},
};

PAGES.psst = {
  async run(p) {
    p.printDate();
    await p.wait(450);
    await p.write('psst.');
    await p.wait(500);
    await p.write('zeynep.');
    await p.wait(450);
    await p.write("şu an enes'le görüntülü konuşuyorsun, ~~sanırım~~ biliyorum.");
    await p.write('belli etme. normal davran.');
    await p.wait(500);
    p.postit('köşedeki küçük enes bir yeri kapatırsa parmağınla kenara it. normalde itemezsin, bugün serbest.');
    await p.wait(1500);
    await p.write('şimdi hiçbir şey söylemeden tek kaşını kaldır. beş saniye öyle bak ona.');
    await p.doodle('kas', { cls: 'orta', width: 2 });
    await p.choose(['kaldırdım']);
    await p.write('"ne oldu" dedi mi?');
    const a = await p.choose(['dedi', 'demedi', 'görüntüm donmuş, beni görmüyor']);
    S.kas = ['dedi', 'demedi', 'gormuyor'][a];
    save();
    broadcast();
    if (a === 0) await p.write('güzel. sakın söyleme. "yok bir şey" de.');
    else if (a === 1) await p.write('hiç bakmıyor demek. not ettim, karneye geçecek.');
    else await p.write('olur öyle. sesin gidiyor ya, yeter.');
    p.done();
  },
};

PAGES.dogumgunu = {
  async run(p) {
    p.printDate();
    await p.wait(350);
    await p.write('neyse.');
    await p.write('bugün doğum günün.');
    await p.write(`${ICERIK.yas} oldun.`);
    ageDoodle(p);
    await p.wait(700);
    await p.write('sana güzel bir şey yazacaktım.');
    await p.wait(400);
    await p.write('~~hayatımın anlamı~~', { pen: true });
    await p.write('~~seninle geçen her gün~~', { pen: true });
    await p.write('~~gözlerin~~', { pen: true });
    await p.wait(500);
    await p.write('yok. olmuyor.');
    await p.wait(700);
    await p.write('onun yerine bu defter var. birkaç sayfası dolu, hiçbiri tek başına yapılmıyor.');
    await p.write('hepsinde enes lazım.');
    await p.wait(1000);
    await p.write('üzgünüm.');
    await p.wait(500);
    await drawCrossedHeart(p);
    p.done();
  },
};

// Teneffüste deftere çizilmiş gibi taralı yaş rakamı.
function ageDoodle(p) {
  const n = el('div', 'yas-karalama');
  n.innerHTML = `
    <svg viewBox="0 0 124 96" width="118" height="92" aria-hidden="true">
      <defs>
        <pattern id="tarama" width="5.5" height="5.5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <line x1="0" y1="0" x2="0" y2="5.5" stroke="#1c3c9e" stroke-width="1.4"></line>
        </pattern>
        <filter id="titrek" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="7"></feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="3"></feDisplacementMap>
        </filter>
      </defs>
      <g filter="url(#titrek)">
        <text x="62" y="84" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="82" letter-spacing="4"
          fill="url(#tarama)" stroke="#1c3c9e" stroke-width="1.8">${ICERIK.yas}</text>
      </g>
    </svg>`;
  p.body.append(n);
  requestAnimationFrame(() => n.classList.add('v'));
}

async function drawCrossedHeart(p) {
  const row = el('div', 'kalp-satir');
  const s = Pen.svg(58, 54);
  row.append(s);
  p.body.append(row);
  p.reveal(row);
  const dur = FAST ? 0 : 520;
  if (dur) Scribe.begin('mavi');
  await Pen.stroke(s, Pen.shape.heart(8, 6, 40), { width: 2, dur, step: 5, amp: 0.7, trace: true });
  await sleep(FAST ? 0 : 220);
  await Pen.stroke(s, Pen.shape.zigzag(3, 12, 50, 28, 6), { width: 1.7, dur: dur * 0.7, step: 5, amp: 0.8, trace: true });
  Scribe.idle(300);
  const t = el('span');
  row.append(t);
  await p.write('kalp de çizmiştim. fazla oldu.', { into: t, cls: 'kucuk', tag: 'span', pause: 0 });
}

PAGES.sinav = {
  async run(p) {
    const Q = ICERIK.sorular;
    S.sinav = S.sinav || { marks: Q.map(() => null), basladi: false };
    p.printDate();
    if (!S.sinav.basladi) {
      await p.wait(300);
      await p.write('bugün öğretmen ~~ben~~ sensin. kırmızı kalem sende.');
      await p.write("soruları enes'e sesli oku. doğruysa tik, yanlışsa çarpı. neyin doğru olduğuna sen karar veriyorsun, itiraz hakkı yok.");
      await p.wait(500);
      await p.write('aramızda kalsın: ==her çarpı sana bir kazı kazan kazandırıyor.==');
      await p.wait(600);
      await p.write('vicdanın bilir.');
      await p.choose(['kağıdı ver']);
      S.sinav.basladi = true;
      save();
      broadcast();
      p.clear();
    } else {
      p.clear();
    }

    const sheet = el('div', 'sinav-kagit');
    sheet.innerHTML = `
      <div class="bant"></div>
      <header>
        <div class="sinav-baslik">Doğum Günü Dersi<br>1. Yazılı</div>
        <div class="sinav-bilgi">
          <div>Adı Soyadı: <b>Enes</b><br>Öğretmen: <b>Zeynep</b><br>Süre: öğretmen sıkılana kadar</div>
          <div class="not-kutu"><span>Not</span><strong></strong></div>
        </div>
      </header>
      <ol class="sorular"></ol>
      <div class="sinav-son"></div>
      <div class="sinav-imza"></div>
      <div class="sinav-odev"></div>
      <button class="itiraz-baglanti">enes itiraz ediyor</button>`;
    p.body.append(sheet);
    sheet.querySelector('.itiraz-baglanti').onclick = (e) => { e.stopPropagation(); showObjection(); };
    requestAnimationFrame(() => sheet.classList.add('v'));
    const list = sheet.querySelector('.sorular');
    const tail = sheet.querySelector('.sinav-son');

    const refresh = async () => {
      save();
      broadcast();
      const score = examScore();
      const box = sheet.querySelector('.not-kutu strong');
      if (score === null) return;
      if (box.textContent !== String(score)) {
        box.textContent = score;
        box.querySelector('svg')?.remove();
        const r = Pen.svg(68, 46, 'not-halka');
        box.append(r);
        tail.innerHTML = '';
        const dur = FAST || p.instant ? 0 : 420;
        if (dur) Scribe.begin('kirmizi');
        Pen.stroke(r, Pen.shape.ring(34, 23, 29, 18), { color: 'var(--kirmizi)', width: 2.2, dur, step: 6, amp: 0.8, trace: true });
        await sleep(dur);
        await p.write(`${score} puan. ${gradeComment(score)}`, { into: tail, cls: 'kirmizi', pause: 200, pen: true });
      }
    };

    const addFinished = (i) => {
      const li = el('li', 'soru-bitti');
      const t = el('span', 'soru-yazi');
      t.textContent = Q[i].bos ? 'Müfredat dışı soru.' : Q[i].metin;
      const m = el('button', 'isaret');
      m.setAttribute('aria-label', 'işareti değiştir');
      const paint = (animated) => {
        m.innerHTML = '';
        const s = Pen.svg(34, 30);
        m.append(s);
        const dur = animated && !FAST ? 200 : 0;
        if (S.sinav.marks[i]) Pen.stroke(s, Pen.shape.tick(5, 4, 25), { color: 'var(--kirmizi)', width: 3, dur, step: 5, amp: 0.5 });
        else {
          Pen.stroke(s, 'M6 5L28 26', { color: 'var(--kirmizi)', width: 3, dur: dur / 2, step: 5, amp: 0.5 });
          Pen.stroke(s, 'M28 4L6 26', { color: 'var(--kirmizi)', width: 3, dur: dur / 2, delay: dur / 2, step: 5, amp: 0.5 });
        }
      };
      paint(false);
      m.onclick = (e) => {
        e.stopPropagation();
        S.sinav.marks[i] = S.sinav.marks[i] ? 0 : 1;
        buzz(10);
        paint(true);
        refresh();
      };
      li.append(t, m);
      list.append(li);
    };

    const ask = (i) => new Promise((res) => {
      const li = el('li', 'soru-simdi');
      const no = el('div', 'soru-no');
      no.textContent = Q[i].bos ? `${i + 1}. soru, müfredat dışı (${Q[i].puan} puan)` : `${i + 1}. soru (${Q[i].puan} puan)`;
      const t = el('div', Q[i].bos ? 'soru-yazi soru-bos' : 'soru-yazi');
      if (Q[i].bos) {
        t.innerHTML = '<span></span><span></span>';
      } else {
        t.textContent = Q[i].metin;
      }
      const row = el('div', 'isaret-sira');
      const mk = (ok) => {
        const b = el('button', `isaret-buyuk ${ok ? 'dogru' : 'yanlis'}`);
        const s = Pen.svg(46, 42);
        if (ok) Pen.stroke(s, Pen.shape.tick(6, 5, 34), { color: 'var(--kirmizi)', width: 3.2, dur: 0, step: 6, amp: 0.5 });
        else {
          Pen.stroke(s, 'M8 7L38 36', { color: 'var(--kirmizi)', width: 3.2, dur: 0, step: 6, amp: 0.5 });
          Pen.stroke(s, 'M38 6L8 36', { color: 'var(--kirmizi)', width: 3.2, dur: 0, step: 6, amp: 0.5 });
        }
        const lab = el('span');
        lab.textContent = ok ? 'doğru' : 'yanlış';
        b.append(s, lab);
        b.onclick = (e) => {
          e.stopPropagation();
          buzz(12);
          S.sinav.marks[i] = ok ? 1 : 0;
          save();
          broadcast();
          li.remove();
          addFinished(i);
          res();
        };
        return b;
      };
      row.append(mk(true), mk(false));
      li.append(no, t);
      if (Q[i].bos) {
        const hint = el('div', 'soru-ipucu');
        p.write('bu soru kağıtta yok. aklına ne geliyorsa sor.', { into: hint, cls: 'kirmizi kucuk', pause: 0 });
        li.append(hint);
      }
      li.append(row);
      list.append(li);
      p.reveal(li);
      S.sinav.simdi = i;
      broadcast();
    });

    for (let i = 0; i < Q.length; i++) {
      if (S.sinav.marks[i] === null || S.sinav.marks[i] === undefined) await ask(i);
      else addFinished(i);
    }
    S.sinav.simdi = null;
    await refresh();
    await p.wait(350);
    await examSignature(p, sheet.querySelector('.sinav-imza'));
    await examHomework(p, sheet.querySelector('.sinav-odev'));
    await p.wait(400);
    const w = wrongCount();
    await p.write(w ? `${w} çarpı. biletlerin arka sayfada.` : 'hiç çarpı yok. vicdanlı öğretmen.', { pause: 100 });
    p.done();
  },
};

async function examSignature(p, box) {
  box.innerHTML = '<div class="imza-etiket">Öğretmen imzası</div><div class="imza-ped"></div>';
  const area = box.querySelector('.imza-ped');
  if (S.imza !== undefined) {
    const cv = el('canvas');
    area.append(cv);
    CakeArt.signature(cv, S.imza, area.clientWidth, area.clientHeight);
    return;
  }
  const pad = new Board(area, { me: 'o', W: 1000, H: 360 });
  const row = el('div', 'imza-alt');
  const ok = el('button', 'kucuk-dugme', 'imzaladım');
  row.append(ok);
  box.append(row);
  p.reveal(box);
  p.reveal(row);
  await new Promise((res) => { ok.onclick = (e) => { e.stopPropagation(); res(); }; });
  row.remove();
  pad.active = false;
  S.imza = pad.export();
  save();
  broadcast();
  Book.live.send({ t: 'imza', st: S.imza });
}

async function examHomework(p, box) {
  const show = (text) => {
    box.innerHTML = '<span class="odev-etiket">Ödev:</span> ';
    const t = el('span', 'odev-yazi');
    t.textContent = text || 'yok. şanslı günü.';
    box.append(t);
  };
  if (S.odev !== undefined) return show(S.odev);
  box.innerHTML = '<div class="odev-etiket">Ödev</div>';
  await p.write('bir de ödev ver. öğretmensin sonuçta.', { into: box, cls: 'kirmizi kucuk', pause: 80 });
  const f = el('form', 'soru-form');
  const input = el('input', 'el-giris kirmizi');
  input.maxLength = 70;
  input.placeholder = 'yarına kadar...';
  input.autocomplete = 'off';
  input.enterKeyHint = 'done';
  const give = el('button', 'kucuk-dugme', 'ver');
  const row = el('div', 'odev-yok');
  const none = el('button', 'kalem-baglanti');
  none.type = 'button';
  none.textContent = 'ödev vermeyeceğim';
  row.append(none);
  f.append(input, give);
  box.append(f, row);
  p.reveal(row);
  const text = await new Promise((res) => {
    f.onsubmit = (e) => { e.preventDefault(); input.blur(); res(input.value.trim()); };
    none.onclick = (e) => { e.stopPropagation(); res(''); };
  });
  S.odev = text;
  save();
  broadcast();
  show(text);
}

function boardHeader(p) {
  const row = el('div', 'tahta-ust');
  row.innerHTML = '<div>Nöbetçi: Zeynep<br>Mevcut: 2 &nbsp;Yok: 0</div>';
  p.body.append(row);
  p.printDate();
  row.append(p.body.lastElementChild);
}

// Kara tahta: teneffüste sınıfa dönünce tahtada kalan oyun.
PAGES.teneffus = {
  build(p) {
    p.leaf.classList.add('tahta-sayfa');
    p.leaf.insertAdjacentHTML('beforeend', '<div class="tahta-raf"><i class="tebesir"></i><i class="tebesir kisa"></i><i class="tahta-silgi"></i></div>');
  },
  async run(p) {
    boardHeader(p);
    if (S.oyun && S.oyun.bitti) return finishWordGame(p);
    await p.wait(300);
    await p.write('zil çaldı. teneffüs.', { pause: 60 });
    await p.doodle('zil', { cls: 'sag zil-karalama', scale: 0.56, pen: false, width: 2.4 });
    await p.wait(300);
    await p.write('oyun basit. 3-2-1 deyince ikiniz aynı anda bir kelime söylüyorsunuz. herhangi bir kelime.');
    await p.write('aynı çıkmazsa, sonraki turda o iki kelimenin ortasını bulmaya çalışıyorsunuz.');
    await p.write('biriniz "deniz", öbürünüz "uçak" dedi diyelim. ortası ne? tatil mi, martı mı? kafanıza göre.');
    await p.write('aynı kelimeyi söyleyene kadar bitmiyor. sayımı sen yap.');
    await p.choose(["enes'e anlattım, başla"]);
    p.clear();
    boardHeader(p);

    const stage = el('div', 'oyun');
    const tally = Pen.svg(300, 46, 'cetele');
    const big = el('div', 'sayac');
    const zone = el('div', 'oyun-alan');
    stage.append(tally, big, zone);
    p.body.append(stage);

    const addTally = (n) => {
      const group = Math.floor((n - 1) / 5);
      const slot = (n - 1) % 5;
      const x0 = 6 + group * 62;
      if (slot === 4) Pen.stroke(tally, `M${x0 - 4} 34L${x0 + 40} 8`, { width: 2.4, dur: 160, step: 6, amp: 0.6 });
      else Pen.stroke(tally, `M${x0 + slot * 11} 6L${x0 + slot * 11 + 1} 38`, { width: 2.4, dur: 120, step: 6, amp: 0.6 });
    };

    let round = 0;
    while (true) {
      round++;
      S.oyun = { tur: round, sayiyor: true };
      broadcast();
      zone.innerHTML = '';
      for (const n of ['3', '2', '1', 'söyleyin!']) {
        big.textContent = n;
        big.classList.remove('dus');
        void big.offsetWidth;
        big.classList.add('dus');
        buzz(8);
        await sleep(FAST ? 10 : n === 'söyleyin!' ? 1100 : 850);
      }
      S.oyun.sayiyor = false;
      broadcast();
      const options = ['aynı kelimeyi söyledik', 'olmadı'];
      if (round >= 4) options.push('zil çaldı, geçelim');
      const a = await p.choose(options, { into: zone });
      if (a === 0) {
        big.textContent = '';
        zone.innerHTML = '';
        await p.write('kelime neydi?', { into: zone });
        const word = await p.ask('buraya yaz');
        S.oyun = { tur: round, kelime: word || null, bitti: true };
        break;
      }
      if (a === 2) {
        S.oyun = { tur: round, kelime: null, pes: true, bitti: true };
        break;
      }
      addTally(round);
      zone.innerHTML = '';
      big.textContent = '';
      await p.write('olmadı. ikisinin ortası ne? düşünün.', { into: zone, pause: 120 });
      await p.choose(['tekrar say'], { into: zone });
    }
    save();
    broadcast();
    p.clear();
    boardHeader(p);
    await finishWordGame(p);
  },
};

async function finishWordGame(p) {
  const { tur, kelime, pes } = S.oyun;
  if (pes) {
    await p.write(`${tur} tur, zil çaldı. kelime bulunamadı.`);
    await p.write('karneye yazıyorum. kimse sıkılmadıysa sorun yok.');
  } else {
    await p.write(`${tur}. turda buldunuz.`);
    if (kelime) await p.write(`==${kelime}==`, { cls: 'kelime-buyuk' });
    if (tur === 1) await p.write('ilk turda mı? kopya çekmişsiniz.');
    else if (tur <= 3) await p.write('fena değil. birbirinizi tanıyorsunuz demek.');
    else if (tur <= 6) await p.write('uzun sürdü ama buldunuz.');
    else await p.write('bu kadar uğraşmak da bir şey zaten.');
    await p.wait(300);
    await p.write('silmiyorum. kenarda kalsın.');
  }
  p.done('sınıfa dön');
}

/* ---------- Portre dersi ---------- */
const PORTRE_SURE = 60;

function polaroids(z, e) {
  const row = el('div', 'polaroidler');
  const card = (strokes, title, cls) => {
    const c = el('div', `polaroid ${cls}`);
    c.innerHTML = '<div class="polaroid-yuz"><canvas></canvas></div><div class="polaroid-yazi"></div>';
    c.querySelector('.polaroid-yazi').textContent = title;
    row.append(c);
    return { c, strokes };
  };
  const items = [
    card(e, 'Zeynep. Çizen: Enes.', 'sol'),
    card(z, 'Enes. Çizen: Zeynep.', 'sag'),
  ];
  return {
    row,
    paint() {
      items.forEach(({ c, strokes }) => {
        const box = c.querySelector('.polaroid-yuz');
        const cv = c.querySelector('canvas');
        Sketches.portrait(cv, strokes, box.clientWidth, box.clientHeight, 1.5);
        if (!strokes || !strokes.length) box.classList.add('bos');
      });
    },
    cards: items.map((i) => i.c),
  };
}

PAGES.portre = {
  async run(p) {
    p.printDate();
    if (S.portre && S.portre.bitti) return portraitResult(p, false);
    await p.wait(250);
    await p.write('resim dersi.');
    await p.wait(300);
    await p.write('birbirinizi çizeceksiniz. sen onu, o seni. bir dakikanız var.');
    await p.write('birbirinizinkini görmek yok. süre bitince ikisi aynı anda açılır.');
    if (!Book.live.peerOnline) {
      await p.write("enes'in kalemi burada değil gibi. sen yine de çiz, o da kağıda çizip kameraya göstersin.", { cls: 'kucuk' });
    }
    const a = await p.choose(['hazırız', 'bu ders asıldı']);
    if (a === 1) {
      S.portre = { bitti: true, asildi: true };
      save();
      broadcast();
      await p.write('devamsızlığına işledim. bir gün.');
      p.done();
      return;
    }
    await drawPortrait(p);
    await portraitResult(p, true);
  },
};

async function drawPortrait(p) {
  p.clear();
  p.body.classList.add('sabit');
  const head = el('div', 'pasta-ust portre-ust');
  const title = el('div', 'portre-baslik');
  const clock = el('div', 'portre-sure');
  head.append(title, clock);
  const wrap = el('div', 'tuval');
  const tools = el('div', 'araclar');
  p.body.append(head, wrap, tools);

  const board = new Board(wrap, { me: 'z', W: 1000, H: 1200 });
  board.active = false;
  Crayons.build(board, tools, Board.INK.z);
  const fin = el('button', 'kucuk-dugme ana', 'bitti');
  tools.append(fin);

  S.portre = { z: null, e: null, ciziyor: true };
  broadcast();
  for (let i = 0; i < 3; i++) setTimeout(() => Book.live.send({ t: 'portre-basla' }), i * 700);
  for (const n of ['3', '2', '1']) {
    clock.textContent = n;
    buzz(6);
    await sleep(FAST ? 10 : 800);
  }
  title.textContent = "enes'i çiz.";
  board.active = true;
  await new Promise((res) => {
    let left = FAST ? 1 : PORTRE_SURE;
    clock.textContent = left;
    const timer = setInterval(() => {
      left -= 1;
      clock.textContent = left;
      clock.classList.toggle('az', left <= 10);
      if (left <= 10) buzz(4);
      if (left <= 0) stop();
    }, 1000);
    function stop() {
      clearInterval(timer);
      Book.onPortreEnd = null;
      res();
    }
    Book.onPortreEnd = stop;
    fin.onclick = (e) => { e.stopPropagation(); stop(); };
  });
  board.active = false;
  clock.textContent = '0';
  title.textContent = 'kalemler bırakılsın.';
  tools.innerHTML = '';
  Book.live.send({ t: 'portre-son' });

  S.portre.z = board.export();
  S.portre.ciziyor = false;
  save();
  sendStrokes(Book.live, 'portre', S.portre.z);
  if (Book.live.peerOnline && !S.portre.e && !FAST) {
    await new Promise((res) => {
      Book.onPortreGeldi = res;
      setTimeout(res, 7000);
    });
    Book.onPortreGeldi = null;
  }
  S.portre.bitti = true;
  save();
  broadcast();
  p.body.classList.remove('sabit');
  p.clear();
  p.printDate();
}

async function portraitResult(p, animate) {
  const { z, e, asildi } = S.portre;
  if (asildi) {
    await p.write('bu ders asıldı.');
    p.done();
    return;
  }
  const pol = polaroids(z, e);
  if (animate && !FAST) pol.cards.forEach((c) => c.classList.add('ters'));
  p.body.append(pol.row);
  pol.paint();
  if (animate && !FAST) {
    for (const n of ['üç.', 'iki.', 'bir.']) {
      await p.write(n, { cls: 'kucuk sayim', pause: 420, speed: 0.6 });
    }
    pol.cards.forEach((c, i) => setTimeout(() => { c.classList.remove('ters'); buzz(14); }, i * 320));
    await p.wait(1300);
  }
  await p.write('sınıf fotoğrafı.', { pause: 300 });
  await p.write(e && e.length ? 'okul yönetimi sorumluluk kabul etmez.' : "enes'inki gelmedi. ödevini getirmemiş.", { cls: 'kucuk', pause: 200 });
  p.done();
}

PAGES.pasta = {
  async run(p) {
    p.body.classList.add('sabit');
    S.pasta = S.pasta || { strokes: [], candle: null };
    const head = el('div', 'pasta-ust');
    const wrap = el('div', 'tuval');
    const tools = el('div', 'araclar');
    p.body.append(head, wrap, tools);

    let sawRemote = false;
    const tag = el('div', 'tuval-etiket');
    wrap.append(tag);
    const board = new Board(wrap, {
      me: 'z',
      strokes: S.pasta.strokes,
      send: (m) => Book.live.send(m),
      onChange: (all) => { S.pasta.strokes = all; save(); },
      onRemote: () => {
        if (sawRemote) return;
        sawRemote = true;
        tag.textContent = 'enes de çiziyor';
        tag.classList.add('v');
      },
    });
    Book.board = board;

    Crayons.build(board, tools, Board.INK.z);
    const fin = el('button', 'kucuk-dugme ana', 'bitti');
    tools.append(fin);

    const finished = new Promise((res) => { fin.onclick = (e) => { e.stopPropagation(); res(); }; });
    await p.write('pasta ~~var~~ yok. barışın, çizin.', { into: head, pause: 80 });
    await p.write(
      Book.live.peerOnline ? 'enes de bu sayfada. mavi kalem onun.' : 'enes tarif etsin, sen çiz.',
      { into: head, cls: 'kucuk', pause: 0 },
    );
    await finished;
    board.active = false;
    tools.innerHTML = '';
    head.innerHTML = '';

    if (!board.export().length) {
      const art = CakeArt.fallback();
      art.forEach((st) => { board.adopt(st); board.send({ t: 'de', st }); });
      S.pasta.strokes = board.export();
      save();
      await p.write('peki. ben çizdim. kötü oldu, biliyorum.', { into: head, cls: 'kucuk', pause: 500 });
      head.innerHTML = '';
    }

    await p.write(`${ICERIK.yas} mum sığmadı. bir tane dik, sürükle.`, { into: head, pause: 0 });
    await placeCandle(p, board, wrap, tools);
    Book.board = null;
    S.pasta.strokes = board.export();
    save();
    broadcast();
    p.done();
  },
};

function placeCandle(p, board, wrap, tools) {
  return new Promise((res) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity;
    board.export().forEach((st) => {
      if (st.k === 'f') return;
      for (let i = 0; i < st.pts.length; i += 2) {
        minX = Math.min(minX, st.pts[i]);
        maxX = Math.max(maxX, st.pts[i]);
        minY = Math.min(minY, st.pts[i + 1]);
      }
    });
    const auto = isFinite(minX)
      ? { x: Math.round((minX + maxX) / 2), y: Math.round(clamp(minY + 20, 260, Board.H)) }
      : { x: 500, y: 830 };

    const CH = 200;
    const px = CH * board.s;
    const box = el('div', 'surukle-mum');
    const w = 70, h = px + 30;
    box.style.width = `${w}px`;
    box.style.height = `${h}px`;
    const cv = el('canvas');
    const dpr = Math.min(devicePixelRatio || 1, 2.5);
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;
    const x = cv.getContext('2d');
    x.scale(dpr, dpr);
    CakeArt.draw(x, CakeArt.candle(0, CH, CH), { s: board.s, ox: w / 2, oy: 26, color: Board.INK.z, width: 2 });
    const bob = el('div', 'surukle-ipucu', '');
    box.append(cv, bob);
    wrap.append(box);

    const r = wrap.getBoundingClientRect();
    const toLeft = (sx) => sx - w / 2;
    const toTop = (sy) => sy - h;
    let bx = r.width / 2, by = r.height - 8;
    const place = () => {
      box.style.transform = `translate(${toLeft(bx)}px, ${toTop(by)}px)`;
    };
    place();

    let moved = false, pid = null, sx = 0, sy = 0, ox = 0, oy = 0;
    box.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      pid = e.pointerId;
      try { box.setPointerCapture(pid); } catch (err) {}
      sx = e.clientX;
      sy = e.clientY;
      ox = bx;
      oy = by;
      box.classList.add('tutuldu');
    });
    box.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      bx = clamp(ox + e.clientX - sx, 10, r.width - 10);
      by = clamp(oy + e.clientY - sy, h * 0.5, r.height - 4);
      moved = true;
      place();
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      box.classList.remove('tutuldu');
      S.pasta.candle = {
        x: Math.round((bx - board.ox) / board.s),
        y: Math.round((by - board.oy) / board.s),
      };
      save();
      broadcast();
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);

    const ok = el('button', 'kucuk-dugme ana', 'tamam');
    ok.onclick = (e) => {
      e.stopPropagation();
      if (!moved) {
        S.pasta.candle = auto;
        const [ax, ay] = board.toScreen(auto.x, auto.y);
        box.style.transition = 'transform .5s ease-out';
        bx = ax;
        by = ay;
        place();
      }
      save();
      tools.innerHTML = '';
      setTimeout(res, moved ? 0 : 520);
    };
    tools.append(ok);
  });
}

PAGES.mum = {
  async run(p) {
    p.printDate();
    S.pasta = S.pasta || { strokes: [], candle: null };
    if (S.mum === 'sondu') {
      Book.next();
      return;
    }

    await p.wait(300);
    await p.write('son bir şey.');
    await p.wait(300);
    await p.write('odanın ışığını kapatman lazım.');
    await p.write('evet, gerçekten. kalk, kapat. bekliyorum.');
    await p.doodle('anahtar', { cls: 'orta', scale: 0.8, width: 2.2 });
    await p.wait(300);
    await p.write(S.kas === 'gormuyor' ? 'ekran parlaklığını da aç. daha güzel olacak.' : 'ekran parlaklığını da sonuna kadar aç. sebebini birazdan anlarsın.');
    S.mum = 'hazirlik';
    broadcast();
    const a = await p.choose(['kapattım', 'burada kapatamam, böyle devam']);
    S.isik = a === 0;
    save();

    let lit, out;
    const litP = new Promise((r) => { lit = r; });
    const outP = new Promise((r) => { out = r; });
    const scene = new CandleScene(p.leaf, {
      strokes: S.pasta.strokes,
      candle: S.pasta.candle,
      touch: true,
      onOut: () => out(),
      onWick: () => lit(),
    });
    Book.scene = scene;
    Book.onLight = () => lit();
    Book.onBlow = () => scene.blow();
    setTheme('#000000');
    S.mum = 'karanlik';
    broadcast();
    await sleep(FAST ? 50 : 1900);

    const peer = Book.live.peerOnline;
    if (scene.phase === 'dark') scene.say(peer ? 'mumu enes yakacak.' : "enes'e sor, çakmağı var mı.");
    const noLighter = setTimeout(() => {
      if (scene.phase === 'dark') scene.say('yok galiba.<br>mumun ucuna dokun, sen yak.');
    }, peer ? 16000 : 5500);

    await litP;
    clearTimeout(noLighter);
    scene.say('');
    scene.light();
    buzz(14);
    S.mum = 'yandi';
    save();
    broadcast();

    const say = (text) => { if (scene.phase === 'lit') scene.say(text); };
    const timers = [
      setTimeout(() => say("enes'e bak."), 5500),
      setTimeout(() => say('sıra onda.'), 9000),
      setTimeout(() => say(''), 13000),
    ];
    if (Book.live.peerOnline) {
      timers.push(setTimeout(() => say('hazır olunca dilek tut, üfle.'), 80000));
      timers.push(setTimeout(() => say('sönmezse parmağını alevin üstüne koy.'), 96000));
    } else {
      timers.push(setTimeout(() => say('şarkı bitince dilek tut, üfle.<br>sonra parmağını alevin üstüne koy.'), 50000));
    }

    await outP;
    timers.forEach(clearTimeout);
    scene.say('');
    const now = new Date();
    S.mumSaat = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    S.mum = 'sondu';
    save();
    broadcast();

    await sleep(FAST ? 50 : 5400);
    scene.say('dilek tuttun mu?', 'soluk');
    await sleep(FAST ? 50 : 2800);
    scene.say('söyleme.', 'soluk');
    await sleep(FAST ? 50 : 3200);
    scene.say('');
    await sleep(FAST ? 50 : 1000);
    await new Promise((res) => {
      scene.say(`${S.isik ? 'ışığı açabilirsin.<br>' : ''}<button class="mum-dugme">${S.isik ? 'açtım' : 'devam'}</button>`, 'soluk');
      scene.text.querySelector('button').onclick = (e) => { e.stopPropagation(); res(); };
    });
    p.clear();
    setTheme(PAPER);
    Book.scene = null;
    Book.onLight = Book.onBlow = null;
    await scene.close(FAST ? 50 : 1500);
    Notes.next();
    Book.next();
  },
};

/* ---------- Kazı kazan: ilk bilet sınavdan hemen sonra, kalanı en sonda sırada ---------- */
function prepareTickets() {
  if (S.kazi) return;
  const all = ICERIK.kuponlar;
  const total = clamp(wrongCount() + 2, 2, all.length);
  const rest = all.slice(0, -1).map((_, i) => i).sort(() => Math.random() - 0.5);
  S.kazi = { order: [...rest.slice(0, total - 1), all.length - 1], won: [] };
  save();
}

PAGES.kazi = {
  async run(p) {
    p.printDate();
    prepareTickets();
    const total = S.kazi.order.length;
    const w = wrongCount();
    await p.wait(250);
    await p.write(w ? `her çarpı bir bilet. ${total - w > 0 ? `${total - w} tane de benden. ` : ''}toplam ${total}.` : `çarpı yok ama doğum günü. ${total} bilet benden.`, { pause: 160 });
    await p.write('biri şimdi. gerisi sonra, sıranın üstünde duracak.', { pause: 160 });
    if (!S.kazi.won.length) {
      const hall = el('div', 'bilet-alani');
      p.body.append(hall);
      const flakes = el('canvas', 'talas');
      p.leaf.append(flakes);
      await scratchTicket(p, hall, S.kazi.order[0], flakes, 1, total, null);
    } else {
      const li = el('div', 'kazinan-not');
      li.textContent = ICERIK.kuponlar[S.kazi.won[0]];
      p.body.append(li);
    }
    p.done();
  },
};

// Bilet kazınınca çözülür. Düğme yazısı verilirse kullanıcı basınca bilet gider, verilmezse olduğu yerde kalır.
function scratchTicket(p, hall, index, flakes, no, total, nextLabel) {
  return new Promise((res) => {
    const prize = ICERIK.kuponlar[index];
    const t = el('div', 'bilet');
    const serial = String(100000 + ((index + 3) * 48271) % 899999);
    t.innerHTML = `
      <div class="bilet-ust"><span>Enes Piyango İdaresi</span><span>No ${serial}</span></div>
      <div class="bilet-ad">Kazı Kazan</div>
      <div class="bilet-alan"><div class="bilet-odul"></div><canvas></canvas></div>
      <div class="bilet-alt">Bu bilet yalnızca Zeynep'te geçerlidir. Çekiliş yok, zaten kazandın.</div>
      <div class="bilet-sira">${no} / ${total}</div>`;
    t.querySelector('.bilet-odul').textContent = prize;
    hall.append(t);
    p.reveal(t);
    requestAnimationFrame(() => t.classList.add('v'));
    new Scratch(t.querySelector('canvas'), flakes, p.leaf, async () => {
      S.kazi.won.push(index);
      save();
      broadcast();
      buzz(30);
      if (!nextLabel) return res();
      const b = el('button', 'kucuk-dugme ana bilet-sonraki', nextLabel);
      hall.append(b);
      p.reveal(b);
      b.onclick = async (e) => {
        e.stopPropagation();
        b.remove();
        t.classList.add('gitti');
        await sleep(FAST ? 0 : 420);
        t.remove();
        res();
      };
    });
  });
}

class Scratch {
  constructor(cv, flakes, leaf, onDone) {
    this.cv = cv;
    this.onDone = onDone;
    this.leaf = leaf;
    this.w = cv.parentElement.clientWidth;
    this.h = cv.parentElement.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = this.w * dpr;
    cv.height = this.h * dpr;
    this.x = cv.getContext('2d');
    this.x.scale(dpr, dpr);
    this.paintFoil();
    this.x.globalCompositeOperation = 'destination-out';
    this.x.lineCap = 'round';
    this.x.lineJoin = 'round';
    this.x.lineWidth = 34;
    this.cols = 24;
    this.rows = 10;
    this.cells = new Set();
    this.finished = false;
    this.flakes = flakes;
    this.bits = [];
    const lr = leaf.getBoundingClientRect();
    flakes.width = lr.width;
    flakes.height = lr.height;
    this.fx = flakes.getContext('2d');
    this.spin = this.spin.bind(this);
    this.bind();
  }

  paintFoil() {
    const { x, w, h } = this;
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#b9bcc3');
    g.addColorStop(0.3, '#e4e6ea');
    g.addColorStop(0.55, '#a9adb5');
    g.addColorStop(0.8, '#dcdee3');
    g.addColorStop(1, '#b2b5bc');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h * 0.03; i++) {
      x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '60,60,70'},${rand(0.03, 0.14)})`;
      x.fillRect(rand(0, w), rand(0, h), 1, 1);
    }
    x.save();
    x.fillStyle = 'rgba(70,74,84,.34)';
    x.font = '700 13px sans-serif';
    x.textAlign = 'center';
    x.translate(w / 2, h / 2);
    x.rotate(-0.12);
    for (let yy = -h; yy < h; yy += 25) {
      for (let xx = -w; xx < w; xx += 58) {
        x.fillText('KAZI', xx + (Math.round(yy / 25) % 2 ? 28 : 0), yy);
      }
    }
    x.restore();
  }

  bind() {
    const { cv } = this;
    let pid = null, lx = 0, ly = 0;
    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return [((e.clientX - r.left) * this.w) / r.width, ((e.clientY - r.top) * this.h) / r.height];
    };
    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      pid = e.pointerId;
      try { cv.setPointerCapture(pid); } catch (err) {}
      [lx, ly] = pos(e);
      this.cut(lx, ly, lx + 0.1, ly + 0.1, e);
    });
    cv.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      const [nx, ny] = pos(e);
      this.cut(lx, ly, nx, ny, e);
      lx = nx;
      ly = ny;
    });
    const up = (e) => { if (e.pointerId === pid) pid = null; };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  }

  cut(x0, y0, x1, y1, e) {
    if (this.finished) return;
    const { x } = this;
    x.beginPath();
    x.moveTo(x0, y0);
    x.lineTo(x1, y1);
    x.stroke();
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 0; i <= steps; i++) {
      const px = x0 + ((x1 - x0) * i) / steps, py = y0 + ((y1 - y0) * i) / steps;
      for (let a = -1; a <= 1; a++) {
        for (let b = -1; b <= 1; b++) {
          const cx = Math.floor((px / this.w) * this.cols) + a;
          const cy = Math.floor((py / this.h) * this.rows) + b;
          if (cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows) this.cells.add(cx + cy * 100);
        }
      }
    }
    if (dist > 3) {
      if (Math.random() < 0.3) buzz(4);
      const lr = this.leaf.getBoundingClientRect();
      for (let i = 0, n = Math.min(5, Math.ceil(dist / 7)); i < n; i++) {
        this.bits.push({
          x: e.clientX - lr.left + rand(-14, 14),
          y: e.clientY - lr.top + rand(-14, 14),
          vx: rand(-0.9, 0.9),
          vy: rand(-1.6, 0.4),
          s: rand(1.2, 3.4),
          r: rand(0, 3),
          c: Math.random() < 0.5 ? '#aeb1b8' : '#d7d9de',
        });
      }
      if (!this.spinning) {
        this.spinning = true;
        requestAnimationFrame(this.spin);
      }
    }
    if (this.cells.size / (this.cols * this.rows) > 0.56) this.finish();
  }

  spin() {
    const { fx, flakes } = this;
    fx.clearRect(0, 0, flakes.width, flakes.height);
    this.bits = this.bits.filter((b) => b.y < flakes.height + 10);
    for (const b of this.bits) {
      b.vy += 0.16;
      b.x += b.vx;
      b.y += b.vy;
      b.r += 0.15;
      fx.save();
      fx.translate(b.x, b.y);
      fx.rotate(b.r);
      fx.fillStyle = b.c;
      fx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 0.7);
      fx.restore();
    }
    if (this.bits.length) requestAnimationFrame(this.spin);
    else {
      this.spinning = false;
      fx.clearRect(0, 0, flakes.width, flakes.height);
    }
  }

  finish() {
    this.finished = true;
    this.cv.style.pointerEvents = 'none';
    this.cv.classList.add('gitti');
    this.cv.parentElement.classList.add('acildi');
    setTimeout(() => this.onDone(), FAST ? 0 : 450);
  }
}

PAGES.karne = {
  async run(p) {
    p.printDate();
    p.instant = !!S.bitti;
    const score = examScore();
    const o = S.oyun;
    const kelime = !o ? '-' : o.pes ? `${o.tur} tur, zil çaldı` : o.kelime ? `${o.tur}. turda "${o.kelime}"` : `${o.tur}. turda`;
    const kas = S.kas === 'demedi' ? '5 (o fark etmedi)' : S.kas === 'gormuyor' ? '5 (görüntü dondu)' : '5';
    const absent = S.portre && S.portre.asildi ? '1 gün (resim dersi)' : '0 gün';
    const card = el('div', 'karne');
    card.innerHTML = `
      <div class="karne-kat"></div>
      <div class="karne-baslik">Karne</div>
      <div class="karne-alt">Öğrenci: <b>Zeynep</b> &nbsp; Sınıfı: <b>${ICERIK.yas}-A</b> &nbsp; No: <b>1</b></div>
      <table>
        <tr><td>Kaş Kaldırma</td><td data-v></td></tr>
        <tr><td>Öğretmenlik</td><td data-v></td></tr>
        <tr><td>Kelime Bulma</td><td data-v></td></tr>
        <tr><td>Resim</td><td class="karne-resim"><canvas></canvas></td></tr>
        <tr><td>Mum Söndürme</td><td data-v></td></tr>
        <tr><td>Davranış</td><td data-v></td></tr>
        <tr><td>Devamsızlık</td><td data-v></td></tr>
      </table>
      <div class="karne-enes">
        <div>Sıra arkadaşı Enes: <b>${score === null ? '-' : score}</b>${score === null ? '' : ` <i>"${gradeComment(score)}"</i>`}</div>
        <div class="karne-odev"></div>
        <div>Borcu: <i>${ICERIK.yas - 1} mum</i></div>
      </div>
      <div class="karne-gorus">
        <div class="gorus-etiket">Sıra arkadaşının görüşü</div>
        <div class="gorus-yazi"></div>
      </div>
      <div class="karne-sonuc">
        <div>
          <div class="karne-karar">Bir üst yaşa geçmiştir.</div>
          <div class="karne-takdir">Takdir belgesi almaya hak kazanmıştır.<br>(Enes'e katlandığı için.)</div>
        </div>
        <div class="damga">Geçti</div>
      </div>
      <div class="karne-imza"><span>Sınavı değerlendiren:</span><canvas></canvas></div>`;
    card.querySelector('.karne-odev').hidden = !S.odev;
    if (S.odev) {
      const lab = el('span');
      lab.textContent = 'Ödevi: ';
      const t = el('i');
      t.textContent = S.odev;
      card.querySelector('.karne-odev').append(lab, t);
    }
    p.body.append(card);
    requestAnimationFrame(() => card.classList.add('v'));
    Sketches.cake(card.querySelector('.karne-resim canvas'), 118, 66, 1.1);
    const sign = card.querySelector('.karne-imza');
    if (S.imza && S.imza.length) CakeArt.signature(sign.querySelector('canvas'), S.imza, 120, 44);
    else sign.hidden = true;

    const values = [kas, score === null ? '-' : `Enes'e ${score} verdi`, kelime, S.mumSaat ? `saat ${S.mumSaat}` : '5', 'Pekiyi', absent];
    const cells = card.querySelectorAll('[data-v]');
    await p.wait(450);
    for (let i = 0; i < cells.length; i++) {
      await p.write(values[i], { into: cells[i], tag: 'span', cls: 'karne-el', pause: 70, speed: 1.3 });
    }
    await p.wait(300);
    Book.karne = { page: p, box: card.querySelector('.gorus-yazi') };
    showOpinion();
    await p.wait(300);
    card.querySelector('.karne-karar').classList.add('v');
    await p.wait(500);
    card.querySelector('.karne-takdir').classList.add('v');
    await p.wait(600);
    const stamp = card.querySelector('.damga');
    stamp.classList.add('v');
    buzz(40);
    if (!p.instant) setTimeout(() => punchBurst(p.leaf, stamp), 170);
    await p.wait(500);
    p.done();
  },
};

// Enes kopya kağıdından görüş yazınca karneye onun eliyle düşer.
function showOpinion(fresh = false) {
  const k = Book.karne;
  if (!k || !k.box.isConnected) return false;
  k.box.innerHTML = '';
  if (S.gorus) {
    k.page.write(S.gorus, { into: k.box, cls: 'enes-el gorus', pause: 0, speed: fresh ? 0.7 : 3, pen: fresh });
  } else {
    const t = el('span', 'gorus-bos');
    t.textContent = Book.live.peerOnline ? 'enes yazıyor...' : 'yazacaktı, unuttu.';
    k.box.append(t);
  }
  return true;
}

PAGES.son = {
  async run(p) {
    p.printDate();
    p.instant = !!S.sonGoruldu;
    await p.wait(500);
    await p.write('hani güzel bir şey yazamamıştım ya.', { pause: 1000 });
    await p.write('o yazmış.', { pause: 1200 });
    for (const line of ICERIK.enesNotu) await p.write(line, { cls: 'enes-el', pause: 420, speed: 0.85, pen: true });
    await p.write('Enes', { cls: 'enes-el imza', pause: 500, speed: 0.6, pen: true });
    S.sonGoruldu = true;
    save();
    p.instant = false;
    replyArea(p);
    p.done();
  },
};

/* ---------- Kağıt uçak: notun altına Zeynep'in cevabı. Yazmak zorunlu değil. ---------- */
function replyArea(p) {
  const box = el('div', 'cevap');
  box.innerHTML = '<div class="cevap-etiket">cevap:</div><div class="cevap-kagit"></div><div class="cevap-alt"></div>';
  p.body.append(box);
  const paper = box.querySelector('.cevap-kagit');
  const foot = box.querySelector('.cevap-alt');
  const status = (text) => {
    foot.innerHTML = '';
    const s = el('div', 'cevap-durum');
    s.textContent = text;
    foot.append(s);
  };
  if (S.cevap) {
    const cv = el('canvas');
    paper.append(cv);
    const w = paper.clientWidth, h = paper.clientHeight;
    const x = Sketches.fit(cv, w, h);
    const s = Math.min(w / 1000, h / 420);
    CakeArt.draw(x, S.cevap, { s, ox: (w - 1000 * s) / 2, oy: (h - 420 * s) / 2, width: 1.7 });
    status(S.cevapOk ? 'ulaştı.' : "enes'in hattı kapalı. açılınca kendi gider.");
    return;
  }
  const area = el('div', 'tuval cevap-ped');
  paper.append(area);
  const make = el('button', 'kucuk-dugme');
  make.textContent = 'kağıt uçak yap';
  make.hidden = true;
  foot.append(make);
  const board = new Board(area, {
    me: 'z',
    W: 1000,
    H: 420,
    onChange: (all) => {
      make.hidden = !all.length;
      if (all.length) p.reveal(make);
    },
  });
  make.onclick = async (e) => {
    e.stopPropagation();
    board.active = false;
    make.hidden = true;
    const strokes = board.export();
    const thrown = await foldAndThrow(paper, foot);
    if (!thrown) return;
    S.cevap = strokes;
    save();
    status('uçuyor...');
    const reached = await deliverPlane(strokes);
    S.cevapOk = reached;
    save();
    status(reached ? 'ulaştı.' : "enes'in hattı kapalı. açılınca kendi gider.");
  };
}

// Kağıt uçağa dönüşür, parmakla yukarı fırlatılır.
function foldAndThrow(paper, foot) {
  return new Promise((res) => {
    const root = Book.root;
    const rr = root.getBoundingClientRect();
    const pr = paper.getBoundingClientRect();
    const plane = el('div', 'ucak', UCAK_SVG);
    const startX = pr.left - rr.left + pr.width / 2 - 60;
    const startY = clamp(pr.top - rr.top + pr.height / 2 - 48, 60, rr.height - 180);
    let px = startX, py = startY;
    const put = (extra = '') => { plane.style.transform = `translate(${px}px,${py}px) ${extra}`; };
    put('scale(.2) rotate(-14deg)');
    plane.style.opacity = 0;
    root.append(plane);
    paper.classList.add('katlaniyor');
    buzz(10);
    plane.getBoundingClientRect();
    plane.classList.add('katlandi');
    put('scale(1) rotate(0deg)');
    plane.style.opacity = 1;
    foot.innerHTML = '';
    const hint = el('div', 'cevap-durum');
    hint.textContent = 'yukarı fırlat.';
    foot.append(hint);

    let pid = null, sx = 0, sy = 0, ox = 0, oy = 0, lastY = 0, lastT = 0, vy = 0;
    const fly = () => {
      plane.classList.remove('katlandi', 'tutuldu');
      plane.classList.add('uctu');
      buzz(20);
      const tx = rr.width * rand(0.62, 0.9);
      const dur = FAST ? 10 : 1050;
      plane.animate([
        { transform: `translate(${px}px,${py}px) rotate(0deg) scale(1)` },
        { transform: `translate(${(px + tx) / 2}px,${py * 0.55 - 20}px) rotate(-16deg) scale(.86)`, offset: 0.45 },
        { transform: `translate(${tx}px,-170px) rotate(10deg) scale(.42)` },
      ], { duration: dur, easing: 'cubic-bezier(.35,.1,.6,.9)', fill: 'forwards' });
      setTimeout(() => {
        plane.remove();
        res(true);
      }, dur + 30);
    };
    plane.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      pid = e.pointerId;
      try { plane.setPointerCapture(pid); } catch (err) {}
      sx = e.clientX;
      sy = e.clientY;
      ox = px;
      oy = py;
      lastY = e.clientY;
      lastT = e.timeStamp;
      plane.classList.remove('katlandi');
      plane.classList.add('tutuldu');
    });
    plane.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      px = ox + e.clientX - sx;
      py = oy + e.clientY - sy;
      vy = (e.clientY - lastY) / Math.max(1, e.timeStamp - lastT);
      lastY = e.clientY;
      lastT = e.timeStamp;
      put('rotate(-6deg)');
    });
    const up = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      plane.classList.remove('tutuldu');
      if (py < oy - 26 || vy < -0.25 || Math.hypot(e.clientX - sx, e.clientY - sy) < 8) {
        fly();
      } else {
        px = ox;
        py = oy;
        plane.classList.add('katlandi');
        put('scale(1) rotate(0deg)');
      }
    };
    plane.addEventListener('pointerup', up);
    plane.addEventListener('pointercancel', up);
  });
}

// Uçak ancak Enes'in ekranına düşünce ulaşmış sayılır.
function deliverPlane(strokes) {
  return new Promise((res) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      Book.onPlaneAck = null;
      res(ok);
    };
    Book.onPlaneAck = () => finish(true);
    sendStrokes(Book.live, 'ucak', strokes);
    setTimeout(() => finish(false), FAST ? 50 : 6500);
  });
}

PAGES.arka = {
  build(p) {
    p.leaf.classList.add('kapak', 'arka-kapak');
    p.leaf.insertAdjacentHTML('afterbegin', '<div class="kapak-sirt"></div><div class="kapak-parlak"></div>');
    p.body.classList.add('arka-icerik');
  },
  async run(p) {
    const y = ICERIK.yas;
    const sheet = el('div', 'carpim-tablosu');
    sheet.innerHTML = '<div class="carpim-baslik">Çarpım Tablosu</div>';
    p.body.append(sheet);
    p.instant = !!S.arkaGoruldu;
    await p.wait(450);
    for (let i = 0; i < ICERIK.carpim.length; i++) {
      const row = el('div', 'carpim-satir');
      const k = i + 1;
      row.innerHTML = `<div class="carpim-islem">${y} × ${k} = ${y * k}</div>`;
      const note = el('div', 'carpim-not');
      row.append(note);
      sheet.append(row);
      await p.wait(320);
      await p.write(ICERIK.carpim[i], { into: note, tag: 'span', pause: 650, speed: 0.8, pen: true });
    }
    S.arkaGoruldu = true;
    save();
    p.instant = false;
    p.done('defteri kapat');
  },
};

/* ---------- Sıradan açılan sayfalar ---------- */
PAGES.kuponlar = {
  async run(p) {
    p.printDate();
    prepareTickets();
    const left = () => S.kazi.order.filter((i) => !S.kazi.won.includes(i));
    if (left().length) {
      const hall = el('div', 'bilet-alani');
      p.body.append(hall);
      const flakes = el('canvas', 'talas');
      p.leaf.append(flakes);
      while (left().length) {
        const i = left()[0];
        const more = left().length > 1;
        await scratchTicket(p, hall, i, flakes, S.kazi.won.length + 1, S.kazi.order.length, more ? 'sıradaki bilet' : 'tamam');
      }
      flakes.remove();
      hall.remove();
    }
    await p.write('bozdurmak için bas. enes kaçamaz.', { pause: 100 });
    const list = el('ul', 'kupon-liste bozdurma');
    S.kazi.won.forEach((i) => {
      const text = ICERIK.kuponlar[i];
      const li = el('li');
      const t = el('span');
      t.textContent = text;
      const b = el('button', 'kucuk-dugme');
      const mark = () => {
        li.classList.add('bozuldu');
        b.textContent = 'bozuldu';
        b.disabled = true;
      };
      b.textContent = 'bozdur';
      if (S.bozulan.includes(i)) mark();
      b.onclick = (e) => {
        e.stopPropagation();
        redeemSlip(text, () => {
          S.bozulan.push(i);
          save();
          mark();
        });
      };
      li.append(t, b);
      list.append(li);
    });
    p.body.append(list);
    p.reveal(list);
    p.done();
  },
};

// Kuponu bozdururken kesilen kantin fişi: ne zaman olacağını yazar, Enes'e gönderir.
function redeemSlip(text, onDone) {
  const veil = el('div', 'not-perde fis-perde');
  const fis = el('form', 'fis');
  const no = String(1000 + Math.floor(Math.random() * 8999));
  const today = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  fis.innerHTML = `
    <div class="fis-baslik">Enes Kantini</div>
    <div class="fis-satir"><span>Fiş No</span><span>${no}</span></div>
    <div class="fis-satir"><span>Tarih</span><span>${today}</span></div>
    <div class="fis-cizgi"></div>
    <div class="fis-kupon"></div>
    <div class="fis-cizgi"></div>
    <div class="fis-satir"><span>Tutar</span><span>0,00 TL</span></div>
    <label class="fis-zaman">Ne zaman?<input maxlength="40" autocomplete="off" placeholder="cumartesi, mesela"></label>
    <div class="fis-dugmeler">
      <button type="button" class="kalem-baglanti">vazgeç</button>
      <button class="kucuk-dugme ana">enes'e gönder</button>
    </div>`;
  fis.querySelector('.fis-kupon').textContent = text;
  veil.append(fis);
  Book.root.append(veil);
  requestAnimationFrame(() => veil.classList.add('v'));
  fis.querySelector('.kalem-baglanti').onclick = (e) => { e.stopPropagation(); veil.remove(); };
  fis.onsubmit = async (e) => {
    e.preventDefault();
    const when = fis.querySelector('input').value.trim();
    const msg = `Kupon bozduruyorum: ${text}${when ? `\nNe zaman: ${when}` : ''}\n\nFiş no ${no}. İtiraz hakkın yok.`;
    try {
      if (navigator.share) await navigator.share({ text: msg });
      else window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err) {
      return;
    }
    Book.live.send({ t: 'bozdu', metin: text, zaman: when });
    veil.remove();
    onDone();
  };
}

PAGES.resimler = {
  async run(p) {
    p.printDate();
    const sheet = el('div', 'resim-kagit');
    sheet.innerHTML = '<div class="bant"></div><canvas></canvas>';
    p.body.append(sheet);
    const w = sheet.clientWidth - 16;
    Sketches.cake(sheet.querySelector('canvas'), w, Math.round(w * 0.86), 1.8);
    if (S.portre && !S.portre.asildi && (S.portre.z || S.portre.e)) {
      const pol = polaroids(S.portre.z, S.portre.e);
      p.body.append(pol.row);
      pol.paint();
    }
    p.done();
  },
};

/* ---------- Canlı notlar ve itiraz ---------- */
const Notes = {
  queue: [],
  busy: false,
  push(text) {
    this.queue.push(text);
    this.next();
  },
  next() {
    if (this.busy || Book.scene || !this.queue.length) return;
    this.busy = true;
    const text = this.queue.shift();
    const fold = el('button', 'katli-not');
    fold.innerHTML = '<span>psst</span>';
    Book.root.append(fold);
    buzz(16);
    requestAnimationFrame(() => fold.classList.add('v'));
    fold.onclick = async (e) => {
      e.stopPropagation();
      fold.remove();
      const veil = el('div', 'not-perde');
      const paper = el('div', 'not-kagit');
      veil.append(paper);
      Book.root.append(veil);
      requestAnimationFrame(() => veil.classList.add('v'));
      const writer = new Page('not');
      await writer.write(text, { into: paper, cls: 'enes-el', pause: 0, speed: 0.8, pen: true });
      const close = (ev) => {
        ev.stopPropagation();
        veil.remove();
        this.busy = false;
        this.next();
      };
      veil.onclick = close;
    };
  },
};

function showObjection() {
  if (Book.root.querySelector('.itiraz-perde')) return;
  const veil = el('div', 'itiraz-perde');
  veil.innerHTML = `
    <div class="itiraz-kart">
      <div class="itiraz-damga">İtiraz</div>
      <p>enes itiraz ediyor.</p>
      <div class="itiraz-secim">
        <button class="kucuk-dugme">reddet</button>
        <button class="kucuk-dugme">nazikçe reddet</button>
      </div>
    </div>`;
  Book.root.append(veil);
  requestAnimationFrame(() => veil.classList.add('v'));
  buzz(24);
  veil.querySelectorAll('button').forEach((b, i) => {
    b.onclick = (e) => {
      e.stopPropagation();
      veil.remove();
      Book.live.send({ t: 'itiraz-sonuc', nazik: i === 1 });
    };
  });
}

/* ---------- Defter ---------- */
const Book = {
  root: null,
  current: null,
  flipping: false,
  live: null,
  board: null,
  scene: null,
  onLight: null,
  onBlow: null,

  makePage(id) {
    const p = new Page(id);
    const def = PAGES[id];
    if (!['kapak', 'arka', 'teneffus'].includes(id)) p.drawMargin();
    if (def.build) def.build(p);
    return p;
  },

  themeFor(id) {
    if (id === 'kapak' || id === 'arka') return COVER;
    if (id === 'teneffus') return BOARD;
    return PAPER;
  },

  runPage(p) {
    if (S.bitti && !['kuponlar', 'son', 'arka'].includes(p.id)) p.instant = true;
    PAGES[p.id].run(p).catch((e) => console.error(e));
  },

  show(id) {
    const p = this.makePage(id);
    this.root.append(p.leaf);
    this.current = p;
    setTheme(this.themeFor(id));
    this.runPage(p);
  },

  // Sıradaki defter yakınlaşır, kapak açılır.
  async openNotebook() {
    Scribe.setHome(null);
    Scribe.away();
    const p = this.makePage('kapak');
    p.leaf.classList.add('sakli');
    this.root.append(p.leaf);
    this.current = p;
    await Desk.zoomTo(p.leaf);
    p.leaf.classList.remove('sakli');
    await sleep(FAST ? 0 : 240);
    Desk.clear();
    setTheme(COVER);
    await sleep(FAST ? 0 : 120);
    this.flipTo('psst');
  },

  // Sıradaki bir eşyaya dokununca sayfa o eşyanın yerinden büyüyerek açılır.
  async fromDesk(id, node) {
    if (this.flipping) return;
    this.flipping = true;
    Scribe.setHome(null);
    const r = node.getBoundingClientRect();
    const rr = this.root.getBoundingClientRect();
    const p = this.makePage(id);
    const { leaf } = p;
    leaf.style.transformOrigin = '0 0';
    leaf.style.transform = `translate(${r.left - rr.left}px,${r.top - rr.top}px) scale(${r.width / rr.width},${r.height / rr.height})`;
    leaf.style.opacity = '0.3';
    this.root.append(leaf);
    leaf.getBoundingClientRect();
    leaf.style.transition = 'transform .44s cubic-bezier(.3,.7,.2,1), opacity .22s';
    leaf.style.transform = 'none';
    leaf.style.opacity = '1';
    setTheme(this.themeFor(id));
    await sleep(FAST ? 0 : 450);
    leaf.style.transition = '';
    leaf.style.transform = '';
    leaf.style.transformOrigin = '';
    leaf.style.opacity = '';
    this.current = p;
    this.flipping = false;
    S.page = id;
    save();
    broadcast();
    this.runPage(p);
  },

  // Defter kapanır, o akşamdan kalan her şey sıranın üstüne döner.
  async toDesk() {
    if (this.flipping || !this.current) return;
    this.flipping = true;
    const first = !S.bitti;
    S.bitti = true;
    S.page = 'sira';
    save();
    broadcast();
    Desk.full(first, (id, node) => this.fromDesk(id, node));
    setTheme(WOOD);
    const { leaf } = this.current;
    leaf.classList.add('masaya-don');
    await sleep(FAST ? 0 : first ? 620 : 420);
    leaf.remove();
    this.current = null;
    this.flipping = false;
  },

  nextId() {
    const cur = this.current.id;
    if (cur === 'arka') return 'sira';
    if (S.bitti && cur !== 'son') return 'sira';
    return ORDER[ORDER.indexOf(cur) + 1];
  },

  setAngle(deg) {
    const leaf = this.current.leaf;
    leaf.style.transform = `rotateY(${deg}deg)`;
    const t = Math.min(1, Math.abs(deg) / 90);
    leaf.style.setProperty('--golge', (t * 0.8).toFixed(3));
    if (this.under) this.under.leaf.style.setProperty('--alt-golge', ((1 - t) * 0.55).toFixed(3));
  },

  prepare(id) {
    this.under = this.makePage(id);
    this.root.insertBefore(this.under.leaf, this.current.leaf);
    this.under.leaf.classList.add('altta');
  },

  animate(from, to, dur) {
    return new Promise((res) => {
      if (FAST) { this.setAngle(to); return res(); }
      const t0 = performance.now();
      let finished = false;
      const stop = () => {
        if (finished) return;
        finished = true;
        this.setAngle(to);
        res();
      };
      const tick = (now) => {
        if (finished) return;
        const k = Math.min(1, (now - t0) / dur);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        this.setAngle(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(tick);
        else stop();
      };
      requestAnimationFrame(tick);
      setTimeout(stop, dur + 200);
    });
  },

  commit() {
    const old = this.current;
    const next = this.under;
    next.leaf.classList.remove('altta');
    next.leaf.style.removeProperty('--alt-golge');
    old.leaf.remove();
    this.current = next;
    this.under = null;
    this.angle = 0;
    this.flipping = false;
    S.page = next.id;
    save();
    broadcast();
    this.runPage(next);
  },

  async flipTo(id) {
    if (this.flipping) return;
    this.flipping = true;
    buzz(6);
    Scribe.away();
    this.prepare(id);
    setTheme(this.themeFor(id));
    await this.animate(0, -92, 720);
    this.commit();
  },

  next() {
    const id = this.nextId();
    if (id === 'sira') this.toDesk();
    else if (id) this.flipTo(id);
  },

  beginDrag() {
    if (this.flipping) return false;
    const id = this.nextId();
    if (!id || id === 'sira') return false;
    Scribe.away();
    this.flipping = true;
    this.prepare(id);
    this.angle = 0;
    return true;
  },

  dragTo(k) {
    this.angle = k * 110;
    this.setAngle(Math.max(this.angle, -92));
  },

  async endDrag(fast) {
    const from = Math.max(this.angle, -92);
    if (fast || from < -30) {
      setTheme(this.themeFor(this.under.id));
      await this.animate(from, -92, 340);
      this.commit();
    } else {
      await this.animate(from, 0, 260);
      this.under.leaf.remove();
      this.under = null;
      this.current.leaf.style.transform = '';
      this.current.leaf.style.removeProperty('--golge');
      this.flipping = false;
    }
  },

  handleLive(m) {
    switch (m.t) {
      case 'hello':
        broadcast();
        if (Date.now() - (this.lastDump || 0) > 4000) {
          this.lastDump = Date.now();
          sendBoardDump();
          if (S.imza && S.imza.length) this.live.send({ t: 'imza', st: S.imza });
          if (S.cevap && !S.cevapOk) sendStrokes(this.live, 'ucak', S.cevap);
          if (S.portre && S.portre.z) sendStrokes(this.live, 'portre', S.portre.z);
        }
        break;
      case 'portre':
        this.portreInbox = this.portreInbox || new StrokeInbox();
        if (this.portreInbox.add(m)) {
          S.portre = S.portre || {};
          S.portre.e = this.portreInbox.result();
          save();
          if (this.onPortreGeldi) this.onPortreGeldi();
        }
        break;
      case 'portre-son':
        if (this.onPortreEnd) this.onPortreEnd();
        break;
      case 'ucak-ok':
        S.cevapOk = true;
        save();
        if (this.onPlaneAck) this.onPlaneAck();
        break;
      case 'not':
        Notes.push(m.metin);
        this.live.send({ t: 'not-ok' });
        break;
      case 'gorus':
        if (S.gorus !== m.metin) {
          S.gorus = m.metin;
          save();
          if (!showOpinion(true)) Notes.push(`karnene görüş yazdı: ${m.metin}`);
        }
        broadcast();
        break;
      case 'itiraz':
        showObjection();
        break;
      case 'yak':
        if (this.onLight) this.onLight();
        break;
      case 'ufle':
        if (this.onBlow) this.onBlow();
        break;
      case 'd':
      case 'de':
      case 'du':
        if (this.board) this.board.receive(m);
        break;
      default:
    }
  },

  async start() {
    const c = document.createElement('canvas');
    c.width = c.height = 150;
    const x = c.getContext('2d');
    const img = x.createImageData(150, 150);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = 118;
      img.data[i + 1] = 100;
      img.data[i + 2] = 70;
      img.data[i + 3] = Math.random() * 11;
    }
    x.putImageData(img, 0, 0);
    document.documentElement.style.setProperty('--doku', `url(${c.toDataURL()})`);
    document.documentElement.style.setProperty('--tahta', `url(${chalkTexture()})`);

    this.root = document.getElementById('defter');
    // Enes'in sekmesi arka plandayken nabzı seyrekleşir; hemen "yok" saymayalım.
    this.live = new Live({
      role: 'z',
      peerMs: 75000,
      onMessage: (m) => this.handleLive(m),
      onReady: () => broadcast(),
    });

    if (document.fonts && document.fonts.load) {
      await Promise.race([
        Promise.all([
          document.fonts.load('24px Kalam', 'şğı'),
          document.fonts.load('28px "Just Me Again Down Here"', 'şğı'),
          document.fonts.load('40px Anton', 'Kazı'),
        ]),
        sleep(2600),
      ]).catch(() => {});
    }
    Desk.build(this.root);
    Scribe.init(this.root);
    if (S.bitti) {
      setTheme(WOOD);
      Desk.full(false, (id, node) => this.fromDesk(id, node));
    } else if (S.page === 'kapak') {
      setTheme(WOOD);
      Desk.intro(() => this.openNotebook());
    } else {
      this.show(S.page);
    }
    this.live.start();
    keepAwake();
    keepInputsVisible(this.root);
  },
};

// Kara tahtanın silinmiş tebeşir izleri.
function chalkTexture() {
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 620;
  const x = c.getContext('2d');
  x.fillStyle = BOARD;
  x.fillRect(0, 0, 300, 620);
  x.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    x.strokeStyle = `rgba(232,240,232,${rand(0.006, 0.03)})`;
    x.lineWidth = rand(12, 46);
    const sx = rand(-40, 300), sy = rand(-40, 620), a = rand(-0.5, 0.5);
    x.beginPath();
    x.moveTo(sx, sy);
    x.quadraticCurveTo(sx + 90, sy + rand(-30, 30), sx + Math.cos(a) * 210, sy + Math.sin(a) * 210);
    x.stroke();
  }
  for (let i = 0; i < 5000; i++) {
    x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${rand(0.01, 0.05)})`;
    x.fillRect(rand(0, 300), rand(0, 620), 1, 1);
  }
  return c.toDataURL('image/jpeg', 0.72);
}

// Okurken ekran kararmasın. Sekmeye dönüldüğünde kilit yeniden istenir.
function keepAwake() {
  if (!navigator.wakeLock) return;
  let lock = null;
  const ask = async () => {
    if (lock || document.hidden) return;
    try {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } catch (e) {}
  };
  window.addEventListener('pointerdown', ask);
  document.addEventListener('visibilitychange', ask);
}

// Klavye açılınca defter görünen alana sığsın, yazılan kutu kapanmasın.
function keepInputsVisible(root) {
  const vv = window.visualViewport;
  if (!vv) return;
  let active = false;
  const fit = () => {
    if (!active) return;
    root.style.top = `${vv.offsetTop}px`;
    root.style.bottom = 'auto';
    root.style.height = `${vv.height}px`;
  };
  document.addEventListener('focusin', (e) => {
    if (!e.target.matches('input')) return;
    active = true;
    fit();
    setTimeout(() => {
      fit();
      e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 280);
  });
  document.addEventListener('focusout', () => {
    active = false;
    root.style.top = root.style.bottom = root.style.height = '';
  });
  vv.addEventListener('resize', fit);
  vv.addEventListener('scroll', fit);
}

window.addEventListener('DOMContentLoaded', () => Book.start());
