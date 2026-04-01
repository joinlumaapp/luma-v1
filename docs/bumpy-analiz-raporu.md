# BUMPY - Detayli Rakip Analiz Raporu

> Tarih: 1 Nisan 2026
> Uygulama: Bumpy - International Dating
> Gelistirici: Bumpy Inc. (Kurucular: Mark Prutskyi - CEO, Valentyn Berehovyi - CTO)
> Merkez: Kyiv, Ukrayna
> Kurulis: 2020
> Kullanici Sayisi: 20+ milyon
> Indirme Sayisi: 14+ milyon
> Puan: Google Play 4.35/5 (350K degerlendirme), App Store 4.57/5 (28K degerlendirme)
> Marka Rengi: Acik mavi / turkuaz, beyaz kalp logosu ("p" harfinin ustunde kalp)
> Boyut: ~60 MB (Android), iOS 14.6+ gerektirir, Android 7.0+ gerektirir
> Son Guncelleme: Mart 2026 (v2.6.35)

---

## 1. GENEL BAKIS

Bumpy, 150'den fazla ulkede faaliyet gosteren, uluslararasi dating odakli bir uygulamadir. Farklilasmasi:
- **Uluslararasi odak** — Tinder/Bumble gibi yerel degil, global matching
- **Otomatik ceviri** — 133 dilde anlik mesaj cevirisi
- **Harita ozelligi** — Dunya haritasi uzerinden ulke bazli profil kesfi
- **Yuksek dogrulama orani** — %90 kullanici foto-dogrulanmis
- **Ucretsiz video/sesli arama** — Sifrelenmis

---

## 2. KAYIT / ONBOARDING SURECI

Kayit adimlari (hizli, minimal):

1. **Giris Yontemi**: Google hesabi veya e-posta ile kayit
2. **Telefon Dogrulama**: Onay kodu ile dogrulama
3. **Temel Bilgiler**: Isim, dogum tarihi, cinsiyet
4. **Fotograf Yukleme**: Maksimum 6 fotograf/video yuklenebilir
5. **Niyet Secimi**: "Bumpy'de ne ariyorsun?" — 5 secenek:
   - Iliski (Relationship)
   - Arkadaslik (Friendship)
   - Seyahat Arkadaslari (Travel Buddies)
   - Sadece Sohbet (Just a Conversation)
   - (5. secenek tam olarak belirlenemedi, muhtemelen "Not Sure / Emin Degilim")
6. **Cinsiyet Tercihi**: Erkek, Kadin veya Her ikisi
7. **Yuz Dogrulama**: Bir kac kaydirmadan sonra selfie taramasi isteniyor

**Karsilastirma (LUMA):** LUMA'nin 3 intention tag'i (Serious Relationship, Exploring, Not Sure) var. Bumpy 5 secenek sunuyor — arkadaslik ve seyahat arkadasligi ek olarak mevcut.

---

## 3. PROFIL ALANLARI

### Temel Profil Bilgileri
- **Isim**
- **Yas** (dogum tarihinden hesaplaniyor)
- **Cinsiyet**
- **Konum** (ulke/sehir)
- **Bio / Hakkimda** (kisa metin)

### Detayli Profil Bilgileri
- **Ne ariyorsun** (5 intention secenegi)
- **Ilgi alanlari / Hobiler** (interests)
- **Din / Inanc** (religion)

### EKSiK OLAN ALANLAR (Diger uygulamalara kiyasla)
Bumpy'nin profil alanlari oldukca **minimalist**:
- Boy YOK
- Egitim YOK
- Meslek YOK
- Yasam tarzi secenekleri YOK (icme, sigara, spor)
- Cikis tagi / prompt cevaplari YOK
- Astroloji / burc YOK
- Cocuk durumu YOK
- Siyasi gorus YOK

**Karsilastirma (LUMA):** LUMA 45 soru ve 19 kategori ile cok daha derin profil sistemi sunuyor. Bumpy'nin eksikligi LUMA icin buyuk avantaj.

---

## 4. FOTOGRAFLAR VE MEDYA

- **Maksimum 6 fotograf/video** yuklenebilir (toplam limit, ayri degil)
- Video yuklenebilir (sinirlari belirtilmemis)
- Profil fotosu zorunlu
- Yuz dogrulama icin selfie alinir
- Foto dogrulama badge'i profilde gorulur

---

## 5. EKRANLAR VE NAVIGASYON

