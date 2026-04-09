# LUMA V1 — UI/UX İyileştirme Planı
> Tarih: 2026-04-08
> Bu dosya ekran incelemesinden sonra tespit edilen tüm UI/UX sorunlarını ve düzeltmeleri listeler.
> VS Code Claude Code bu dosyayı okuyup adım adım uygulayacak.

---

## KRİTİK: Önce REFACTORING_PLAN.md Tamamlanmalı
Bu UI/UX iyileştirmeleri, REFACTORING_PLAN.md'deki 4 fazlı refactoring TAMAMLANDIKTAN SONRA uygulanmalıdır. Refactoring zaten eski konseptleri (Gold/Pro/Reserved, Harmony, 45 soru, 4 tab) temizleyecek. Bu dosya onun ÜZERİNE ek iyileştirmeler içerir.

---

## BÖLÜM 1: Uyum Analizi Ekranı (QuestionsScreen.tsx) — ANA ŞİKAYET

**Mevcut Durum:** Düz text + radio button tasarımı. Sıkıcı, kullanışsız görünüyor.
**Dosya:** `apps/mobile/src/screens/onboarding/QuestionsScreen.tsx`

### 1.1 Görsel Tasarım İyileştirmeleri

**Progress Bar → Stepped Dots veya Daire İlerleme:**
```
ESKİ: Basit çizgi progress bar + "3/20" yazısı
YENİ: Üstte büyük daire (ring) progress göstergesi
  - Ortasında "3/20" büyük yazı
  - Dairenin doluluk oranı animasyonlu
  - Gradient renk: purple→pink
  - Soru değiştiğinde daire doluluk animasyonu (withSpring)
```

**Soru Kartı → Tam Ekran Deneyim:**
```
ESKİ: Glassmorphism kart içinde text + radio butonlar
YENİ: Full-screen gradient arka plan, soru üstte büyük font
  - Her soru için farklı subtle gradient arka plan rengi (kategori bazlı)
  - Soru metni: 24px bold, beyaz, ortada
  - Altında ince bir çizgi veya emoji ile kategorisini göster
  - Örnek: "💬 İletişim Tarzı" veya "🏖 Yaşam Tarzı"
```

**Seçenek Kartları → Tinder-tarzı Büyük Butonlar:**
```
ESKİ: Radio button + text (küçük, sıkışık)
YENİ: Büyük, rounded, dokunulabilir kartlar
  - Her seçenek kendi renk tonuyla (pastel)
  - Seçildiğinde: scale animasyonu (1.0 → 1.05), glow efekti, haptic feedback
  - Seçilmeyenler: dim (opacity 0.5) olur
  - Radio button YOK — kartın tamamı tıklanabilir, seçili olan kenarlık + ikon gösterir
  - Her kartın solunda küçük emoji/ikon (A, B, C, D yerine)
```

**Geçiş Animasyonu → Swipe veya Flip:**
```
ESKİ: SlideInRight / SlideOutLeft (basit)
YENİ: Soru kartı swipe-up ile kaybolsun, yeni soru aşağıdan gelsin
  - VEYA: Card flip animasyonu (3D perspective)
  - Lottie confetti/sparkle efekti her 5 soruda bir
```

### 1.2 Kullanılabilirlik İyileştirmeleri

**Otomatik İlerleme:**
```
- Kullanıcı bir seçenek seçtiğinde 600ms sonra otomatik sonraki soruya geç
- "Sonraki" butonuna basma zorunluluğu kalksın
- Seçim → haptic → kısa highlight → auto-advance
- Geri dönme butonu ekle (sol üst ok)
```

**Milestone Kutlama:**
```
- Her 5 soruda mini kutlama: "🎉 Harika gidiyorsun!" (1 saniye)
- Her 10 soruda: "Yarısını tamamladın! 💪"
- Son soru: Büyük kutlama ekranı (confetti Lottie)
```

**Skip İyileştirmesi:**
```
ESKİ: "Bu soruyu atla" text link (altta, küçük)
YENİ: Sağ üstte küçük "Atla →" butonu, transparent
- Atlanan sorularda progress bar'da boşluk göster
- Sonunda atlanan soru sayısını göster: "2 soru atladın, sonra cevaplayabilirsin"
```

### 1.3 Kod Değişiklikleri (QuestionsScreen.tsx)

