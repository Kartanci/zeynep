// Enes'in sayfası: Zeynep'in ne yaptığını görür, sırası gelince çizer, mumu yakar, not atar.
const SITE_LINK = new URL('./', location.href).href;
const $ = (id) => document.getElementById(id);

const PLAN = [
  ['Kapak', 'Defteri açar. "Ne defteri?" derse "aç bak" de.'],
  ['Psst', 'Site ona senden habersizmiş gibi kaşını kaldırmasını söyler. Kaşını kaldırıp sana bakacak. "Ne oldu?" de, hiçbir şey bilmiyormuş gibi yap.'],
  ['Sınav', 'Zeynep öğretmen, sen öğrencisin. Soruları sana sesli okur, cevabını dinleyip tik ya da çarpı atar. Biri müfredat dışı: kağıtta soru yok, aklına geleni soracak. Son soru 40 puan: "Bende en sevdiğin şey ne?" Burada gerçek bir cevap ver. Sonunda imzalayıp sana ödev verir, ödev buraya düşer.'],
  ['Teneffüs', '3-2-1\'de ikiniz aynı anda bir kelime söylersiniz. Tutmazsa o iki kelimenin ortasını bulmaya çalışırsınız. Dördüncü turdan sonra "zil çaldı" deyip geçebilir.'],
  ['Pasta', 'Pasta yok, birlikte çizersiniz. O mavi, sen kırmızı. Bu sayfada tahta açılır, çizdiğin anında onda da görünür.'],
  ['Mum', 'Işığı kapatır. Telefonunun ekranı odadaki tek ışık olur, yani sen onun yüzünü mum ışığında görürsün. Mumu sen yakarsın, şarkıyı sen söylersin, o üfler, üflediğini görünce düğmeye basarsın.'],
  ['Kazı kazan', 'Sınavda attığı her çarpı bir bilet. Çıkan kuponlar gerçek, sonradan bozdurabilir. Vermek istemediğin varsa baştan söyle, çıkarayım.'],
  ['Karne', 'Akşamın sonuçlarını karnede görür. "Bir üst yaşa geçmiştir." <b>Burada sıra sende:</b> karnesine tek cümle görüş yazacaksın, senin elinle düşecek.'],
  ['Son sayfa', 'Senin notun. Altındaki p.s. kopya kağıdını ele veriyor, hazır ol. Sayfayı çevirirse arka kapakta 25 ile çarpım tablosu var.'],
];

const STEPS = {
  yok: () => ({ h: 'henüz açmadı', t: 'Görüşmeyi başlat, linki at. Açınca burası kendiliğinden değişir.' }),
  kapak: () => ({ h: 'kapakta', t: 'Açmasını bekle. "Ne defteri?" derse "aç bak" de.' }),
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
    if (o.bitti) return { h: o.pes ? 'pes ettiniz' : `${o.tur}. turda buldunuz`, t: o.kelime ? `Kelimeniz: <span class="k-alinti">${escapeHtml(o.kelime)}</span>. Karneye yazılacak.` : 'Karneye yazılacak.' };
    return { h: `${o.tur}. tur`, t: o.sayiyor ? '<span class="k-alinti">Sayıyor. Hazır ol.</span>' : 'Aynı kelime mi çıktı, o işaretliyor.' };
  },
  pasta: (s) => ({
    h: s.candle ? 'mumu dikti' : 'pastayı çizin',
    t: s.candle ? 'Sıra mumda. Sayfayı çevirince ışığı kapatmasını isteyecek. <b>Sen de kapat</b>, bu ekranın parlaklığını aç.' : 'Sen kırmızısın. Aşağıdaki tahtaya çizdiğin anında onda görünür, onunkini de burada görürsün.',
  }),
  mum: (s) => {
    if (s.mum === 'karanlik') return { h: 'karanlıkta bekliyor', t: 'Mumu sen yakıyorsun.', a: [{ label: 'mumu yak', msg: { t: 'yak' }, main: true }] };
    if (s.mum === 'sondu') return { h: 'söndü', t: 'Birkaç saniye konuşma. Karanlık olsun.' };
    if (s.mum === 'yandi') return { h: 'mum yanıyor', t: 'Sıra sende. Şarkı, sonra kendi cümlelerin, sonra "dilek tut, üfle".', a: [{ label: 'üfledi', msg: { t: 'ufle' }, main: true }] };
    const frozen = s.kas === 'gormuyor' ? ' Görüntüsü donuk olduğu için onun yüzünü göremeyeceksin, ama o seni görecek.' : '';
    return { h: 'mum sayfası', t: `Işığını kapatmasını isteyecek. <b>Sen de kapat.</b> Bu ekranın parlaklığını aç ve kendine çevir: mum burada da yanacak, o da seni aydınlanmış görecek.${frozen}` };
  },
  kazi: (s) => ({
    h: 'bilet kazıyor',
    t: s.kazilan && s.kazilan.length ? `Çıkanlar:<ul class="k-sinav">${s.kazilan.map((k) => `<li><span>${escapeHtml(k)}</span></li>`).join('')}</ul>` : 'Her çarpısı bir bilet oldu. Kupon çıktıkça buraya düşer. İtiraz yok.',
  }),
  karne: (s) => ({
    h: 'karnesine bakıyor',
    t: s.gorus ? 'Görüşün karnesine düştü. Ekran görüntüsü almasını söyle.' : 'Karnesinde "Sıra arkadaşının görüşü" satırı seni bekliyor. Aşağıya tek cümle yaz, senin elinle düşecek.',
  }),
  son: () => ({ h: 'son sayfada', t: 'Senin notunu okuyor. P.S. seni ele veriyor: kopya kağıdın olduğunu öğrendi. Sayfayı çevirirse arka kapak var. Eline sağlık.' }),
  arka: () => ({ h: 'arka kapakta', t: 'Çarpım tablosunu okuyor. Bitti.' }),
  kuponlar: () => ({ h: 'kuponlarına bakıyor', t: 'Bozdururken sana mesaj atar. Kaçış yok.' }),
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    $('geriAl').onclick = () => this.board.undo();
    $('fosforlu').onclick = (e) => {
      this.board.tool = this.board.tool === 'p' ? 'f' : 'p';
      e.currentTarget.classList.toggle('secili', this.board.tool === 'f');
    };

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
      case 'itiraz-sonuc':
        this.objection = m.nazik ? 'İtirazın nazikçe reddedildi.' : 'İtirazın reddedildi.';
        this.renderNow();
        break;
      case 'bozdu':
        $('notDurum').textContent = `Kupon bozdurdu: ${m.metin}`;
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
