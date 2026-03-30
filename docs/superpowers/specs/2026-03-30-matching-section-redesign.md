# Eşleşme Bölümü Yeniden Tasarım — Design Spec

**Tarih:** 2026-03-30
**Yaklaşım:** Canlı Aktivite Akışı — mevcut 4 tab yapısı korunur, içerikler zenginleşir
**Tema:** Mevcut Luma dark theme (bg `#08080F`, purple `#8B5CF6`, gold `#FBBF24`) + parlak altın vurgular
**Branding:** Tüm logo kullanımları mevcut `LumaLogo` component'i ile tutarlı

---

## 1. Genel Mimari

### Tab Yapısı (Korunuyor)
```
Eşleşmeler | Mesajlar | Beğenenler | Kim Gördü
```

### Yeni Ortak Elemanlar
- **Canlı Aktivite Şeridi** — Sadece Eşleşmeler tab'ında üstte yatay kaydırılabilir profil halkaları
- **Samimi Bildirim Banner** — Sıcak, kişisel mesajlar (uyumluluk + ortak özellik)
- **Zamanlı Erişim Sistemi** — Günlük profil açım limiti + jeton ile ekstra
- **Akıllı Etiketler** — Yakında, Süper Uyumlu, Doğrulanmış, Yeni, Ciddi İlişki

### Tema Renkleri (Mevcut Luma Palette)
| Token | Değer | Kullanım |
|-------|-------|----------|
| `darkTheme.background` | `#08080F` | Ana arka plan |
| `darkTheme.surface` | `#141422` | Kart, input arka planı |
| `darkTheme.surfaceBorder` | `#252540` | Kart border |
| `palette.purple[500]` | `#8B5CF6` | Primary — aktif tab, butonlar, badge |
| `palette.purple[400]` | `#A78BFA` | Primary light — etiketler, metin |
| `palette.gold[400]` | `#FBBF24` | Accent — altın vurgu, süper uyumlu, jeton |
| `palette.gold[600]` | `#D97706` | Accent dark — gradient |
| `palette.pink[500]` | `#EC4899` | Secondary — romantik vurgu |
| `palette.coral[600]` | `#F04D3A` | Yakınında etiketi, okunmamış badge |
| `palette.success` | `#10B981` | Çevrimiçi dot, doğrulanmış |

---

## 2. Eşleşmeler Tab

### 2.1 Canlı Aktivite Şeridi
Üstte yatay ScrollView, profil halkaları (60x60px) ile:

| Halka Rengi | Anlam | Animasyon |
|-------------|-------|-----------|
| Altın gradient (`gold[400]` → `gold[600]`) | Süper uyumlu (%80+) | Pulse glow 2s infinite |
| Kırmızı/turuncu (`coral[500]` → `coral[600]`) | Yakınındaki kişi | — |
| Mor (`purple[400]` → `purple[600]`) | Yeni beğeni | — |
| Gri + blur | Free'de kilitli profil | — |

- Altında: uyumluluk yüzdesi veya "📍 1.2km" veya "💫 Yeni" etiketi
- Kilitli profiller bulanık + 🔒 ikonu
- Tap → ProfilePreview ekranı (açık ise) veya Premium upsell modal (kilitli ise)

### 2.2 Samimi Bildirim Banner
Her girişte farklı, kişisel mesaj:
```
"Seninle %92 uyumlu biri seni beğendi! İkiniz de sabah koşucususunuz 🏃‍♀️"
"Yakınında %88 uyumlu biri var! 📍"
"Bu hafta 7 kişi seni beğendi! Aralarında süper uyumlun da var ✨"
```

- Background: `linear-gradient(135deg, rgba(purple[500], 0.12), rgba(pink[500], 0.08))`
- Border: `rgba(purple[500], 0.2)`
- Sol tarafta emoji (💛, 📍, 🔥)
- Ortak özellik alt satırda küçük text ile

### 2.3 Günlük Erişim Sayacı
- Yatay bar: dolu/boş noktalar ile kalan hak gösterimi
- Sağda "25💰 ile ekstra aç" butonu (gold gradient)
- Tier bazlı limitler (bkz. Bölüm 6 — Monetizasyon)

