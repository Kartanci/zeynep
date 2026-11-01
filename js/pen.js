// Ortak yardımcılar ve elle çizilmiş görünüm
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

// Android'de titreşim, iPhone'da (iOS 18+) anahtar düğmesinin hafif tıkı. Dokunma anı dışında iPhone'da çalışmaz, sorun değil.
let buzzLast = 0;
function buzz(ms = 8) {
  if (navigator.vibrate) {
    try { navigator.vibrate(ms); } catch (e) {}
    return;
  }
  const now = Date.now();
  if (now - buzzLast < 70) return;
  buzzLast = now;
  try {
    const label = document.createElement('label');
    label.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.append(input);
    document.head.append(label);
    label.click();
    label.remove();
  } catch (e) {}
}

const Pen = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const f = (n) => Math.round(n * 10) / 10;
  let probe;

  function getProbe() {
    if (probe) return probe;
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', 0);
    s.setAttribute('height', 0);
    s.style.cssText = 'position:absolute;left:-9px;top:-9px;visibility:hidden';
    probe = document.createElementNS(NS, 'path');
    s.append(probe);
    document.body.append(s);
    return probe;
  }

  function sample(d, step = 6) {
    const p = getProbe();
    p.setAttribute('d', d);
    const len = p.getTotalLength();
    const n = Math.max(3, Math.round(len / step));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const q = p.getPointAtLength((len * i) / n);
      out.push([q.x, q.y]);
    }
    return out;
  }

  function wobble(pts, amp = 0.8) {
    let ox = rand(-amp, amp), oy = rand(-amp, amp), vx = 0, vy = 0;
    return pts.map(([x, y]) => {
      vx = vx * 0.72 + rand(-1, 1) * amp * 0.38;
      vy = vy * 0.72 + rand(-1, 1) * amp * 0.38;
      ox = ox * 0.92 + vx;
      oy = oy * 0.92 + vy;
      return [x + ox, y + oy];
    });
  }

  function smooth(pts) {
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += `Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
    }
    const last = pts[pts.length - 1];
    return d + `L${f(last[0])} ${f(last[1])}`;
  }

  const rough = (d, { step = 6, amp = 0.8 } = {}) => smooth(wobble(sample(d, step), amp));

  function svg(w, h, cls) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', `0 0 ${w} ${h}`);
    s.setAttribute('width', w);
    s.setAttribute('height', h);
    s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    s.style.overflow = 'visible';
    return s;
  }

  // Yolu kalemle çizer gibi canlandırır; çizim bitince çözülür.
  function stroke(target, d, { color = 'currentColor', width = 2, dur = 320, delay = 0, step = 6, amp = 0.8, plain = false, opacity = 1, trace = false } = {}) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', plain ? d : rough(d, { step, amp }));
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color);
    p.setAttribute('stroke-width', width);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    p.style.opacity = opacity;
    target.append(p);
    if (!dur) return Promise.resolve(p);
    const len = p.getTotalLength() + 2;
    p.style.strokeDasharray = `${len} ${len + 12}`;
    p.style.strokeDashoffset = len;
    p.style.visibility = 'hidden';
    return new Promise((res) => {
      setTimeout(() => {
        p.style.visibility = '';
        p.getBoundingClientRect();
        p.style.transition = `stroke-dashoffset ${dur}ms linear`;
        p.style.strokeDashoffset = 0;
        if (trace && typeof Scribe !== 'undefined') Scribe.trace(p, len, dur);
        setTimeout(() => res(p), dur);
      }, delay);
    });
  }

  const shape = {
    line: (x1, y1, x2, y2) => `M${x1} ${y1}L${x2} ${y2}`,
    box: (x, y, w, h) => `M${x + 1} ${y}L${x + w} ${y + 1}L${x + w - 1} ${y + h}L${x} ${y + h - 1}L${x + 1} ${y - 2}`,
    tick: (x, y, s) => `M${x} ${y + s * 0.55}L${x + s * 0.34} ${y + s * 0.95}L${x + s} ${y}`,
    ring(cx, cy, rx, ry) {
      const pts = [];
      const a0 = rand(-2.4, -1.8);
      for (let i = 0; i <= 42; i++) {
        const a = a0 + (i / 42) * (Math.PI * 2 + 0.5);
        const g = 1 + (i / 42) * 0.08;
        pts.push(`${f(cx + Math.cos(a) * rx * g)} ${f(cy + Math.sin(a) * ry * g)}`);
      }
      return 'M' + pts.join('L');
    },
    heart: (x, y, s) => `M${x + s / 2} ${y + s * 0.28}C${x + s / 2} ${y}, ${x} ${y}, ${x} ${y + s * 0.3}C${x} ${y + s * 0.58}, ${x + s * 0.4} ${y + s * 0.8}, ${x + s / 2} ${y + s}C${x + s * 0.6} ${y + s * 0.8}, ${x + s} ${y + s * 0.58}, ${x + s} ${y + s * 0.3}C${x + s} ${y}, ${x + s / 2} ${y}, ${x + s / 2} ${y + s * 0.28}`,
    zigzag(x, y, w, h, n = 7) {
      let d = `M${x} ${y + h * 0.5}`;
      for (let i = 1; i <= n; i++) d += `L${x + (w * i) / n} ${i % 2 ? y : y + h}`;
      return d;
    },
    arrow: (x, y, w) => `M${x} ${y}C${x + w * 0.3} ${y - 3}, ${x + w * 0.7} ${y + 2}, ${x + w} ${y}`,
  };

  return { NS, sample, wobble, smooth, rough, svg, stroke, shape };
})();

// Defter kenarına çizilmiş karalamalar. Her biri sırayla çizilen yollardan oluşur.
const DOODLES = {
  kas: { w: 150, h: 62, paths: [
    'M8 42C20 28 44 28 56 42C44 54 20 54 8 42',
    'M25 40a7 7 0 1 0 14 0a7 7 0 1 0-14 0',
    'M8 24C22 19 42 19 58 24',
    'M92 42C104 28 128 28 140 42C128 54 104 54 92 42',
    'M109 40a7 7 0 1 0 14 0a7 7 0 1 0-14 0',
    'M90 18C102 4 124 1 143 13',
  ] },
  zil: { w: 74, h: 72, paths: [
    'M37 12C22 12 17 26 17 39C17 50 12 55 7 60L67 60C62 55 57 50 57 39C57 26 52 12 37 12',
    'M30 60C30 70 44 70 44 60',
    'M37 12L37 5',
    'M3 26C0 33 0 40 3 46',
    'M71 26C74 33 74 40 71 46',
  ] },
  anahtar: { w: 84, h: 86, paths: [
    'M8 6L58 5L59 80L9 81L8 4',
    'M23 22L44 21L45 63L24 64L23 20',
    'M24 44L45 42',
    'M66 26L80 26',
    'M74 20L81 26L74 32',
  ] },
  ucak: { w: 132, h: 76, paths: [
    'M60 40L128 6L96 66L84 46Z',
    'M128 6L84 46',
    'M84 46L78 60L74 44',
    'M56 44C42 52 34 40 24 46C16 51 12 60 4 62',
  ] },
  dumanli: { w: 60, h: 100, paths: [
    'M23 96L24 52',
    'M37 96L36 52',
    'M24 52C27 49 33 49 36 52C33 55 27 55 24 52',
    'M30 51L30 44',
    'M30 40C24 33 36 28 30 20C26 14 34 10 31 2',
  ] },
};

const Doodle = {
  make(name, { scale = 1, color = 'currentColor', width = 1.8, cls = '' } = {}) {
    const d = DOODLES[name];
    const s = Pen.svg(d.w, d.h, `karalama ${cls}`);
    s.setAttribute('width', d.w * scale);
    s.setAttribute('height', d.h * scale);
    return {
      el: s,
      paint() {
        d.paths.forEach((p) => Pen.stroke(s, p, { color, width, dur: 0, step: 5, amp: 0.5 }));
      },
      async draw(speed = 1) {
        for (const p of d.paths) {
          await Pen.stroke(s, p, { color, width, dur: Math.max(70, 240 / d.paths.length * 2) / speed, step: 5, amp: 0.5, trace: true });
        }
      },
    };
  },
};
