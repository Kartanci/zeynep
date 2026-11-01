// Okul sırası: açılışta defter burada durur, en sonda o akşam biriken her şey buraya döner.
const WOOD = '#8f6540';

function paintWood(cv, W, H) {
  cv.width = W;
  cv.height = H;
  const x = cv.getContext('2d');
  const img = x.createImageData(W, H);
  const table = new Float32Array(65536);
  for (let i = 0; i < table.length; i++) table[i] = Math.random();
  const noise = (u, v) => {
    const iu = Math.floor(u), iv = Math.floor(v), fu = u - iu, fv = v - iv;
    const su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
    const g = (a, b) => table[((a & 255) << 8) | (b & 255)];
    const a = g(iu, iv), b = g(iu + 1, iv), c = g(iu, iv + 1), d = g(iu + 1, iv + 1);
    return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
  };
  let o = 0;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const warp = noise(px * 0.005, py * 0.0018) * 54 + noise(px * 0.024, py * 0.007) * 7;
      const u = px + warp;
      const band = Math.sin(u * 0.062 + noise(u * 0.005, py * 0.0012) * 7) * 0.5 + 0.5;
      const fine = noise(u * 0.42, py * 0.008);
      const finer = noise(u * 1.4, py * 0.03);
      const v = 0.42 * band + 0.33 * fine + 0.25 * finer;
      img.data[o++] = 118 + v * 74;
      img.data[o++] = 78 + v * 62;
      img.data[o++] = 44 + v * 46;
      img.data[o++] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // Lif gözenekleri
  for (let i = 0; i < W * H * 0.004; i++) {
    x.fillStyle = `rgba(52,28,12,${rand(0.05, 0.2)})`;
    x.fillRect(rand(0, W), rand(0, H), rand(0.6, 1.3), rand(5, 26));
  }
  // Yıllarca sürtünmüş sıra çizikleri
  x.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const a = rand(0, Math.PI), sx = rand(0, W), sy = rand(0, H), l = rand(14, 120);
    x.strokeStyle = Math.random() < 0.65 ? `rgba(245,220,185,${rand(0.05, 0.16)})` : `rgba(40,20,8,${rand(0.08, 0.2)})`;
    x.lineWidth = rand(0.5, 1.2);
    x.beginPath();
    x.moveTo(sx, sy);
    x.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l);
    x.stroke();
  }
  // Tükenmez lekesi
  x.fillStyle = 'rgba(30,40,110,.13)';
  x.beginPath();
  x.ellipse(W * 0.84, H * 0.1, 7, 4.5, 0.5, 0, 7);
  x.ellipse(W * 0.865, H * 0.108, 2.4, 1.7, 0, 0, 7);
  x.fill();

  // Pencereden gelen ışık, kenarlara doğru gölge
  const glow = x.createRadialGradient(W * 0.28, H * 0.16, 30, W * 0.46, H * 0.46, Math.max(W, H) * 0.86);
  glow.addColorStop(0, 'rgba(255,236,205,.2)');
  glow.addColorStop(0.45, 'rgba(255,236,205,0)');
  glow.addColorStop(1, 'rgba(26,13,5,.5)');
  x.fillStyle = glow;
  x.fillRect(0, 0, W, H);
}

// Bıçakla kazınmış çizgi: koyu oyuk, altında ışık alan kenar.
function carve(x, lines, { dark = 'rgba(42,20,7,.78)', light = 'rgba(255,231,196,.3)', w = 2.6 } = {}) {
  x.lineCap = 'round';
  x.lineJoin = 'round';
  [[light, 0.9, 1.1, w], [dark, 0, 0, w]].forEach(([color, dx, dy, lw]) => {
    x.strokeStyle = color;
    x.lineWidth = lw;
    lines.forEach((pts) => {
      x.beginPath();
      pts.forEach(([a, b], i) => {
        const px = a + dx + (i ? rand(-0.5, 0.5) : 0), py = b + dy + (i ? rand(-0.5, 0.5) : 0);
        if (i) x.lineTo(px, py);
        else x.moveTo(px, py);
      });
      x.stroke();
    });
  });
}

function carveInitials(x, ox, oy, s = 1) {
  const p = (pts) => pts.map(([a, b]) => [ox + a * s, oy + b * s]);
  carve(x, [
    p([[0, 2], [30, 0], [2, 40], [34, 37]]),
    p([[55, 10], [54, 34]]),
    p([[42, 22], [67, 20]]),
    p([[90, 0], [88, 40]]),
    p([[89, 1], [118, -1]]),
    p([[89, 20], [112, 18]]),
    p([[88, 40], [120, 38]]),
  ], { w: 3 * s });
  // Etrafına sonradan çizilmiş eğri bir çerçeve
  const ring = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2 + 0.3;
    ring.push([ox + 60 * s + Math.cos(a) * 82 * s, oy + 20 * s + Math.sin(a) * 42 * s]);
  }
  carve(x, [ring], { w: 1.5 * s, dark: 'rgba(42,20,7,.5)', light: 'rgba(255,231,196,.18)' });
}

