// Defteri yazan tükenmez kalem. Ucu yazılan harfi izler, iş bitince yerine döner.
const KALEM_SVG = `
  <svg class="kalem-sekil" viewBox="0 0 40 230" width="30" height="172" aria-hidden="true">
    <defs>
      <linearGradient id="kalemGovde" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity=".78"/>
        <stop offset=".24" stop-color="#f7fafd" stop-opacity=".46"/>
        <stop offset=".52" stop-color="#e3e9f0" stop-opacity=".36"/>
        <stop offset=".8" stop-color="#b7c1cd" stop-opacity=".56"/>
        <stop offset="1" stop-color="#7f8b99" stop-opacity=".82"/>
      </linearGradient>
      <linearGradient id="kalemMetal" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#7b7f85"/>
        <stop offset=".4" stop-color="#eceef0"/>
        <stop offset="1" stop-color="#585c62"/>
      </linearGradient>
    </defs>
    <path d="M14.2 5.5Q20 1.5 25.8 5.5L26.5 21H13.5Z" fill="var(--kalem-renk)"/>
    <path d="M14.2 5.5Q20 3.6 25.8 5.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>
    <rect x="18.3" y="21" width="3.4" height="150" rx="1.2" fill="var(--kalem-renk)"/>
    <path d="M13 21H27V170H13Z" fill="url(#kalemGovde)" stroke="#59626e" stroke-opacity=".5" stroke-width=".7"/>
    <path d="M17 21V170" stroke="#fff" stroke-opacity=".75" stroke-width="1"/>
    <path d="M23 21V170" stroke="#616b77" stroke-opacity=".28" stroke-width=".8"/>
    <path d="M18.7 170H21.3L20.8 207H19.2Z" fill="var(--kalem-renk)"/>
    <path d="M13 170H27L22.6 208H17.4Z" fill="url(#kalemGovde)" stroke="#59626e" stroke-opacity=".5" stroke-width=".7"/>
    <path d="M17.5 208H22.5L20.5 226.5H19.5Z" fill="url(#kalemMetal)"/>
    <circle cx="20" cy="227.4" r=".9" fill="#2c2e33"/>
  </svg>`;

const Scribe = {
  INK: { mavi: '#1c3c9e', kirmizi: '#d02b27', siyah: '#17181d' },
  TIP_X: 15,
  TIP_Y: 171,
  angle: 26,
  enabled: false,
  writing: false,

  init(root) {
    this.root = root;
    this.enabled = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.el = el('div', 'kalem', KALEM_SVG);
    this.body = this.el.firstElementChild;
    root.append(this.el);
    this.setInk('mavi');
    this.home = null;
    this.toHome(true);
  },

  setInk(name) {
    this.el.style.setProperty('--kalem-renk', this.INK[name] || this.INK.mavi);
  },

  setAngle(deg) {
    this.body.style.transform = `rotate(${deg}deg)`;
  },

  place(x, y) {
    this.el.style.transform = `translate3d(${(x - this.TIP_X).toFixed(1)}px,${(y - this.TIP_Y).toFixed(1)}px,0)`;
  },

  // Kalemin dinlendiği yer. Sırada masanın üstü, sayfalarda ekranın dışı.
  setHome(home) {
    this.home = home;
    if (!this.writing) this.toHome(false);
  },

  toHome(instant) {
    if (!this.el) return;
    const r = this.root.getBoundingClientRect();
    const h = this.home || { x: r.width + 70, y: r.height * 0.62, angle: 40 };
    this.el.classList.toggle('kalem-aninda', !!instant);
    this.el.classList.add('kalem-dinlen');
    this.place(h.x, h.y);
    this.setAngle(h.angle);
    this.writing = false;
    this.el.classList.toggle('masada', !!this.home);
  },

  begin(ink = 'mavi') {
    if (!this.enabled) return;
    clearTimeout(this.idleTimer);
    this.setInk(ink);
    this.el.classList.remove('kalem-dinlen', 'kalem-aninda', 'masada');
    this.writing = true;
  },

  rootPoint(rect) {
    const r = this.root.getBoundingClientRect();
    return [rect.x - r.left, rect.y - r.top];
  },

  toChar(c) {
    if (!this.writing) return;
    const b = c.getBoundingClientRect();
    if (!b.width && !b.height) return;
    const [x, y] = this.rootPoint({ x: b.right - 1, y: b.bottom - b.height * 0.2 });
    this.place(x, y);
    this.setAngle(this.angle + rand(-2.2, 2.2));
  },

  // Çizilen yolun üstünde ucu gezdirir.
  trace(path, len, dur, delay = 0) {
    if (!this.writing) return;
    const start = performance.now() + delay;
    const tick = (now) => {
      if (!this.writing || !path.isConnected) return;
      const k = clamp((now - start) / dur, 0, 1);
      const pt = path.getPointAtLength(len * k);
      const m = path.getScreenCTM();
      if (m) {
        const [x, y] = this.rootPoint({ x: pt.x * m.a + pt.y * m.c + m.e, y: pt.x * m.b + pt.y * m.d + m.f });
        this.place(x, y);
      }
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  // Kısa aralarda kalem kağıdın üstünde bekler, uzun bekleyişte yerine döner.
  idle(ms = 620) {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.toHome(false), ms);
  },

  away() {
    clearTimeout(this.idleTimer);
    if (this.el) this.toHome(false);
  },
};
