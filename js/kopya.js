// Enes'in sayfası: Zeynep'in ne yaptığını görür, sırası gelince çizer, mumu yakar, not atar.
const SITE_LINK = new URL('./', location.href).href;
const $ = (id) => document.getElementById(id);

const PLAN = [
  ['Sıra', 'Okul sırasının üstünde defteri görür, kalem etiketine adını yazar. Dokununca açılır. "Ne defteri?" derse "aç bak" de.'],
  ['Psst', 'Site ona senden habersizmiş gibi kaşını kaldırmasını söyler. Kaşını kaldırıp sana bakacak. "Ne oldu?" de, hiçbir şey bilmiyormuş gibi yap.'],
  ['Sınav', 'Zeynep öğretmen, sen öğrencisin. Soruları sana sesli okur, cevabını dinleyip tik ya da çarpı atar. Biri müfredat dışı: kağıtta soru yok, aklına geleni soracak. Son soru 40 puan: "Bende en sevdiğin şey ne?" Burada gerçek bir cevap ver. Sonunda imzalayıp sana ödev verir, ödev buraya düşer.'],
  ['İlk bilet', 'Her çarpısı bir bilet. Birini hemen kazır, gerisi en sona, sıranın üstüne kalır. Kuponlar gerçek, sonradan bozdurabilir.'],
  ['Teneffüs', 'Kara tahta. 3-2-1\'de ikiniz aynı anda bir kelime söylersiniz. Tutmazsa o iki kelimenin ortasını bulmaya çalışırsınız. Dördüncü turdan sonra "zil çaldı" deyip geçebilir.'],
  ['Portre', 'Birbirinizi çizersiniz, bir dakika. Birbirinizinkini görmeden. "Hazırız" dediği an aşağıda tahtan açılır, süre bitince ikisi aynı anda ortaya çıkar. Kötü çiz, olayı bu.'],
  ['Pasta', 'Pasta yok, birlikte çizersiniz. O kırmızı, sen mavi. Bu sayfada tahta açılır, çizdiğin anında onda da görünür.'],
  ['Mum', 'Işığı kapatır. Telefonunun ekranı odadaki tek ışık olur, yani sen onun yüzünü mum ışığında görürsün. Mumu sen yakarsın, şarkıyı sen söylersin, o üfler, üflediğini görünce düğmeye basarsın.'],
  ['Karne', 'Akşamın sonuçlarını karnede görür. "Bir üst yaşa geçmiştir." <b>Burada sıra sende:</b> karnesine tek cümle görüş yazacaksın, senin elinle düşecek.'],
  ['Son sayfa', 'Senin notun, siyah kalemle yazılıyor. Altına cevap yazarsa kağıt uçak yapıp fırlatabilir, uçak bu sayfaya düşer.'],
  ['Arka kapak', '25 ile çarpım tablosu. Sonra defter kapanır, o akşam ne yaptıysanız sıranın üstünde durur. Kalan biletlerini orada kazır, bu kısımda acele yok.'],
];