### 2.4 Eşleşme Kartları
Mevcut kart yapısı zenginleşiyor:

**Normal kart:**
- Avatar (64x64, gradient background) + online dot (yeşil, `success`)
- İsim, yaş, şehir
- Etiketler satırı: `%87 Uyumlu` · `📍 Yakında` · `✅ Doğrulanmış`
- Son mesaj preview veya "Henüz mesaj yok — selam ver! 👋"

**Süper uyumlu kart (%80+):**
- Altın border: `rgba(gold[400], 0.2)` + box-shadow glow `rgba(gold[400], 0.1)`
- Avatar: altın gradient halka
- "✨ Süper Uyumlu" etiketi (gold renk)
- Samimi açıklama: *"İkiniz de doğa yürüyüşü ve kitap tutkunusunuz 📚"*
- Font: italic, `rgba(gold[400], 0.7)`

---

## 3. Beğenenler Tab

### 3.1 Grid Layout
3 sütunlu grid (mevcut gibi), card aspect-ratio 0.75

**Açık kart (reveal edilmiş):**
- Fotoğraf + gradient overlay (bottom → transparent to black)
- Sol üst: uyumluluk badge (`%91`, gold veya purple background)
- Sağ üst: yakınında badge (`📍 1.2km`, coral background) — varsa
- Alt: isim, yaş, zaman

**Kilitli kart:**
- Fotoğraf blur(12px)
- Merkez: 🔒 ikonu (36x36) + "Açmak için dokun" text
- Süper uyumlu ipucu: kilitli bile olsa altın dashed border + "✨ Süper uyumlu!" yazısı (FOMO)

### 3.2 Zamanlı Erişim
- Üstte sayaç barı: dolu/boş bar segmentleri
- "1/2 kaldı" text + "25💰 Ekstra" butonu
- Kilitli karta tap → profil açılır (hak varsa) veya jeton harcama modal

### 3.3 Premium CTA
Grid'in altında:
- "Tüm beğenenlerini görmek ister misin?"
- "Gold üyeler günde 10 profil açabiliyor"
- "Gold'a Yükselt 👑" butonu (purple gradient)

---

## 4. Kim Gördü Tab

### 4.1 Liste Görünümü (Grid yerine)
Daha kompakt ve bilgi yoğun liste formatı:

**Açık satır:**
- Avatar (44x44) + online dot
- İsim, yaş + zaman (sağda)
- Etiketler: uyumluluk + yakınında + çevrimiçi
- Özel hook: "Profiline 3 kez baktı 👀" (tekrarlayan ilgi vurgusu, `pink[500]` renk)

**Kilitli satır:**
- Avatar blur(4px), opacity 0.6
- "??? — 🔒 Açmak için dokun"

### 4.2 Free Gecikme Sistemi
- Free: 24 saat gecikmeli görüntüleme
- Gold: 6 saat gecikme
- Pro+: Anlık
- Jeton ile gecikme atlama: 25💰/profil
- Altta info text: "⏳ Free hesaplar 24 saat gecikmeli görür · Gold+ anlık bildirim"

### 4.3 Samimi Banner
"Bugün 4 kişi profiline baktı!" + "Free: 24 saat gecikmeli gösterim" alt text

---

## 5. Mesajlar Tab

### 5.1 Eşleşmeden Mesaj CTA
Üstte banner:
- 💬 ikonu + "Eşleşmeden mesaj at!"
- "Tekli: 150💰 · 3'lü paket: 350💰"
- "Al" butonu (gold gradient, compact)

### 5.2 Konuşma Kartları

**Süper uyumlu sohbet:**
- Background: `rgba(gold[400], 0.06)` + border `rgba(gold[400], 0.15)`
- Avatar: altın gradient halka + ✨ badge + glow shadow
- İsim + "✨" suffix
- Uyumluluk etiketi: `%92 Uyumlu` (gold badge)
- Zaman rengi: `gold[400]`

