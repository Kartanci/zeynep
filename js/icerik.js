// Kişiye özel metinlerin hepsi burada. Bir şeyi değiştirmek istersen sadece bu dosyaya dokun.
const ICERIK = {
  // Kapakta ve birkaç yerde daha geçer.
  yas: 25,

  // Zeynep bunları sana sesli soracak. Puanların toplamı 100 olmalı.
  // bos: true olan satır "müfredat dışı": kağıtta soru yok, Zeynep aklına geleni kendisi sorar.
  sorular: [
    { metin: '"Ne yiyelim?" diye sorduğunda ben ne derim?', puan: 10 },
    { metin: 'Kahvemi nasıl içerim?', puan: 10 },
    { metin: 'Seninle ilk konuştuğumuz gün ne konuştuk?', puan: 15 },
    { metin: 'Beni güldürmenin en garanti yolu ne?', puan: 15 },
    { bos: true, puan: 10 },
    { metin: 'Bende en sevdiğin şey ne? (Bu soru 40 puan. Acele etme.)', puan: 40 },
  ],

  // Kazı kazan biletleri. Zeynep bunları gerçekten bozdurabilir, altına imza atmış gibi düşün.
  // Listenin son maddesi her zaman son bilet olarak çıkar.
  kuponlar: [
    '1 kez "haklıydın" dedirtme hakkı. Geçmişe dönük de olur.',
    'Bir hafta "ne yiyelim" sorusu yok. Enes karar verecek.',
    'Gecenin 3\'ünde arama hakkı. Açacak.',
    'Film seçme hakkı. Enes sonuna kadar uyumayacak.',
    'Enes\'in telefonu bir akşam boyunca ters duracak.',
    'İstediğin bir şarkıyı sana söyleyecek. Bu sefer de kötü.',
    'Bir sonraki görüşmede uzun bir sarılma. Süreye sen karar verirsin.',
  ],

  // Son sayfadaki not. En iyisi buraya kendi cümlelerini yazman.
  enesNotu: [
    'Zeynep,',
    'uzun yazmayacağım. söyleyeceğimi az önce söyledim. söyleyemediysem bir daha ararım.',
    'bu defter sende kalsın.',
  ],

  // Arka kapaktaki çarpım tablosunun yanına el yazısıyla düşülen notlar (yaş x 1, x 2, x 3, x 4).
  carpim: [
    'bugün',
    'hâlâ "ne yiyelim" diyeceğiz',
    'hâlâ sen haklı olacaksın',
    'mum sığmayacak. yine bir tane dikeriz',
  ],
};