### Ana Navigasyon (Alt Bar)
Tam tab isimleri ve ikonlar belgelemede net degildir, ancak su bolumler tespit edildi:

1. **Kesif / Discovery Ekrani** (Ana ekran)
   - Profiller tek tek gosterilir (kart formati)
   - 3 aksiyon butonu:
     - **X (Kapat)** — Profilden gec / ignore
     - **Kalp (Heart)** — Begen / like
     - **El Sallama (Wave/Hand)** — Merhaba de / say hello
   - Asagi kaydirildiginda: bio, ilgi alanlari, konum, dogrulama durumu gorunur
   - Profil verifiye ise badge gorunur

2. **Harita / Globe Ekrani** (Dunya ikonu)
   - Interaktif dunya haritasi
   - Ulke bazli profil arama
   - Cesetli ulkelerdeki profillerin listesi
   - Bir profil secip kalp gonderebilirsiniz

3. **Mesajlar / Chat Ekrani** (Son tab)
   - Tum sohbetlerin listesi
   - Aktif konusmalar
   - Mesaj okuma bildirimi (read receipt) — Bumpy bu ozelligi sunuyor
   - Buz kirici mesaj onerileri (ice-breaker suggestions)

4. **Begeniler / Likes Ekrani** (detay eksik)
   - Sizi begenen profiller
   - Ucretsiz kullanicilar reklam izleyerek gorebilir
   - Gold abone gorebilir

5. **Profil / Ayarlar** (detay eksik)

### Onemli NOT:
Bumpy'nin tam navigasyon yapisi (kac tab, hangi ikonlar) hakkinda kesin bilgi sinirlidir. Yukaridaki 3-4 ana alan dogrulanmis durumdadir.

---

## 6. ESLESTIRME VE ETKILESIM SISTEMI

### Swipe / Kaydirma Mekaniigi
- **Sola kaydirma** = Gecme (pass)
- **Saga kaydirma** = Begeni (like)
- **X butonu** = Ignore
- **Kalp butonu** = Like
- **El sallama butonu** = Hello/Wave

### Eslestirme (Match)
- Karsilikli begeni (mutual like) gerekli
- Wave + karsilik = match
- Match sonrasi sohbet baslatiilabilir
- Ice-breaker mesaj onerileri sunulur

### Iltifat Ozelligi (Compliment Feature)
- Like gonderirken iltifat yazabilirsiniz
- Konusmaya baslamaya cekiniyorsaniz iltifat gonderme secenegi
- Gold abonelikte mevcut

### Mesaj Okuma Bildirimi (Read Receipt)
- Bumpy, karsi tarafin mesajinizi okuyup okumadigini gosterir
- Bu FARKLI bir ozellik — cogu rakip (Bumble, Tinder) bunu sunmaz

---

## 7. MESAJLASMA / CHAT OZELLIKLERI

- **Ucretsiz sinirsiz mesajlasma** (match sonrasi)
- **Otomatik ceviri** — 2 seviye:
  - **Pro Translator**: 133 dilde yuksek kaliteli ceviri (ucretli)
  - **Beginner Translator**: Temel konusmalarda iyi kaliteli ceviri (ucretsiz)
- **Video arama** — Ucretsiz, sifrelenmis
- **Sesli arama** — Ucretsiz
- **Buz kirici onerileri** — Match sonrasi uygulama baslangic mesaji onerir
- **Mesaj okuma bildirimi** — Karsi taraf mesaji okudu mu gosterir