```typescript
// KALDIR: isPremium filtresi, showPremium logic, interstitial (core→premium geçişi)
// KALDIR: NormalizedQuestion.isPremium field
// KALDIR: premiumBadge view
// KALDIR: showPremiumInterstitial fonksiyonu

// GÜNCELLE: Sadece 20 soru, hepsi eşit (isPremium YOK)
// GÜNCELLE: Auto-advance after selection (600ms delay)
// GÜNCELLE: Geri gitme butonu ekle
// GÜNCELLE: Progress göstergesini ring/circle progress'e çevir

// YENİ: Soru kategori emojileri (her sorunun kategorisine göre)
const QUESTION_CATEGORY_EMOJIS: Record<string, string> = {
  lifestyle: '🏖',
  communication: '💬',
  values: '💎',
  future_plans: '🔮',
  personality: '🧠',
  social: '👥',
  romance: '💕',
};
```

---

## BÖLÜM 2: Login / Auth Ekranı

**Dosya:** `apps/mobile/src/screens/auth/WelcomeScreen.tsx`

### 2.1 Apple Sign-In EKSİK (App Store Zorunlu!)
```
- Apple Sign-In butonu MUTLAKA eklenmeli
- iOS App Store bu olmadan uygulamayı reddeder
- expo-apple-authentication kullan
- Buton sırası: "Apple ile bağlan" → "Google ile bağlan" → "Telefon ile devam et"
```

### 2.2 Dev Bypass Temizliği
```
- WelcomeScreen.tsx: packageTier: 'reserved' → KALDIR veya 'supreme' yap
- OTPVerificationScreen.tsx: 'free' | 'gold' | 'pro' | 'reserved' → 'free' | 'premium' | 'supreme'
- EmotionalIntroScreen.tsx: packageTier: 'reserved' → KALDIR veya 'supreme' yap
```

---

## BÖLÜM 3: Tab Navigasyonu

**Dosya:** `apps/mobile/src/navigation/MainTabNavigator.tsx`
**Dosya:** `apps/mobile/src/constants/config.ts`

### 3.1 4 Tab → 5 Tab
```
ESKİ (4 tab): Keşfet, Eşleşmeler, Akış, Profil
YENİ (5 tab): Akış, Keşfet, Canlı, Eşleşme, Profil

Tab sırası ve ikonlar:
1. Akış (Feed) — newspaper/rss icon
2. Keşfet (Discover) — compass icon
3. Canlı (Live) — video-camera icon (ORTA TAB, büyük gradient buton)
4. Eşleşme (Matches) — heart icon + unread badge
5. Profil (Profile) — person icon

NOT: Orta tab (Canlı) diğerlerinden farklı olmalı:
  - Daha büyük ikon
  - Gradient arka plan (pembe→mor)
  - Raised (yükseltilmiş) görünüm
  - Bumble/Tinder'daki gibi öne çıkan orta buton
```

### 3.2 config.ts Güncelleme
```typescript
// MENU_TABS: 4 → 5
// PACKAGES: 4 → 3
// Total Questions: 45 → 20
// Intention Tags: 3 → 5
// MAX_PHOTOS: 6 → 9
// PACKAGE_TIERS: gold/pro/reserved → premium/supreme
// HARMONY_CONFIG → KALDIR
```

---

## BÖLÜM 4: Eşleşme (Matches) Ekranı

**Dosya:** `apps/mobile/src/screens/matches/MatchesListScreen.tsx`

### 4.1 Takipçiler Tabı EKSİK
```
Mevcut tablar: Eşleşmeler, Mesajlar, Beğenenler, Kim Gördü
Olması gereken: Eşleşmeler, Mesajlar, Beğenenler, Takipçiler, Kim Gördü

Takipçiler tabı ekle:
- Seni takip eden kullanıcıların listesi
- Ücretsiz: blurlu göster
- Premium: sınırlı net
- Supreme: sınırsız net
```

### 4.2 MatchDetailScreen Temizlik
```
"Uyum Odası Başlat" → KALDIR (Harmony Room kaldırıldı)
Yerine: "Buz Kırıcı Oyun Başlat" (Icebreaker Games)
```

---

## BÖLÜM 5: Profil Düzenleme

**Dosya:** `apps/mobile/src/screens/profile/EditProfileScreen.tsx`
**Dosya:** `apps/mobile/src/constants/config.ts`

