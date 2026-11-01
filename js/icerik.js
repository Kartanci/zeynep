// Kişiye özel metinlerin hepsi burada. Bir şeyi değiştirmek istersen sadece bu dosyaya dokun.
const ICERIK = {
  // Kapakta ve birkaç yerde daha geçer.
  yas: 25,

  // Zeynep bunları sana sesli soracak. Puanların toplamı 100 olmalı.
  // bos: true olan satır "müfredat dışı": kağıtta soru yok, Zeynep aklına geleni kendisi sorar.
  sorular: [
    { metin: 'İlk buluştuğumuz kafe neresi?', puan: 10 },
    { metin: 'İlk beraber izlediğimiz dizi?', puan: 10 },
    { metin: 'En sevdiğim aktivite ne?', puan: 15 },
    { metin: 'En sevdiğim yemek ne?', puan: 15 },
    { bos: true, puan: 10 },
    { metin: 'Bende en sevdiğin şey ne? (Bu soru 40 puan. Acele etme.)', puan: 40 },
  ],

  // Kazı kazan biletleri. Zeynep bunları gerçekten bozdurabilir, altına imza atmış gibi düşün.
  // Listenin son maddesi her zaman son bilet olarak çıkar.
  kuponlar: [
    '1 kez "haklıydın" dedirtme hakkı. Geçmişe dönük de olur.',
    'İstanbul\'a gittiğinizde istediğin bir şeyi hediye olarak alma hakkı.',
    'Film seçme hakkı. Enes sonuna kadar uyumayacak.',
    'Bir gün boyunca ne istersen yapacak (gerçekten ne istersen).',
    'Bir gün istediğin kadar AVM\'de seninle beraber gezecek.',
    'Bir sonraki görüşmede uzun bir sarılma. Süreye sen karar verirsin.',
  ],

  // Son sayfadaki not. En iyisi buraya kendi cümlelerini yazman.
  enesNotu: [
    'Canım sevgilim,',
    'İyi ki doğdun, iyi ki benimsin. Ben seninle hayat buldum. Seni çok ama çok seviyorum.',
    'Dünya bir yana, sen bir yana...',
  ],

  // Arka kapaktaki çarpım tablosunun yanına el yazısıyla düşülen notlar (yaş x 1, x 2, x 3, x 4).
  carpim: [
    'yaşın bugün',
    'yaşında hâlâ "ne yiyelim" diyeceğiz',
    'yaşında hâlâ sen haklı olacaksın',
    'yaşında mum sığmayacak, yine bir tane dikeriz',
  ],
};