**Karsilastirma (LUMA):** LUMA henuz video/sesli arama planlamiyor (V1'de). Bumpy'nin ceviri ozelligi LUMA'nin global vizyon icin ilham verici.

---

## 8. FILTRELER

Bumpy'nin filtre sistemi **oldukca sinirli**:

### Mevcut Filtreler
- **Yas araligi**
- **Cinsiyet tercihi** (Erkek / Kadin / Her ikisi)
- **Kita secimi**: Afrika, Asya, Avrupa, Kuzey Amerika, Guney Amerika, Avustralya
- **Ulke secimi** (harita uzerinden)
- **Yerel / Uluslararasi** dating secimi

### OLMAYAN Filtreler
- Mesafe/yakinlik filtresi YOK
- Din filtresi YOK
- Boy filtresi YOK
- Egitim filtresi YOK
- Cocuk durumu filtresi YOK
- Yasam tarzi filtresi YOK
- Dogrulama filtresi YOK

Kullanici sikayetleri: "Tek yapabildiginiz yas ve cinsiyet secmek" — bu ciddi bir eksiklik.

**Gold Abone ek filtreleri:** "Gelismis filtreler" (advanced filters) Gold ozelligi olarak sunuluyor ama detaylari belirsiz.

**Karsilastirma (LUMA):** LUMA'nin 19 kategori filtresi Bumpy'ye kiyasla cok ustun.

---

## 9. PREMIUM SISTEM VE FIYATLANDIRMA

### Bumpy Gold Abonelik
- **Haftalik**: $4.99 - $9.95 (bolgeye gore degisir, ~$13.81/hafta da rapor edildi)
- **Aylik**: $9.99'dan baslayan
- **3 Aylik**: ~£37.99

### Bumpy Gold Ozellikleri
- Sinirsiz swipe/kaydirma
- Sizi begenen kisileri gorme
- Swipe geri alma (Undo)
- Begenilerle iltifat gonderme
- Gelismis filtreler
- Reklamsiz deneyim

### Ek Satin Alimlar (A La Carte)
| Urun | Fiyat |
|------|-------|
| 1 Like | $0.99 |
| 5 Like | $3.99 (tahmini) |
| 25 Like | $15.99 |
| 1 Boost | $1.99 |
| 5 Boost | $7.99 (tahmini) |
| 20 Boost | $30.99 |
| 10K TR Coins | $1.14 |
| 50K TR Coins | $4.99 (tahmini) |
| 200K TR Coins | $11.95 |

### TR Coins (Ceviri Parasi)
- Pro Translator'u kullanmak icin harcanir
- Mesaj cevirileri icin kullanilir

### Ucretsiz Ozellikler
- Swipe/kaydirma (sinirli)
- Match sonrasi sinirsiz mesajlasma
- Video ve sesli arama
- Harita ozelligi (gorunurluk)
- Beginner Translator (temel ceviri)
- **Her saat ucretsiz Like kazanma** (reklam izleyerek)
- Reklam izleyerek sizi begenen kisileri gorme

### Monetizasyon Modeli
- Freemium + In-app purchases + Rewarded Ads
- Adaptfy paywall sistemi kullaniliyor
- Tahmini aylik gelir: ~$300K (ABD, Nijerya, Filipinler merkezli)

**Karsilastirma (LUMA):** LUMA'nin 4 paket sistemi (Free, Gold, Pro, Reserved) Bumpy'nin tek katmanli Gold'una kiyasla daha katmanli ve stratejik.

---

## 10. DOGRULAMA / VERIFICATION SISTEMI

### Foto Dogrulama Sureci
1. Rastgele bir poz ornegi gosterilir
2. Kullanici o pozu taklit ederek selfie ceker
3. Gercek bir kisi tarafindan incelenir (manual verification)
4. Birkac dakika icinde onay veya ret sonucu
5. Dogrulama badge'i profilde goruntulenir

### Anti-Fraud (Dolandiricilik Onleme) Sistemi
- Mobil bilgi fingerprint'i
- Supheli kullanici davranisi tespiti
- Spam tespiti
- Kisisel dogrulama limitleri
- Yuz tanima teknolojisi

### Dogrulama Oranlari
- %90 kullanici dogrulanmis (resmi iddia)
- Gercek kullanici deneyimi: ~%70 gercek, ~%30 sahte (bagimsiz raporlar)

---

## 11. GUVENLIK OZELLIKLERI

- **Foto dogrulama** (yuz taramasi)
- **Profil raporlama** (supheli hesaplar icin)
- **Engelleme** (block) ozelligi
- **Spam tespiti**
- **Sifrelenmis video aramalar**
- **SSL Encryption** (veri iletimi)
- **OAuth 2.0** (kimlik dogrulama)
- **GDPR uyumlu** (veri gizliligi)
- **Destek e-posta**: support@bumpy.app

### Eksiklikler (Kullanici Sikayetleri)
- Hesap silme secenegi bulmak zor / bazen mumkun degil
- Musteri hizmetleri cevap vermiyor (10+ kez iletisime gecen kullanicilar)
- Bazi sahte profiller dogrulama sonrasi fotograf degistiriyor
- Golgeli ban (shadowban) hakkinda seffaflik yok

---

## 12. SOSYAL OZELLIKLER

### Mevcut Sosyal Ozellikler
- Iltifat gonderme
- Buz kirici mesajlar
- Wave/el sallama ile iletisim baslatma
- Video/sesli arama

### OLMAYAN Sosyal Ozellikler
- **Story/Hikaye ozelligi YOK**
- **Canli yayin (Live Streaming) YOK**
- **Gruplar YOK**
- **Etkinlikler YOK**
- **Feed/Akis YOK**
- **Sosyal medya entegrasyonu YOK** (Spotify, Instagram vb.)

**Karsilastirma (LUMA):** Bumpy sosyal ozellikler konusunda minimalist. LUMA'nin Places, Arkadaslik modu gibi planlari farklilasmaya yardimci olabilir.

---

## 13. BILDIRIMLER (NOTIFICATIONS)

Kesin bildirim turleri:
- **Yeni Like** bildirimi
- **Yeni Match** bildirimi
- **Yeni Mesaj** bildirimi
- **Video/sesli arama** bildirimi (kapatilabilir)

Kullanici sikayetleri:
- Yeni kullanicilara asiri like bildirimi gonderilir (subscription'a tesvik icin)
- Odeme sonrasi bildirimler dramatik olarak azalir

---

## 14. AYARLAR VE KONFIGRASYON

### Tespit Edilen Ayarlar
- **Hesap ayarlari**: E-posta, telefon, giris yontemi
- **Kesif tercihleri**: Yas araligi, cinsiyet tercihi, kita secimi
- **Gizlilik ayarlari**: Profilinizi kimlerin gorebilecegi kontrolu
- **Bildirim ayarlari**: Sesli/goruntulu arama bildirimleri acma/kapama
- **Dil ayarlari**: Arayuz dili ve ceviri tercihleri
- **Translator secimi**: Pro vs Beginner translator
- **Dogrulama**: Foto dogrulama baslat/guncelle
- **Engelleme yonetimi**: Engellenen kullanicilari yonet
- **Hesap silme**: Destek uzerinden talep (uygulama ici direkt silme belirsiz)
- **Veri talepleri**: GDPR kapsaminda veri silme/duzeltme talepleri

### Bilinen Izinler (Permissions)
- Konum (arka planda dahil)
- Kamera
- Mikrofon
- Fotograf galeri erisimi
- Bildirimler
- Depolama
- Ag erisimi

---

## 15. HARITA OZELLIGI (MAP FEATURE)

Bu Bumpy'nin **en ayirt edici ozelligi**:

- Interaktif dunya haritasi
- Ulke bazinda profil kesfetme
- 150+ ulkede profil gosterimi
- Kita bazli filtreleme (6 kita)
- Yerel veya uluslararasi dating secimi
- Harita uzerinde profil gorunurlugu (ucretsiz)
- Profil secip kalp gonderebilme

**Karsilastirma (LUMA):** LUMA'nin Places ozelligi yerel odakli iken, Bumpy'nin haritasi global odakli. Farkli ama ilham verici.

---

## 16. TEKNIK ALTYAPI

- **Platformlar**: iOS (14.6+) ve Android (7.0+)
- **Backend**: AWS cloud altyapisi
- **Ceviri**: Gercek zamanli ceviri API'lari
- **Guvenlik**: SSL Encryption, OAuth 2.0
- **Veri koruma**: GDPR uyumlu
- **Paywall**: Adapty entegrasyonu

---

## 17. KULLANICI DEMOGRAFISI VE PAZARLAR

- **Oncelikli pazarlar**: ABD, Nijerya, Filipinler
- **Toplam ulke**: 150+
- **Toplam dil**: 100+
- **Hedef kitle**: Uluslararasi iliski arayanlar, yurt disinda yasayanlar, farkli kulturlerle tanismak isteyenler

---

## 18. GUCLU VE ZAYIF YONLER

### Guclu Yonler
1. Uluslararasi odak — baska hicbir uygulama bu kadar global degil
2. Otomatik mesaj cevirisi — dil bariyerini kaldirir
3. Harita ozelligi — benzersiz ve etkileyici
4. %90 dogrulama orani — guven veriyor
5. Ucretsiz video/sesli arama — diger uygulamalarda genellikle premium
6. Ucretsiz sinirsiz mesajlasma (match sonrasi)
7. Read receipt — rakiplerde nadir
8. Reklam izleyerek ucretsiz like kazanma

### Zayif Yonler
1. **Cok sinirli filtreler** — sadece yas ve cinsiyet
2. **Minimalist profil alanlari** — boy, egitim, meslek yok
3. **Musteri hizmetleri cok kotu** — yanitlanmayan talepler
4. **Sahte profil sorunu** — %30'a kadar sahte oldugu raporlaniyor
5. **Agresif monetizasyon** — yeni kullanicilara sahte like bombardimani
6. **Hesap silme zorluklari**
7. **Sosyal ozellikler yok** — story, feed, grup yok
8. **Shadowban seffafligi yok**
9. **Uyumluluk/compatibility sistemi yok** — sadece konum + yas bazli
10. **Prompt/soru sistemi yok** — profil derinligi sinirli

---

## 19. LUMA ICIN ALINACAK DERSLER

### Bumpy'den Ilham Alinabilecek Ozellikler
1. **Otomatik mesaj cevirisi** — LUMA global genislemede kullanabilir
2. **Harita bazli kesif** — LUMA Places ozelligi icin ilham
3. **Wave/el sallama aksiyonu** — Like'tan farkli, dusuk baski iletisim baslangici
4. **Buz kirici mesaj onerileri** — Awkward baslangiclar icin yardimci
5. **Read receipt** — Kullanici deneyimini iyilestiren bir ozellik
6. **Reklam izleyerek ucretsiz like** — Free tier icin monetizasyon stratejisi
7. **Iltifat ozelligi** — Like ile birlikte mesaj gonderme

### LUMA'nin Bumpy'ye Kiyasla USTUNLUKLERI
1. **45 soru, 19 kategori** — Bumpy'de uyumluluk sistemi yok
2. **Derin profil alanlari** — Bumpy minimalist
3. **4 katmanli paket sistemi** — Bumpy tek tier (Gold)
4. **Gelismis filtreler** — Bumpy sadece yas/cinsiyet
5. **Intention tag sistemi** — Bumpy'de var ama LUMA'da daha yapisal
6. **Arkadaslik + Dating** — Bumpy'de var ama LUMA'da daha derinlemesine
7. **Places ozelligi** — Yerel + mekan odakli kesif

---

## 20. KAYNAKLAR

- [Bumpy - Google Play](https://play.google.com/store/apps/details?id=app.bumpy.android&hl=en_US)
- [Bumpy - App Store](https://apps.apple.com/us/app/bumpy-international-dating/id1455336523)
- [Bumpy Resmi Site](https://bumpy.app/)
- [Bumpy Privacy Policy](https://bumpy.app/privacy-policy)
- [Bumpy - Product Hunt](https://www.producthunt.com/products/bumpy)
- [Bumpy - Trustpilot Reviews](https://www.trustpilot.com/review/bumpy.app)
- [Bumpy - DatingThings Review](https://datingthings.com/bumpy-app-review/)
- [Bumpy - GizCompare Review](https://gizcompare.com/bumpy-app-review/)
- [Bumpy - SmileBlogs Review](https://www.smileblogs.com/article/2576)
- [Bumpy - InsiderBits Guide](https://insiderbits.com/apps/bumpy-app-international-dating/)
- [Bumpy - Softkingo Case Study](https://www.softkingo.com/case-studies/bumpy-dating-app)
- [Bumpy - VCKolkata Feature Analysis](https://www.vckolkata63.org/news.php?news=201257)
- [Bumpy - RichestSoft Development Guide](https://richestsoft.com/blog/create-dating-app-like-bumpy/)
- [Bumpy - Verified-Love User Experience](https://verified-love.com/bumpy-dating-in-real-use-what-people-notice-what-confuses-them-and-why-questions-keep-coming-up/)
- [Bumpy - Crunchbase](https://www.crunchbase.com/organization/bumpy)
- [Bumpy - Adapty Paywall](https://adapty.io/paywall-library/bumpy-international-dating/)
- [Bumpy - AppBrain Android](https://www.appbrain.com/app/bumpy-international-dating/app.bumpy.android)
- [Bumpy - MWM.ai Analysis](https://mwm.ai/apps/bumpy-international-dating/1455336523)
- [Bumpy - AppShunter Reviews](https://appshunter.io/ios/app/1455336523)
- [Bumpy - Grand-Screen Reviews](https://grand-screen.com/apps/bumpy-international-dating/reviews/)
- [Bumpy - NowSecure Security Analysis](https://www.nowsecure.com/marc-app/bumpy-international-dating-ios/)