const Desk = {
  build(root) {
    this.root = root;
    this.el = el('div', 'masa');
    this.cv = el('canvas', 'masa-ahsap');
    this.items = el('div', 'masa-esyalar');
    this.el.append(this.cv, this.items);
    root.prepend(this.el);
    const r = root.getBoundingClientRect();
    const W = Math.round(Math.max(r.width, 320));
    const H = Math.round(Math.max(r.height, 560));
    this.W = W;
    this.H = H;
    paintWood(this.cv, W, H);
    const x = this.cv.getContext('2d');
    carveInitials(x, W * 0.09, H - 76, Math.min(W / 430, 0.82));
    x.font = '15px "Just Me Again Down Here", cursive';
    x.fillStyle = 'rgba(40,20,8,.34)';
    x.save();
    x.translate(W * 0.68, H * 0.045);
    x.rotate(-0.05);
    x.fillText('12-B', 0, 0);
    x.restore();
    x.save();
    x.translate(W * 0.06, H * 0.6);
    x.rotate(-1.48);
    x.fillStyle = 'rgba(40,20,8,.2)';
    x.fillText('cuma ne zaman', 0, 0);
    x.restore();
  },

  clear() {
    this.items.innerHTML = '';
  },

  notebookHtml() {
    return `
      <div class="kapak-sirt"></div>
      <div class="kapak-parlak"></div>
      <div class="etiket">
        <div><span>Adı Soyadı</span><b data-yaz>Zeynep</b></div>
        <div><span>Sınıfı</span><b data-yaz>${ICERIK.yas}-A</b></div>
        <div><span>No</span><b data-yaz>1</b></div>
        <div><span>Dersi</span><b data-yaz>Doğum Günü</b></div>
        <div><span>Sıra Arkadaşı</span><b data-yaz>Enes</b></div>
      </div>`;
  },

  eraser(style) {
    const e = el('div', 'silgi', '<i></i>');
    Object.assign(e.style, style);
    return e;
  },

  // İlk açılış: sırada sadece defter, yanında kalem ve silgi.
  async intro(onOpen) {
    this.clear();
    const { W, H } = this;
    const nb = el('button', 'masa-defter');
    nb.setAttribute('aria-label', 'defteri aç');
    nb.innerHTML = this.notebookHtml();
    this.items.append(nb);
    this.notebook = nb;
    const scale = Math.min((W * 0.76) / 280, (H * 0.56) / 392);
    nb.style.setProperty('--olcek', scale.toFixed(3));
    nb.style.left = `${W / 2 - 140}px`;
    nb.style.top = `${H * 0.43 - 196}px`;
    this.items.append(this.eraser({ right: '26px', top: `${H * 0.06}px`, transform: 'rotate(24deg)' }));
    Scribe.setHome({ x: W * 0.62, y: H * 0.905, angle: 72 });
    Scribe.toHome(true);

    const chars = [...nb.querySelectorAll('[data-yaz]')].flatMap((b) => splitLetters(b));
    nb.onclick = () => {
      if (this.opening) return;
      this.opening = true;
      buzz(10);
      onOpen();
    };
    await sleep(FAST ? 0 : 650);
    await revealWithPen(chars, 0.72, 'mavi');
    if (this.opening) return;
    await sleep(FAST ? 0 : 200);
    const note = el('div', 'postit masa-not', 'bunu bende unutmuşsun.<small>(aç)</small>');
    nb.append(note);
    requestAnimationFrame(() => note.classList.add('v'));
    setTimeout(() => note.classList.add('oynak'), 2600);
  },

  // Defter yakınlaşır, tam ekran kapakla etiketleri üst üste gelir.
  zoomTo(leaf) {
    const nb = this.notebook;
    const miniLabel = nb.querySelector('.etiket');
    const fullLabel = leaf.querySelector('.etiket');
    const rootR = this.root.getBoundingClientRect();
    const full = fullLabel.getBoundingClientRect();
    const k = fullLabel.offsetWidth / miniLabel.offsetWidth;
    const cxLabel = miniLabel.offsetLeft + miniLabel.offsetWidth / 2 - nb.offsetWidth / 2;
    const cyLabel = miniLabel.offsetTop + miniLabel.offsetHeight / 2 - nb.offsetHeight / 2;
    const tx = full.left + full.width / 2 - rootR.left - k * cxLabel - (nb.offsetLeft + nb.offsetWidth / 2);
    const ty = full.top + full.height / 2 - rootR.top - k * cyLabel - (nb.offsetTop + nb.offsetHeight / 2);
    nb.style.transition = `transform ${FAST ? 0 : 780}ms cubic-bezier(.55,.05,.25,1)`;
    nb.style.transform = `translate(${tx}px,${ty}px) scale(${k}) rotate(0deg)`;
    return sleep(FAST ? 0 : 780);
  },

  // En son: akşamdan kalan her şey sıranın üstünde. Dokununca açılırlar.
  full(animated, open) {
    this.clear();
    const { W, H } = this;
    Scribe.setHome({ x: W * 0.93, y: H * 0.72, angle: -8 });
    Scribe.toHome(!animated);

    const cellW = (W - 36) / 2;
    const place = (node, col, top, rot, targetW) => {
      const left = 18 + col * cellW + (cellW - targetW) / 2;
      node.style.left = `${left}px`;
      node.style.top = `${top * H}px`;
      node.style.width = `${targetW}px`;
      node.style.setProperty('--r', `${rot}deg`);
      this.items.append(node);
      return node;
    };
    const tappable = (node, id, label) => {
      node.setAttribute('aria-label', label);
      node.onclick = () => { buzz(8); open(id, node); };
      return node;
    };

    // Defter (etiketli küçük kapak)
    const nb = tappable(el('button', 'esya esya-defter'), 'son', 'defter');
    nb.innerHTML = `<div class="kapak-sirt"></div><div class="kapak-parlak"></div>
      <div class="mini-etiket"><i>Zeynep</i><u>${ICERIK.yas}-A</u><u>Doğum Günü</u></div>`;
    const word = S.oyun && S.oyun.kelime;
    if (word) {
      const tab = el('div', 'esya-ayrac');
      tab.textContent = word;
      nb.append(tab);
    }
    place(nb, 0, 0.05, -5, Math.min(cellW * 0.86, 150));

    // Karne
    const k = tappable(el('button', 'esya esya-karne'), 'karne', 'karne');
    k.innerHTML = '<div class="mini-baslik">Karne</div><span></span><span></span><span></span><span></span><span></span><div class="mini-damga">Geçti</div>';
    place(k, 1, 0.065, 4, Math.min(cellW * 0.88, 152));

    // Biletler
    const won = S.kazi ? S.kazi.won.length : 0;
    const total = S.kazi ? S.kazi.order.length : 0;
    const left = total - won;
    const t = tappable(el('button', 'esya esya-biletler'), 'kuponlar', 'kazı kazan biletleri');
    const count = Math.max(1, Math.min(total, 3));
    let fan = '';
    for (let i = 0; i < count; i++) fan += `<div class="mini-bilet" style="--i:${i - (count - 1) / 2}"><b>Kazı Kazan</b><em class="${i === count - 1 && left === 0 ? 'kazinmis' : ''}"></em></div>`;
    t.innerHTML = fan;
    if (left > 0) {
      const badge = el('div', 'esya-rozet');
      badge.textContent = left === 1 ? '1 bilet kazınmadı' : `${left} bilet kazınmadı`;
      t.append(badge);
    }
    place(t, 0, 0.385, -3, Math.min(cellW * 0.92, 160));

    // Çizimler: pasta ve portreler
    const art = tappable(el('button', 'esya esya-resim'), 'resimler', 'çizimler');
    art.innerHTML = '<div class="bant kucuk-bant"></div><canvas></canvas>';
    place(art, 1, 0.36, 3, Math.min(cellW * 0.9, 156));
    Sketches.cake(art.querySelector('canvas'), art.offsetWidth - 14, Math.round((art.offsetWidth - 14) * 0.86));

    if (S.portre && (S.portre.z || S.portre.e)) {
      const ph = tappable(el('button', 'esya esya-foto'), 'resimler', 'sınıf fotoğrafı');
      ph.innerHTML = '<canvas></canvas><canvas></canvas><div class="foto-yazi">sınıf fotoğrafı</div>';
      place(ph, 1, 0.625, -4, Math.min(cellW * 0.94, 164));
      const [a, b] = ph.querySelectorAll('canvas');
      const pw = Math.floor((ph.offsetWidth - 22) / 2);
      Sketches.portrait(a, S.portre.z, pw, Math.round(pw * 1.2));
      Sketches.portrait(b, S.portre.e, pw, Math.round(pw * 1.2));
    }

    // Sınav kağıdı
    const score = examScore();
    if (score !== null) {
      const ex = tappable(el('button', 'esya esya-sinav'), 'sinav', 'sınav kağıdı');
      ex.innerHTML = `<div class="mini-baslik">1. Yazılı</div><div class="mini-ad">Enes</div><div class="mini-not">${score}</div><span></span><span></span><span></span>`;
      place(ex, 0, 0.635, 3, Math.min(cellW * 0.84, 140));
    }

    const note = el('div', 'postit esya-not', 'bu sefer unutma.<small>(hepsine dokunabilirsin)</small>');
    this.items.append(note);
    note.style.right = '12px';
    note.style.top = `${H - 82}px`;

    const nodes = [...this.items.querySelectorAll('.esya')];
    if (animated && !FAST) {
      nodes.forEach((n, i) => {
        n.classList.add('gelecek');
        setTimeout(() => { n.classList.remove('gelecek'); buzz(5); }, 500 + i * 190);
      });
      setTimeout(() => note.classList.add('v'), 500 + nodes.length * 190 + 300);
    } else {
      note.classList.add('v');
    }
  },
};

