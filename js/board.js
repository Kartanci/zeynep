// İkisinin aynı anda çizebildiği pasta sayfası. Koordinatlar iki ekranda da aynı olsun diye mantıksal bir tuval kullanılır.
class Board {
  static W = 1000;
  static H = 1400;
  static INK = { z: '#1c3c9e', e: '#d02b27', o: '#d02b27' };

  constructor(wrap, { me = 'z', strokes = [], W = Board.W, H = Board.H, send = () => {}, onChange = () => {}, onRemote = () => {} } = {}) {
    Object.assign(this, { wrap, me, W, H, send, onChange, onRemote });
    this.tool = 'p';
    this.active = true;
    this.strokes = strokes.map((s) => ({ ...s, pts: s.pts.slice() }));
    this.map = new Map(this.strokes.map((s) => [s.id, s]));
    this.count = 0;
    this.hi = el('canvas', 'tuval-fosfor');
    this.ink = el('canvas', 'tuval-murekkep');
    wrap.append(this.hi, this.ink);
    this.bind();
    this.resize();
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(wrap);
    }
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const r = this.wrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.dpr = dpr;
    [this.hi, this.ink].forEach((c) => {
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
    });
    this.s = Math.min(r.width / this.W, r.height / this.H);
    this.ox = (r.width - this.W * this.s) / 2;
    this.oy = (r.height - this.H * this.s) / 2;
    this.redraw();
  }

  toLogical(e) {
    const r = this.wrap.getBoundingClientRect();
    return [
      Math.round(clamp((e.clientX - r.left - this.ox) / this.s, 0, this.W)),
      Math.round(clamp((e.clientY - r.top - this.oy) / this.s, 0, this.H)),
    ];
  }

  toScreen(x, y) {
    return [this.ox + x * this.s, this.oy + y * this.s];
  }

  ctxFor(st) {
    const c = st.k === 'f' ? this.hi : this.ink;
    const x = c.getContext('2d');
    x.setTransform(this.dpr * this.s, 0, 0, this.dpr * this.s, this.dpr * this.ox, this.dpr * this.oy);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.strokeStyle = st.k === 'f' ? '#ffe94d' : Board.INK[st.o] || Board.INK.z;
    x.lineWidth = st.k === 'f' ? 38 : Math.max(5.2, 1.7 / this.s);
    return x;
  }

  // Noktalar arada kaybolmuşsa boşluğa kadar çizer; kaldığı yerden devam eder.
  paint(st) {
    const p = st.pts;
    let n = st.done || 0;
    let end = n;
    while (end + 1 < p.length && p[end] !== undefined && p[end + 1] !== undefined) end += 2;
    if (end <= n) return;
    const x = this.ctxFor(st);
    x.beginPath();
    if (n === 0) {
      x.moveTo(p[0], p[1]);
      x.lineTo(p[0] + 0.1, p[1] + 0.1);
      n = 2;
    } else if (st.mx === undefined) {
      x.moveTo(p[n - 2], p[n - 1]);
    } else {
      x.moveTo(st.mx, st.my);
    }
    for (let i = n; i < end; i += 2) {
      const mx = (p[i - 2] + p[i]) / 2;
      const my = (p[i - 1] + p[i + 1]) / 2;
      if (st.mx === undefined) x.lineTo(mx, my);
      else x.quadraticCurveTo(p[i - 2], p[i - 1], mx, my);
      st.mx = mx;
      st.my = my;
    }
    x.stroke();
    st.done = end;
  }

  finishLine(st) {
    if (!st.pts.length || st.pts.length < 4 || st.mx === undefined) return;
    const x = this.ctxFor(st);
    const n = st.pts.length;
    x.beginPath();
    x.moveTo(st.mx, st.my);
    x.lineTo(st.pts[n - 2], st.pts[n - 1]);
    x.stroke();
  }

  redraw() {
    if (!this.s) return;
    [this.hi, this.ink].forEach((c) => {
      const x = c.getContext('2d');
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, c.width, c.height);
    });
    for (const st of this.strokes) {
      st.done = 0;
      st.mx = st.my = undefined;
      this.paint(st);
      if (st.end) this.finishLine(st);
    }
  }

  bind() {
    const w = this.wrap;
    w.addEventListener('pointerdown', (e) => {
      if (!this.active || this.cur) return;
      e.preventDefault();
      try { w.setPointerCapture(e.pointerId); } catch (err) {}
      this.pid = e.pointerId;
      const id = `${this.me}${Date.now().toString(36)}${this.count++}`;
      const [x, y] = this.toLogical(e);
      const st = { id, o: this.me, k: this.tool, pts: [x, y] };
      this.cur = st;
      this.strokes.push(st);
      this.map.set(id, st);
      this.sentTo = 0;
      this.paint(st);
      this.flushTimer = setInterval(() => this.flush(), 60);
    });
    w.addEventListener('pointermove', (e) => {
      if (!this.cur || e.pointerId !== this.pid) return;
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of list.length ? list : [e]) this.addPoint(ev);
      this.paint(this.cur);
    });
    const end = (e) => {
      if (!this.cur || e.pointerId !== this.pid) return;
      const st = this.cur;
      this.cur = null;
      clearInterval(this.flushTimer);
      st.end = true;
      this.finishLine(st);
      this.flush(st);
      this.send({ t: 'de', st: this.bare(st) });
      this.onChange(this.export());
    };
    w.addEventListener('pointerup', end);
    w.addEventListener('pointercancel', end);
  }

  addPoint(e) {
    const st = this.cur;
    const [x, y] = this.toLogical(e);
    const n = st.pts.length;
    const dx = x - st.pts[n - 2], dy = y - st.pts[n - 1];
    if (dx * dx + dy * dy < 9) return;
    st.pts.push(x, y);
  }

  flush(st = this.cur) {
    if (!st || this.sentTo >= st.pts.length) return;
    this.send({ t: 'd', s: st.id, o: st.o, k: st.k, i: this.sentTo, p: st.pts.slice(this.sentTo) });
    this.sentTo = st.pts.length;
  }

  bare(st) {
    return { id: st.id, o: st.o, k: st.k, pts: st.pts, end: true };
  }

  export() {
    return this.strokes.filter((s) => s.pts.length).map((s) => this.bare(s));
  }

  undo() {
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      if (this.strokes[i].o === this.me) {
        const [st] = this.strokes.splice(i, 1);
        this.map.delete(st.id);
        this.send({ t: 'du', s: st.id });
        this.redraw();
        this.onChange(this.export());
        return true;
      }
    }
    return false;
  }

  receive(m) {
    if (m.t === 'd') {
      let st = this.map.get(m.s);
      if (!st) {
        st = { id: m.s, o: m.o, k: m.k, pts: [] };
        this.strokes.push(st);
        this.map.set(m.s, st);
      }
      m.p.forEach((v, j) => { st.pts[m.i + j] = v; });
      this.paint(st);
      this.onRemote();
    } else if (m.t === 'de') {
      this.adopt(m.st);
      this.onRemote();
      this.onChange(this.export());
    } else if (m.t === 'du') {
      const st = this.map.get(m.s);
      if (st) {
        this.strokes.splice(this.strokes.indexOf(st), 1);
        this.map.delete(m.s);
        this.redraw();
        this.onChange(this.export());
      }
    } else if (m.t === 'dall') {
      m.part.forEach((st) => this.adopt(st, true));
      this.redraw();
      this.onChange(this.export());
    }
  }

  // Karşı taraftan gelen tamamlanmış çizgi: eksik parça varsa düzeltir.
  adopt(full, silent) {
    const st = this.map.get(full.id);
    if (!st) {
      const copy = { ...full, pts: full.pts.slice() };
      this.strokes.push(copy);
      this.map.set(copy.id, copy);
      if (!silent) { this.paint(copy); this.finishLine(copy); }
      return;
    }
    st.pts = full.pts.slice();
    st.end = true;
    if (silent) return;
    this.paint(st);
    this.finishLine(st);
  }
}

