# TASK: UI/UX İyileştirmeleri Uygula

Bu dosya REFACTORING_PLAN.md TAMAMLANDIKTAN SONRA uygulanacak UI/UX iyileştirmelerini içerir.
Detaylar UI_UX_IMPROVEMENTS.md'de var, bu dosya kısa özet + uygulama talimatı.

## Öncelik 1: Kritik Düzeltmeler (App Store rejection'ı önler)

### 1. Apple Sign-In Ekle
- `apps/mobile/src/screens/auth/WelcomeScreen.tsx`
- `expo-apple-authentication` paketini kur
- "Apple ile bağlan" butonu ekle — Google butonunun ÜSTÜNE
- iOS App Store bu olmadan uygulamayı reddeder

### 2. config.ts Güncelle
- `apps/mobile/src/constants/config.ts`
- MENU_TABS: 4 → 5
- PACKAGES: 4 → 3
- Total Questions: 45 → 20 (premium questions yok)
- Intention Tags: 3 → 5
- MAX_PHOTOS: 6 → 9
- PACKAGE_TIERS: gold/pro/reserved kaldır → premium/supreme ekle
- HARMONY_CONFIG: tamamını kaldır

## Öncelik 2: Tab Navigasyonu (5 Tab)

### 3. MainTabNavigator.tsx → 5 Tab
- `apps/mobile/src/navigation/MainTabNavigator.tsx`
- Yeni sıra: Akış, Keşfet, Canlı, Eşleşme, Profil
- Canlı tab = orta buton, diğerlerinden büyük, gradient arka plan (pembe→mor), raised görünüm
- HarmonyListScreen import → KALDIR
- CanliScreen ve FeedScreen import ekle
- LOCKED_ARCHITECTURE.MENU_TABS = 5 yap

## Öncelik 3: Uyum Analizi Yeniden Tasarım

### 4. QuestionsScreen.tsx Yeniden Yaz
- `apps/mobile/src/screens/onboarding/QuestionsScreen.tsx`
- TÜM isPremium logic KALDIR (interstitial, premiumBadge, showPremium, filter)
- Sadece 20 soru, hepsi eşit
- Progress bar → ring/circle progress (ortada "3/20")
- Seçenek kartları: büyük, rounded, pastel renkli, radio button YOK
- Seçim yapıldığında: scale animasyonu + 600ms sonra auto-advance
- Her 5 soruda milestone kutlama (küçük)
- Geri gitme butonu ekle (sol üst)
- Soru kategorisi emoji'si göster (💬 İletişim, 🏖 Yaşam Tarzı vb.)
- "Bu soruyu atla" → sağ üstte küçük "Atla →" butonuna taşı

## Öncelik 4: Eksik Özellikler

### 5. Takipçiler Tabı Ekle
- `apps/mobile/src/screens/matches/MatchesListScreen.tsx`
- Mevcut tablar: Eşleşmeler, Mesajlar, Beğenenler, Kim Gördü
- "Takipçiler" tabı ekle (Beğenenler ile Kim Gördü arasına)

### 6. Fotoğraf Grid 3x3
- `apps/mobile/src/screens/profile/EditProfileScreen.tsx`
- 2x3 grid → 3x3 grid
- "en fazla 6 fotoğraf" → "en fazla 9 fotoğraf"
- MAX_PHOTOS config'den oku

### 7. IntentionTag 5 Seçenek
- `apps/mobile/src/screens/onboarding/IntentionTagScreen.tsx`
- 3 seçenek → 5 seçenek (EVLENMEK, ILISKI, SOHBET_ARKADAS, KULTUR, DUNYA_GEZME)
- Her seçenek için emoji ekle

### 8. MatchDetailScreen Temizlik
- `apps/mobile/src/screens/matches/MatchDetailScreen.tsx`
- "Uyum Odası Başlat" → "Buz Kırıcı Oyun Başlat" olarak değiştir

## Öncelik 5: Auth Temizlik

### 9. Dev Bypass Temizlik
- WelcomeScreen.tsx: `packageTier: 'reserved'` → kaldır veya 'supreme'
- OTPVerificationScreen.tsx: tier type → 'free' | 'premium' | 'supreme'
- EmotionalIntroScreen.tsx: `packageTier: 'reserved'` → kaldır veya 'supreme'

---
HER MADDE TAMAMLANDIĞINDA BU DOSYADA ✅ İŞARETİ EKLE.