**Normal sohbet (okunmamış):**
- Background: `surface` (#141422) + border `surfaceBorder`
- Avatar + online dot
- Bold isim
- Okunmamış sayacı: mor daire (20x20, `purple[500]`)

**Okunmuş sohbet:**
- Aynı ama isim font-weight normal
- Mesaj prefix: "Sen: ..." (dimmed)

**Yeni eşleşme (mesaj yok):**
- Dashed border: `rgba(purple[500], 0.2)`
- "Henüz mesaj yok — selam ver! 👋" (purple italic)
- 👋 butonu sağda (purple gradient, compact)

### 5.3 AI Sohbet Önerisi
- Alt kısımda küçük bar: 🤖 ikonu + öneri text + "Dene →" link
- "Selin ile ortak hobiniz hakkında konuş"
- Tier limitleri: Free 0, Gold 2/gün, Pro 5/gün, Reserved sınırsız

---

## 6. Monetizasyon

### 6.1 Günlük Profil Açım Limitleri

#### Beğenenler Tab
| Tier | Günlük Reveal | Jeton ile Ekstra |
|------|---------------|------------------|
| Free | 2/gün | 20💰/profil |
| Gold | 10/gün | 20💰/profil |
| Pro | 30/gün | 20💰/profil |
| Reserved | Sınırsız | — |

#### Kim Gördü Tab
| Tier | Günlük Reveal | Gecikme | Jeton ile Ekstra |
|------|---------------|---------|------------------|
| Free | 1/gün | 24 saat | 15💰/profil, gecikme atlama 25💰 |
| Gold | 5/gün | 6 saat | 15💰/profil, gecikme atlama 25💰 |
| Pro | 15/gün | Anlık | 15💰/profil |
| Reserved | Sınırsız | Anlık | — |

### 6.2 Eşleşmeden Mesaj Paketleri

| Paket | Adet | Fiyat | Birim | İndirim |
|-------|------|-------|-------|---------|
| Tekli | 1 | 150💰 | 150💰 | — |
| 3'lü | 3 | 350💰 | ~117💰 | %22 |
| 5'li | 5 | 500💰 | 100💰 | %33 |
| 10'lu | 10 | 800💰 | 80💰 | %47 |

Tier'e özel ücretsiz mesaj hakkı:
- Free: 0/ay
- Gold: 1/ay (altın çerçeve ile gönderilir)
- Pro: 3/ay (altın çerçeve + "Öncelikli Mesaj" etiketi)
- Reserved: 5/ay (altın çerçeve + öncelikli + sesli mesaj ekleme)

### 6.3 Jeton Harcama Kataloğu

| Aksiyon | Maliyet |
|---------|---------|
| Ekstra beğeni reveal | 20💰 |
| Ekstra kim gördü reveal | 15💰 |
| Gecikme atlama (Kim Gördü) | 25💰 |
| Öncelikli görünürlük (1 saat) | 60💰 |
| Öncelikli görünürlük (3 saat) | 150💰 |
| Aktivite şeridi sabitleme (30dk) | 40💰 |
| Gizli Hayran gönderme | 75💰 |
| Uyum Röntgeni | 30💰 |
| Süper Uyumlu vurgu açma (Free/Gold) | 20💰 |
| AI sohbet önerisi (10'lu paket) | 30💰 |
| Yakınında bildirim gönderme | 35💰 |
| Haftalık Top 3 blurlu profil açma | 40💰 |

### 6.4 Yeni Özellikler

#### 🕵️ Gizli Hayran
- Anonim "gizli hayran" gönder (75💰)
- Karşı taraf 3 aday arasından (1 gerçek, 2 rastgele) seni bulmaya çalışır
- 3 tahmin hakkı ücretsiz, ekstra tahmin 25💰
- Doğru tahmin = anlık eşleşme + özel animasyon
- Tier ücretsiz hakları: Free 0, Gold 1/ay, Pro 3/ay, Reserved 5/ay

#### 🔬 Uyum Röntgeni
- Eşleşmeden önce 5 kategori detaylı uyum kırılımı (Değerler, İlgi Alanları, Yaşam Tarzı, İletişim, Gelecek Planları)
- Free/Gold: 30💰/kişi
- Pro: 10/gün ücretsiz
- Reserved: Sınırsız

#### 📋 Haftalık Top 3 Eşleşme
- Her Pazartesi AI seçimi: en uyumlu 3 kişi
- Free: 1/3 profil görür (diğerleri blur)
- Gold: 2/3 profil görür
- Pro: 3/3 profil görür
- Reserved: 3/3 + detaylı uyum analizi + öncelikli bildirim
- Blur profil açma: 40💰

### 6.5 Tier'e Özel Premium Özellikler

| Özellik | Free | Gold | Pro | Reserved |
|---------|------|------|-----|----------|
| Aktivite şeridi halkası | Gri | Altın gradient | Parlayan mor | Animasyonlu elmas + VIP |
| Yakınında etiketi | Görünmez | "Yakınında" | Mesafe detayı (km) | Mesafe + anlık push bildirim |
| Süper Uyumlu vurgu | 20💰 ile | 20💰 ile | Otomatik | Otomatik |
| AI sohbet önerileri | — | 2/gün | 5/gün | Sınırsız |
| Ghost mode (Kim Gördü'de görünmeme) | — | — | — | Dahil |
| Özel AI eşleştirme (günlük 5 profil) | — | — | — | Dahil |

---

## 7. Teknik Notlar

### Yeni Config Sabitleri
`apps/mobile/src/constants/config.ts` dosyasına eklenecek:
- `VIEWERS_REVEAL_CONFIG` — Kim Gördü günlük reveal limitleri + gecikme süreleri
- `VIEWERS_DELAY_CONFIG` — Tier bazlı gecikme süreleri
- `MESSAGE_BUNDLE_CONFIG` — Mesaj paket tanımları
- `SECRET_ADMIRER_CONFIG` — Gizli Hayran ayarları
- `WEEKLY_TOP_MATCHES_CONFIG` — Haftalık Top 3 ayarları
- `COMPATIBILITY_XRAY_CONFIG` — Uyum Röntgeni ayarları

### Backend Yeni Endpoint'ler
- `GET /matches/viewers` — Kim Gördü listesi (gecikme filtreli)
- `POST /matches/secret-admirer` — Gizli Hayran gönderme
- `POST /matches/secret-admirer/:id/guess` — Gizli Hayran tahmin
- `GET /matches/weekly-top` — Haftalık Top 3
- `GET /matches/:id/compatibility-xray` — Uyum Röntgeni detayı
- `POST /discovery/priority-boost` — Öncelikli görünürlük
- `POST /discovery/nearby-notify` — Yakınında bildirim

### Yeni Zustand Store'lar
- `viewersStore.ts` — Kim Gördü state + reveal tracking
- `secretAdmirerStore.ts` — Gizli Hayran state
- `weeklyTopStore.ts` — Haftalık Top 3 state

### Backend Yeni Modüller (veya mevcut genişletme)
- `matches.service.ts` genişletme: viewers, weekly-top
- Yeni `secret-admirer.service.ts`
- Yeni `compatibility-xray.service.ts`
- `payments.service.ts` genişletme: yeni GOLD_COSTS entries

### Shared Types
`packages/shared/src/types/match.ts` genişletme:
- `SecretAdmirer` interface
- `CompatibilityXray` interface
- `WeeklyTopMatch` interface
- `ViewerRevealConfig` type
- `MessageBundle` type

### Mevcut Dosya Değişiklikleri
- `MatchesListScreen.tsx` — Canlı aktivite şeridi, samimi banner, zengin kartlar
- `LikesYouScreen.tsx` — Zamanlı erişim, yakınında etiketi, süper uyumlu ipucu
- `ViewersPreviewScreen.tsx` → tam yeniden yazım (liste formatı, gecikme sistemi)
- `ChatListScreen.tsx` — Süper uyumlu vurgu, mesaj CTA, AI öneri, selam ver teşviki
- `matchStore.ts` — Viewers tracking, reveal counting
- `chatStore.ts` — Mesaj bundle desteği
- `discoveryStore.ts` — Priority boost, nearby notify
- `config.ts` — Yeni config sabitleri
- `payments.service.ts` — Yeni jeton harcama türleri

---

## 8. Kapsam Dışı (Bu Spec'te Yok)

- Keşfet/Akış ekranları değişikliği
- Profil düzenleme değişiklikleri
- Push notification içerik değişiklikleri (ayrı spec)
- Paket fiyatları (₺) değişikliği — sadece jeton maliyetleri bu scope'ta
- Yeni animasyon tasarımları (Gizli Hayran animasyonu ayrı task)