// Boş bırakılırsa kullanılan pasta ve mumun çizgileri. Mantıksal tuval koordinatlarında.
const CakeArt = {
  polyline(d, o = 'z', amp = 4) {
    const pts = Pen.wobble(Pen.sample(d, 22), amp).flat().map((v) => Math.round(v));
    return { id: `a${Math.random().toString(36).slice(2, 8)}`, o, k: 'p', pts, end: true };
  },

  fallback() {
    const a = (d) => CakeArt.polyline(d);
    return [
      a('M230 830 L235 1150 C400 1190 620 1190 775 1150 L770 830'),
      a('M230 830 C300 790 700 790 770 830 C700 870 300 870 230 830'),
      a('M232 960 C290 1010 320 930 380 970 C440 1020 480 930 540 975 C600 1020 650 930 710 970 C740 990 755 975 772 960'),
      a('M120 1160 C300 1215 720 1215 880 1160'),
    ];
  },

  candle(x, baseY, h = 200) {
    const p = (d) => CakeArt.polyline(d, 'z', 1.6);
    const top = baseY - h;
    const out = [
      p(`M${x - 21} ${baseY} L${x - 19} ${top}`),
      p(`M${x + 21} ${baseY} L${x + 19} ${top}`),
      p(`M${x - 19} ${top} C${x - 10} ${top - 9} ${x + 10} ${top - 9} ${x + 19} ${top} C${x + 10} ${top + 9} ${x - 10} ${top + 9} ${x - 19} ${top}`),
      p(`M${x} ${top - 1} L${x + 2} ${top - 18}`),
    ];
    for (let i = 1; i <= 3; i++) {
      const y = top + (h * i) / 4;
      out.push(p(`M${x - 20} ${y + 14} L${x + 20} ${y - 14}`));
    }
    return out;
  },

  // İmza tuvali 1000x360 birimdir.
  signature(cv, strokes, w, h) {
    const dpr = Math.min(devicePixelRatio || 1, 2.5);
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;
    const x = cv.getContext('2d');
    x.scale(dpr, dpr);
    const s = Math.min(w / 1000, h / 360);
    CakeArt.draw(x, strokes || [], { s, ox: (w - 1000 * s) / 2, oy: (h - 360 * s) / 2, color: '#d02b27', width: 1.6 });
  },

  // Çizgileri verilen tuvale, verilen renk ve ölçekle çizer.
  draw(ctx, strokes, { s, ox, oy, color, hi = null, width = 1.8 }) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const st of strokes) {
      if (st.k === 'f' && !hi) continue;
      const p = st.pts;
      if (!p || p.length < 2) continue;
      ctx.strokeStyle = st.k === 'f' ? hi : color || Board.INK[st.o] || Board.INK.z;
      ctx.lineWidth = st.k === 'f' ? 38 * s : width;
      ctx.beginPath();
      ctx.moveTo(ox + p[0] * s, oy + p[1] * s);
      for (let i = 2; i < p.length - 2; i += 2) {
        const mx = (p[i] + p[i + 2]) / 2, my = (p[i + 1] + p[i + 3]) / 2;
        ctx.quadraticCurveTo(ox + p[i] * s, oy + p[i + 1] * s, ox + mx * s, oy + my * s);
      }
      ctx.lineTo(ox + p[p.length - 2] * s, oy + p[p.length - 1] * s);
      ctx.stroke();
    }
    ctx.restore();
  },
};