### 5.1 Fotoğraf Limiti
```
ESKİ: "en fazla 6 fotoğraf" + 6 slot (2x3 grid)
YENİ: "en fazla 9 fotoğraf" + 9 slot (3x3 grid)
- MAX_PHOTOS: 6 → 9
- Grid layout: 3 sütun x 3 satır
- İlk fotoğraf = Ana profil fotoğrafı (büyük badge)
```

### 5.2 IntentionTag (Hedefim) Güncelleme
```
ESKİ: 3 seçenek (SERIOUS_RELATIONSHIP, EXPLORING, NOT_SURE)
YENİ: 5 seçenek
  - Evlenmek (💍)
  - Bir ilişki bulmak (💕)
  - Sohbet etmek ve arkadaşlarla tanışmak (💬)
  - Diğer kültürleri öğrenmek (🌍)
  - Dünyayı gezmek (✈️)
```

---

## BÖLÜM 6: Canlı (Live) Ekranı

**Dosya:** `apps/mobile/src/screens/harmony/` → DELETE
**Yeni Dosya:** `apps/mobile/src/screens/canli/CanliScreen.tsx`

### 6.1 Harmony → Canlı Dönüşüm
```
Harmony Room tamamen kaldırıldı. Yerine Canlı (Live) tab geldi.
- Full-screen kamera görüntüsü
- Jeton sayacı (sağ üst)
- "Uyumuna göre biriyle anında tanış" başlığı
- "Bağlan" butonu (gradient pembe→mor, büyük, ortada)
- Arama animasyonu: pulse/ripple efekti
```

---

## BÖLÜM 7: Akış (Feed) Ekranı

### 7.1 Story Circle
```
- Kullanıcının kendi story circle'ında profil fotoğrafı gösterilmeli ("H" harfi değil)
- "+" ikonu ile yeni story ekleme
- Gradient border: görülmemiş story = renkli, görülmüş = gri
```

### 7.2 Post Kalitesi
```
- Test içerikli post'lar temizlenmeli
- Post'larda: kullanıcı avatarı, isim, doğrulama rozeti, şehir, zaman, hedef tag
- Beğen butonu: kalp animasyonu (Lottie)
- Yorum butonu: bottom sheet açılsın
```

---

## BÖLÜM 8: Genel UI İyileştirmeleri

### 8.1 Tema ve Renkler
```
- Tutarlı gradient kullanımı: pembe→şeftali (ana tema)
- Koyu tema: Üyelik & Jeton ekranları (mor/koyu gradient) ✅ zaten doğru
- Glassmorphism efektleri: kartlar, modal'lar
- Soft, rounded UI elemanları (borderRadius: 16-24)
```

### 8.2 Micro-animasyonlar
```
- Beğeni: kalp animasyonu (scale bounce)
- Takip: checkmark animasyonu
- Boost: ⚡ parlama efekti
- Eşleşme: konfeti + kalp Lottie animasyonu
- Tab geçişi: smooth crossfade
```

### 8.3 Empty State'ler
```
Her boş ekranda:
- İlgili Lottie animasyonu
- Açıklayıcı mesaj
- Aksiyon butonu (CTA)
Örn: Eşleşmeler boş → "Keşfet'e Git" butonu ✅ zaten var
```

---

## UYGULAMA SIRASI

1. ✅ REFACTORING_PLAN.md Phase 1-4 tamamla (eski konseptler temizlensin)
2. config.ts sabit güncellemeleri (tab sayısı, foto limiti, paket sayısı, soru sayısı)
3. MainTabNavigator → 5 tab yapısı + Canlı orta buton
4. QuestionsScreen.tsx → Yeni tasarım (auto-advance, ring progress, büyük kartlar)
5. Apple Sign-In ekleme
6. Takipçiler tabı ekleme
7. Fotoğraf grid 3x3 + limit 9
8. IntentionTag 5 seçenek
9. MatchDetailScreen temizlik (Harmony → Buz Kırıcı)
10. Story circle düzeltmesi
11. Micro-animasyonlar ve Lottie entegrasyonu

---

## NOT
Bu dosya VS Code Claude Code tarafından okunup uygulanacak şekilde yazılmıştır.
Her madde tamamlandığında bu dosyada ✅ işareti eklenmelidir.
Tüm string'ler Türkçe, tüm kod İngilizce olmalıdır.
