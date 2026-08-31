# Fiyat Teklifi Oluşturucu

Yerel çalışan, kurulum gerektirmeyen teklif hazırlama uygulaması.
Sol tarafta düzenleme paneli, sağda gerçek zamanlı A4 önizleme; çıktı PDF.

## Kurulum

Tek gereksinim **Node.js** (https://nodejs.org — LTS sürümü yeterli). Başka hiçbir
paket kurulmaz: `npm install` yok, `package.json` yok, Python gerekmiyor.
Sunucu yalnızca Node'un kendi modüllerini kullanır (`http`, `fs`, `path`).

### macOS'ta ilk kurulum

1. **Node.js** kurun — https://nodejs.org (LTS) veya `brew install node`.
   Kontrol: Terminal'de `node --version` bir sürüm yazdırmalı.
2. Proje klasörünü Mac'e kopyalayın.
3. Terminal'de klasöre girip başlatıcıya çalıştırma izni verin (bir kez):
   ```
   chmod +x baslat.command
   ```
4. Klasörü internetten/AirDrop ile aldıysanız macOS karantinaya alabilir
   ("geliştirici doğrulanamadı"). İki çözümden biri: dosyaya **sağ tık → Aç**,
   ya da bir kez:
   ```
   xattr -dr com.apple.quarantine .
   ```
5. Artık `baslat.command` dosyasına çift tıklamak yeterli.

Windows'ta kurulum yok: Node.js kuruluysa `baslat.bat` doğrudan çalışır.

### Aynı çıktıyı almak için

Mac ve Windows'ta **Chrome (veya Edge)** kullanın. PDF'teki tıklanabilir
bağlantılar ve dosya adının teklif numarasıyla gelmesi bu tarayıcılarda
garanti; Safari'de yazdırma penceresi farklı davranabilir.

Belgenin yazı tipi (Source Sans 3) Google Fonts'tan çekilir. İnternet yoksa
sistem yazı tipine düşer — belge yine düzgün çıkar ama harfler Windows ile
Mac arasında bir tık farklı görünebilir. Tamamen çevrimdışı ve her makinede
birebir aynı çıktı isterseniz yazı tipleri projeye gömülebilir.

## Çalıştırma

**Windows** — `baslat.bat` dosyasına çift tıklayın.
**macOS** — Terminalde bir kez `chmod +x baslat.command` çalıştırın, sonra dosyaya çift tıklayın.

Tarayıcı `http://localhost:8787` adresinde otomatik açılır. Uygulamayı kapatmak için
açılan siyah/terminal penceresini kapatın.

> Node.js kurulu değilse uygulama yine açılır ama teklifler dosyaya değil yalnızca
> tarayıcı belleğine yazılır; panelde turuncu bir uyarı görürsünüz.

## PDF çıktısı

Sağ üstteki **PDF Olarak Kaydet** düğmesi (veya `Ctrl/Cmd + P`) tarayıcının
yazdırma penceresini açar.

- **Hedef / Yazıcı:** `PDF olarak kaydet`
- **Kağıt:** A4, **Kenar boşlukları:** Yok / None
- **Arka plan grafikleri** işaretli olsun (mavi başlık bandı için)
- **Üstbilgi ve altbilgi** işaretini kaldırın (tarih/URL basılmasın)

Bu ayarlar bir kez yapıldığında tarayıcı hatırlar.

**Dosya adı otomatik gelir.** Kaydetme penceresinde "Dosya adı" alanı teklif
numarasıyla dolu olur (`2026-002.pdf`). Tarayıcı bu adı sayfa başlığından aldığı
için uygulama çıktı anında başlığı geçici olarak teklif numarası yapar, yazdırma
bitince eski hâline döner. Chrome ve Edge'de çalışır.

### Çıktıdan sonra ne olur

PDF penceresi kapanınca uygulama teklifi **Kayıtlı** listesine arşivler ve
müşteri/proje/kalem alanlarını sıfırlayarak **bir sonraki sıra numarasıyla**
(`2026-001` → `2026-002`) yeni bir teklif açar. Firma ve referans bilgileri
elbette olduğu gibi kalır. Yanlışlıkla olduysa ekranın altında beliren
**Geri al** bağlantısı 9 saniye boyunca eski teklife döndürür.

### Eski bir teklifi yeniden yazdırmak

Bu arşivleme/sıfırlama yalnızca bir teklifin **ilk** çıktısında çalışır.
**Kayıtlı** listesinden eski bir teklifi açıp tekrar PDF alırsanız hiçbir şey
değişmez: sayaç ilerlemez, yeni teklif açılmaz, liste sırası bozulmaz, teklifin
kendisine dokunulmaz. Ekranda "yeniden yazdırıldı · sayaç ve kayıtlar değişmedi"
yazar; dosya adı yine o teklifin numarasıdır.

### Teklif numarası

Numara, `storage.json` içindeki sayaçtan gelir (`counter`) ve **ancak gerçekten
kullanıldığında ayrılır**:

- Boş bir teklifte panelde sıradaki numara görünür ama sayaç ilerlemez.
- Numara, teklife ilk bilgiyi girdiğiniz anda kesinleşir; hiçbir şey
  girmeden çıktı alırsanız da basılmadan hemen önce ayrılır.
- Boş teklifteyken **Yeni**'ye kaç kez basarsanız basın numara harcanmaz —
  aynı boş teklife dönersiniz.
- Yıl değişince `2027-001`'den yeniden başlar.

**Sayacı elle ayarlamak:** Teklif sekmesinde "Teklif Bilgileri" başlığının
yanındaki **Sayaç** düğmesi. Bir sonraki numaranın kaç olacağını sorar; geriye
de alabilirsiniz. İstediğiniz numara kayıtlı bir teklifte kullanılıyorsa
uygulama bunu söyler ve ilk boş numaraya geçer — aynı numara iki kez verilmez.

Numarayı elle değiştirirseniz sayaç oradan devam eder (`2026-100` yazarsanız
sıradaki `2026-101` olur). Sayaç herhangi bir sebeple geride kalsa bile mevcut
tekliflerin en büyük numarası hesaba katıldığı için aynı numara iki kez verilmez.

### Bağlantılar

Telefon, e-posta, web sitesi ve sosyal medya satırları PDF içinde
**tıklanabilir** olarak gömülür (Chrome/Edge). Sosyal medyada ikonun yanında
adresin son bölümü yazar: `instagram.com/oren-muhendislik` → `oren-muhendislik`.

## Paneller

| Sekme | İçerik | Kapsam |
|---|---|---|
| **Teklif** | Teklif no, tarih, müşteri, proje, kalemler, indirim/KDV, not | Her teklifte değişir |
| **Firma** | Üst bant yazısı, logo + **logo boyutu**, slogan, telefon/adres/e-posta/web, sosyal medya, imza, vurgu rengi | Sabit — bir kez doldurulur |
| **Referans** | Referans logoları, sütun sayısı, logo boyutu | Sabit — bir kez doldurulur |
| **Kayıtlı** | Geçmiş teklifler (aç / kopyala / sil), yedek al-yükle | — |

Kalem satırlarında **Maliyet = Miktar × Birim Fiyat** olarak otomatik hesaplanır;
alt toplam, indirim, KDV ve genel toplam belgeye kendiliğinden yansır.
KDV yalnızca **"KDV ekle"** kutusu işaretliyken eklenir; panelin altındaki
özet kutusu her an alt toplamı, KDV'yi ve genel toplamı gösterir.

## Veri saklama

Firma bilgileri, referanslar ve **tüm teklifler tek bir dosyada** tutulur:

```
data/storage.json          ← veri tabanı
data/backups/              ← her gün için bir otomatik yedek (son 30 gün)
```

Her değişiklik yarım saniye içinde diske yazılır. Yazma işlemi önce geçici
dosyaya yapılıp sonra yerine taşındığı için elektrik kesilse bile dosya
bozulmaz. Hiçbir şey internete gönderilmez; sunucu yalnız `127.0.0.1`
üzerinde dinler.

Sağ üstteki durum yazısı nereye kaydedildiğini söyler:
**"Kaydedildi · storage.json"**. Orada `tarayıcı belleği` yazıyorsa Node.js
çalışmıyor demektir — o hâlde veriler dosyaya değil tarayıcıya yazılır.

**Yedekleme / taşıma:** `data/` klasörünü kopyalamanız yeterli. Dilerseniz
**Kayıtlı → Dışa Aktar** ile tek `.json` dosyası alıp başka makinede
**İçe Aktar** ile yükleyebilirsiniz.

## Kısayollar

| Tuş | İşlev |
|---|---|
| `Ctrl/Cmd + P` | PDF çıktısı |
| `Ctrl/Cmd + S` | Kaydet |

## Dosya yapısı

```
index.html          Arayüz iskeleti
css/app.css         Panel ve önizleme arayüzü
css/doc.css         A4 belge tasarımı + yazdırma kuralları
js/store.js         Veri modeli, kayıt, para/tarih yardımcıları
js/doc.js           Belgenin HTML çıktısı
js/app.js           Panel etkileşimleri, önizleme, PDF
server.js           Yerel sunucu + JSON veri tabanı (bağımlılıksız Node)
data/storage.json   Veriler (ilk çalıştırmada oluşur)
baslat.bat          Windows başlatıcı
baslat.command      macOS başlatıcı
```

## Önizleme

Uygulama **%110** ölçekle açılır. Araç çubuğundaki **−/+** ile ölçeği değiştirir,
**Sığdır** ile sayfanın tamamını ekrana oturtursunuz. Yakınlaştırdığınızda önizleme
dikey olarak kaydırılabilir; yazarken ölçek kendiliğinden değişmez.
Açılış ölçeği `js/app.js` içindeki `DEFAULT_ZOOM` sabitiyle ayarlanır.