const STEPS = {
  yok: () => ({ h: 'henüz açmadı', t: 'Görüşmeyi başlat, linki at. Açınca burası kendiliğinden değişir.' }),
  kapak: () => ({ h: 'sırada', t: 'Defteri açmasını bekle. "Ne defteri?" derse "aç bak" de.' }),
  psst: (s) => {
    if (s.kas === 'gormuyor') return { h: 'görüntüsü donmuş', t: 'Tarayıcıya geçince kamerası durmuş. Sorun değil, sesi geliyor. Mum sayfasında sen de ışığını kapatırsın, bu sefer o seni aydınlanmış görür.' };
    if (s.kas === 'dedi') return { h: '"ne oldu" dedin', t: 'Site ona "yok bir şey de" dedi. Sen de üstelemeye devam et.' };
    if (s.kas === 'demedi') return { h: 'fark etmedin', t: 'Sana göre "ne oldu" demedin, karnene yazıldı.' };
    return { h: 'psst sayfası', t: 'Birazdan kaşını kaldırıp sana bakacak. <span class="k-alinti">"Ne oldu?" de.</span> Bilmiyormuş gibi yap.' };
  },
  dogumgunu: () => ({ h: 'okuyor', t: 'Bir şey yapma. Birkaç klişe yazıp üstünü çiziyor, sonra "hepsinde enes lazım. üzgünüm." diyor. Gülerse anla.' }),
  sinav: (s) => {
    const q = ICERIK.sorular;
    const marks = s.sinav ? s.sinav.marks : [];
    if (!s.sinav || !s.sinav.basladi) return { h: 'sınava hazırlanıyor', t: 'Birazdan öğretmen olacak. Sana yardım edemem, cevapları bilmen gerekiyor. Her çarpısının ona bilet kazandırdığını da biliyor.' };
    const score = marks.every((m) => m === 0 || m === 1) ? q.reduce((a, it, i) => a + (marks[i] ? it.puan : 0), 0) : null;
    const rows = q.map((it, i) => {
      const m = marks[i];
      const mark = m === 1 ? '✓' : m === 0 ? '✗' : '';
      const text = it.bos ? 'Müfredat dışı: aklına geleni soracak.' : it.metin;
      return `<li class="${s.sinav.simdi === i ? 'simdi' : ''}"><span>${escapeHtml(text)}</span><span class="k-isaret">${mark}</span></li>`;
    }).join('');
    return {
      h: score === null ? 'sınavdasın' : `notun: ${score}`,
      t: `${score === null ? 'Sesli okuyacak, sen cevapla.' : 'Beğenmediysen itiraz et. Kabul edilmeyecek.'}<ul class="k-sinav">${rows}</ul>`,
      a: [{ label: 'itiraz ediyorum', msg: { t: 'itiraz' } }],
    };
  },
  teneffus: (s) => {
    const o = s.oyun;
    if (!o) return { h: 'kuralları okuyor', t: 'Sana kelime oyununu anlatacak. 3-2-1\'de aynı anda bir kelime söylüyorsunuz, tutmazsa ikisinin ortasını arıyorsunuz.' };
    if (o.bitti) return { h: o.pes ? 'zil çaldı' : `${o.tur}. turda buldunuz`, t: o.kelime ? `Kelimeniz: <span class="k-alinti">${escapeHtml(o.kelime)}</span>. Karneye yazılacak.` : 'Karneye yazılacak.' };
    return { h: `${o.tur}. tur`, t: o.sayiyor ? '<span class="k-alinti">Sayıyor. Hazır ol.</span>' : 'Aynı kelime mi çıktı, o işaretliyor.' };
  },
  portre: (s) => {
    const p = s.portre;
    if (p && p.asildi) return { h: 'dersi astı', t: 'Portre dersi yok. Devamsızlığına işlendi.' };
    if (p && p.bitti) return { h: 'açıldı', t: 'İkiniz de gördünüz. Birbirinizle dalga geçme serbest.' };
    if (p && p.ciziyor) return { h: 'çiziyorsunuz', t: 'Aşağıdaki tahtaya onu çiz. O senin çizdiğini görmüyor, sen de onunkini.' };
    return { h: 'resim dersi', t: 'Birazdan birbirinizi çizeceksiniz. "Hazırız" derse tahtan aşağıda açılır, süre aynı anda başlar.' };
  },
  sira: (s) => ({
    h: 'sıraya döndü',
    t: s.biletKalan ? `Defter kapandı. Sırada ${s.biletKalan} bileti kaldı, kazıdıkça aşağıda görürsün. Kalan vakti ona bırak.${listCoupons(s)}` : `Defter kapandı. Her şey sıranın üstünde.${listCoupons(s)}`,
  }),
  resimler: () => ({ h: 'çizimlere bakıyor', t: 'Pastanıza ve portrelere bakıyor.' }),
  pasta: (s) => ({
    h: s.candle ? 'mumu dikti' : 'pastayı çizin',
    t: s.candle ? 'Sıra mumda. Sayfayı çevirince ışığı kapatmasını isteyecek. <b>Sen de kapat</b>, bu ekranın parlaklığını aç.' : 'Sen mavisin. Aşağıdaki tahtaya çizdiğin anında onda görünür, onunkini de burada görürsün.',
  }),
  mum: (s) => {
    if (s.mum === 'karanlik') return { h: 'karanlıkta bekliyor', t: 'Mumu sen yakıyorsun.', a: [{ label: 'mumu yak', msg: { t: 'yak' }, main: true }] };
    if (s.mum === 'sondu') return { h: 'söndü', t: 'Birkaç saniye konuşma. Karanlık olsun.' };
    if (s.mum === 'yandi') return { h: 'mum yanıyor', t: 'Sıra sende. Şarkı, sonra kendi cümlelerin, sonra "dilek tut, üfle".', a: [{ label: 'üfledi', msg: { t: 'ufle' }, main: true }] };
    const frozen = s.kas === 'gormuyor' ? ' Görüntüsü donuk olduğu için onun yüzünü göremeyeceksin, ama o seni görecek.' : '';
    return { h: 'mum sayfası', t: `Işığını kapatmasını isteyecek. <b>Sen de kapat.</b> Bu ekranın parlaklığını aç ve kendine çevir: mum burada da yanacak, o da seni aydınlanmış görecek.${frozen}` };
  },
  kazi: (s) => ({
    h: 'ilk bileti kazıyor',
    t: s.kazilan && s.kazilan.length ? `Çıkan:${listCoupons(s)}` : 'Her çarpısı bir bilet oldu. Birini şimdi kazır, gerisi sona kalır. İtiraz yok.',
  }),
  karne: (s) => ({
    h: 'karnesine bakıyor',
    t: s.gorus ? 'Görüşün karnesine düştü. Ekran görüntüsü almasını söyle.' : 'Karnesinde "Sıra arkadaşının görüşü" satırı seni bekliyor. Aşağıya tek cümle yaz, senin elinle düşecek.',
  }),
  son: () => ({ h: 'son sayfada', t: 'Senin notunu okuyor. Sayfayı çevirirse arka kapak var. Eline sağlık.' }),
  arka: () => ({ h: 'arka kapakta', t: 'Çarpım tablosunu okuyor. Bitti.' }),
  kuponlar: () => ({ h: 'kuponlarına bakıyor', t: 'Bozdururken sana mesaj atar. Kaçış yok.' }),
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function listCoupons(s) {
  if (!s.kazilan || !s.kazilan.length) return '';
  return `<ul class="k-sinav">${s.kazilan.map((k) => `<li><span>${escapeHtml(k)}</span></li>`).join('')}</ul>`;
}

const K = {
  state: null,
  strokes: [],
  scene: null,

  init() {
    this.live = new Live({
      role: 'e',
      onMessage: (m) => this.onMessage(m),
      onPeer: () => this.renderStatus(),
      onReady: () => this.renderStatus(),
    });
    this.live.start();

    this.board = new Board($('tuval'), {
      me: 'e',
      send: (m) => this.live.send(m),
      onChange: (all) => { this.strokes = all; },
    });
    Crayons.build(this.board, $('tahtaAraclar'), Board.INK.e);

    $('notForm').onsubmit = (e) => {
      e.preventDefault();
      const text = $('notYazi').value.trim();
      if (!text) return;
      if (!this.live.peerOnline) {
        $('notDurum').textContent = 'Zeynep bağlı değil, gitmedi.';
        return;
      }
      this.live.send({ t: 'not', metin: text });
      $('notYazi').value = '';
      $('notDurum').textContent = 'gidiyor...';
      clearTimeout(this.noteTimer);
      this.noteTimer = setTimeout(() => { $('notDurum').textContent = 'ulaşmadı, bir daha dene.'; }, 4000);
    };

    $('gorusForm').onsubmit = (e) => {
      e.preventDefault();
      const text = $('gorusYazi').value.trim();
      if (!text) return;
      this.sendUntil({ t: 'gorus', metin: text }, () => this.state && this.state.gorus === text, () => {
        $('gorusDurum').textContent = 'ulaşmadı, bir daha dene.';
      });
      $('gorusDurum').textContent = 'gidiyor...';
    };

    const link = $('linkKopyala');
    link.textContent = SITE_LINK;
    link.onclick = async () => {
      try {
        await navigator.clipboard.writeText(SITE_LINK);
        link.textContent = 'kopyalandı';
        setTimeout(() => { link.textContent = SITE_LINK; }, 1600);
      } catch (e) {}
    };

    $('plan').innerHTML = PLAN.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('');

    $('simdi').addEventListener('click', (e) => {
      const b = e.target.closest('[data-msg]');
      if (!b) return;
      const msg = JSON.parse(b.dataset.msg);
      const label = b.textContent;
      b.disabled = true;
      b.textContent = '...';
      const fail = () => {
        b.disabled = false;
        b.textContent = label;
      };
      if (msg.t === 'yak') this.sendUntil(msg, () => this.state.mum === 'yandi' || this.state.mum === 'sondu', fail);
      else if (msg.t === 'ufle') this.sendUntil(msg, () => this.state.mum === 'sondu', fail);
      else {
        this.live.send(msg);
        setTimeout(fail, 1500);
      }
    });

    this.renderNow();
    setInterval(() => this.renderStatus(), 3000);
  },

  /* ---------- Portre dersi ---------- */
  async startPortrait() {
    if (this.portraitOn) return;
    this.portraitOn = true;
    this.pInbox = new StrokeInbox();
    this.pZ = null;
    $('portreKutu').hidden = false;
    $('portreSonuc').hidden = true;
    $('portreKutu').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!this.pBoard) {
      this.pBoard = new Board($('portreTuval'), { me: 'e', W: 1000, H: 1200 });
      Crayons.build(this.pBoard, $('portreAraclar'), Board.INK.e);
    }
    this.pBoard.resize();
    this.pBoard.active = false;
    const clock = $('portreSure');
    for (const n of ['3', '2', '1']) {
      clock.textContent = n;
      await sleep(800);
    }
    this.pBoard.active = true;
    let left = 60;
    clock.textContent = left;
    this.pTimer = setInterval(() => {
      left -= 1;
      clock.textContent = left;
      clock.classList.toggle('az', left <= 10);
      if (left <= 0) this.endPortrait();
    }, 1000);
  },

  endPortrait() {
    if (!this.portraitOn || this.pEnded) return;
    this.pEnded = true;
    clearInterval(this.pTimer);
    this.pBoard.active = false;
    $('portreYazi').textContent = 'Kalemler bırakılsın. Onunki geliyor...';
    this.live.send({ t: 'portre-son' });
    sendStrokes(this.live, 'portre', this.pBoard.export());
    this.pRevealTimer = setTimeout(() => this.revealPortraits(), 7000);
    if (this.pZ) this.revealPortraits();
  },

  revealPortraits() {
    if (this.pShown || !this.pEnded) return;
    this.pShown = true;
    clearTimeout(this.pRevealTimer);
    $('portreKutu').hidden = true;
    const wrap = $('portreKartlar');
    wrap.innerHTML = '';
    const cards = [[this.pBoard.export(), 'Zeynep. Çizen: Enes.', 'sol'], [this.pZ, 'Enes. Çizen: Zeynep.', 'sag']];
    $('portreSonuc').hidden = false;
    cards.forEach(([strokes, title, cls]) => {
      const c = el('div', `polaroid ${cls}`, '<div class="polaroid-yuz"><canvas></canvas></div><div class="polaroid-yazi"></div>');
      c.querySelector('.polaroid-yazi').textContent = title;
      wrap.append(c);
      const box = c.querySelector('.polaroid-yuz');
      Sketches.portrait(c.querySelector('canvas'), strokes, box.clientWidth, box.clientHeight, 1.8);
    });
    $('portreSonuc').scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  /* ---------- Kağıt uçak ---------- */
  receivePlane(strokes) {
    this.live.send({ t: 'ucak-ok' });
    if (this.planeShown) return;
    this.planeShown = true;
    const plane = el('div', 'ucak', UCAK_SVG);
    document.body.append(plane);
    plane.style.position = 'fixed';
    plane.style.zIndex = '130';
    const W = innerWidth, H = innerHeight;
    plane.animate([
      { transform: `translate(${-140}px,${H * 0.72}px) rotate(14deg) scale(.5)` },
      { transform: `translate(${W * 0.3}px,${H * 0.26}px) rotate(-14deg) scale(.9)`, offset: 0.55 },
      { transform: `translate(${W / 2 - 60}px,${H / 2 - 48}px) rotate(0deg) scale(1.15)` },
    ], { duration: 1500, easing: 'cubic-bezier(.3,.2,.3,1)', fill: 'forwards' });
    setTimeout(() => {
      plane.remove();
      this.openPlane(strokes);
    }, 1530);
  },

  openPlane(strokes) {
    const veil = el('div', 'k-ucak-perde');
    const paper = el('div', 'k-ucak-kagit', '<div class="k-ucak-baslik">Zeynep\'ten</div><canvas></canvas>');
    const close = el('button', 'kucuk-dugme k-ucak-kapat', 'kapat');
    paper.append(close);
    veil.append(paper);
    document.body.append(veil);
    const w = paper.clientWidth - 28;
    const h = Math.round((w * 420) / 1000);
    this.replay(paper.querySelector('canvas'), strokes, w, h);
    close.onclick = () => veil.remove();

    // Sayfada da kalsın, ekran görüntüsü alınabilsin.
    $('ucakKutu').hidden = false;
    const keep = $('ucakTuval');
    const kw = keep.parentElement.clientWidth - 20;
    const x = Sketches.fit(keep, kw, Math.round((kw * 420) / 1000));
    const s = kw / 1000;
    CakeArt.draw(x, strokes, { s, ox: 0, oy: 0, width: 2 });
  },

  // Çizgileri yazılma sırasıyla yeniden çizer: el yazısı gözünün önünde oluşur.
  replay(cv, strokes, w, h) {
    const x = Sketches.fit(cv, w, h);
    const s = w / 1000;
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.lineWidth = 2.2;
    x.strokeStyle = Board.INK.z;
    let si = 0, pi = 2;
    const frame = () => {
      let budget = 26;
      while (budget > 0 && si < strokes.length) {
        const p = strokes[si].pts;
        if (pi >= p.length) {
          si += 1;
          pi = 2;
          continue;
        }
        x.beginPath();
        x.moveTo(p[pi - 2] * s, p[pi - 1] * s);
        x.lineTo(p[pi] * s, p[pi + 1] * s);
        x.stroke();
        pi += 2;
        budget -= 1;
      }
      if (si < strokes.length) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },

  // Mesajlar teslim onayı almadan gider. Durum değişene kadar birkaç kez tekrar yollar.
  sendUntil(msg, done, onFail) {
    let tries = 0;
    const tick = () => {
      if (done()) return;
      if (tries++ >= 6) {
        if (onFail) onFail();
        return;
      }
      this.live.send(msg);
      setTimeout(tick, 900);
    };
    tick();
  },

  renderStatus() {
    const b = $('baglanti');
    const live = this.live;
    b.className = 'k-durum';
    if (live.peerOnline) {
      b.classList.add('acik');
      b.textContent = 'Zeynep bağlı';
    } else if (live.connected) {
      b.classList.add('yari');
      b.textContent = 'hat açık, Zeynep yok';
    } else {
      b.textContent = 'bağlanıyor';
    }
  },

  renderNow() {
    const s = this.state;
    const step = STEPS[s ? s.page : 'yok'] || STEPS.yok;
    const r = step(s || {});
    const actions = (r.a || [])
      .map((a) => `<button class="kucuk-dugme ${a.main ? 'ana' : ''}" data-msg='${JSON.stringify(a.msg)}'>${a.label}</button>`)
      .join('');
    $('simdi').innerHTML = `<h2>${r.h}</h2><p>${r.t}</p>${actions ? `<div class="k-eylem">${actions}</div>` : ''}`;
    if (this.objection) {
      $('simdi').insertAdjacentHTML('beforeend', `<p class="k-alinti">${this.objection}</p>`);
    }
    if (s && s.page === 'sinav' && this.imza && this.imza.length) {
      const wrap = el('p', 'k-imza', 'İmzası: ');
      const cv = el('canvas');
      wrap.append(cv);
      $('simdi').append(wrap);
      CakeArt.signature(cv, this.imza, 130, 48);
    }
    if (s && s.odev) {
      const line = el('p', 'k-odev', 'Ödevin: ');
      const t = el('span', 'k-alinti');
      t.textContent = s.odev;
      line.append(t);
      $('simdi').append(line);
    }
    $('gorusKutu').hidden = !(s && (s.page === 'karne' || s.gorus));
    if (s && s.gorus) {
      $('gorusDurum').textContent = 'karnesine düştü. düzeltmek istersen yeniden yaz.';
    }
    const onBoard = !!s && s.page === 'pasta';
    const wasHidden = $('tahta').hidden;
    $('tahta').hidden = !onBoard;
    if (onBoard && wasHidden) this.board.resize();
    this.board.active = onBoard && !s.candle;
    this.syncCandle();
  },

  syncCandle() {
    const s = this.state;
    if (!s) return;
    const wanted = s.page === 'mum' && (s.mum === 'yandi' || s.mum === 'sondu');
    if (wanted && !this.scene) this.openCandle();
    if (!wanted && this.scene) this.closeCandle();
    if (this.scene && s.mum === 'sondu') this.markOut();
  },

  openCandle() {
    const wrap = el('div', 'k-mum');
    document.body.append(wrap);
    document.documentElement.style.overflow = 'hidden';
    this.wrap = wrap;
    this.scene = new CandleScene(wrap, {
      strokes: this.board.export(),
      candle: this.state.candle,
    });
    this.scene.light();
    this.note = el('div', 'k-mum-yazi', 'Şimdi sen. Önce "iyi ki doğdun"u söyle, kötü olması serbest. Sonra kendi cümlelerin. Yüzü mum ışığında görünüyorsa ona söyle, kendisi göremiyor. En son "dilek tut, üfle" de. Üflediği an aşağıdaki düğmeye bas, alev onda da söner.');
    this.actions = el('div', 'k-mum-eylem');
    const blow = el('button', 'kucuk-dugme ana', 'üfledi');
    blow.onclick = () => {
      blow.disabled = true;
      blow.textContent = 'söndürülüyor...';
      this.sendUntil({ t: 'ufle' }, () => this.state.mum === 'sondu', () => {
        blow.disabled = false;
        blow.textContent = 'üfledi';
        this.note.classList.remove('gizli');
        this.note.textContent = 'Ona ulaşmadı. Parmağını alevin üstüne koymasını söyle, ya da tekrar bas.';
      });
    };
    const hide = el('button', 'kucuk-dugme', 'yazıyı gizle');
    hide.onclick = () => {
      const hidden = this.note.classList.toggle('gizli');
      hide.textContent = hidden ? 'yazıyı göster' : 'yazıyı gizle';
    };
    this.actions.append(blow, hide);
    wrap.append(this.note, this.actions);
  },

  markOut() {
    if (!this.scene || this.scene.phase === 'out') return;
    this.scene.blow();
    this.note.textContent = 'Söndü. Birkaç saniye konuşma.';
    this.note.classList.remove('gizli');
    this.actions.innerHTML = '';
    const close = el('button', 'kucuk-dugme', 'kapat');
    close.onclick = () => this.closeCandle();
    setTimeout(() => this.actions.append(close), 9000);
  },

  closeCandle() {
    if (!this.scene) return;
    this.scene.destroy();
    this.wrap.remove();
    document.documentElement.style.overflow = '';
    this.scene = null;
  },

  onMessage(m) {
    switch (m.t) {
      case 'state':
        this.state = m.s;
        if (m.s.page !== 'sinav') this.objection = null;
        this.renderNow();
        break;
      case 'hello':
        this.renderStatus();
        break;
      case 'not-ok':
        clearTimeout(this.noteTimer);
        $('notDurum').textContent = 'ulaştı.';
        this.noteTimer = setTimeout(() => { $('notDurum').textContent = ''; }, 2500);
        break;
      case 'imza':
        this.imza = m.st;
        this.renderNow();
        break;
      case 'portre-basla':
        this.startPortrait();
        break;
      case 'portre-son':
        this.endPortrait();
        break;
      case 'portre':
        this.pInbox = this.pInbox || new StrokeInbox();
        if (this.pInbox.add(m)) {
          this.pZ = this.pInbox.result();
          this.revealPortraits();
        }
        break;
      case 'ucak':
        this.planeInbox = this.planeInbox || new StrokeInbox();
        if (this.planeInbox.add(m)) this.receivePlane(this.planeInbox.result());
        break;
      case 'itiraz-sonuc':
        this.objection = m.nazik ? 'İtirazın nazikçe reddedildi.' : 'İtirazın reddedildi.';
        this.renderNow();
        break;
      case 'bozdu':
        $('notDurum').textContent = `Kupon bozdurdu: ${m.metin}${m.zaman ? ` (ne zaman: ${m.zaman})` : ''}`;
        break;
      case 'd':
      case 'de':
      case 'du':
      case 'dall':
        this.board.receive(m);
        break;
      default:
    }
  },
};

window.addEventListener('DOMContentLoaded', () => K.init());
