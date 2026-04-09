# LUMA V1 -- Development Roadmap

**Last Updated:** 2026-04-09
**Structure:** 8 phases, 16 weeks
**Start Date:** April 2026

---

## Phase 1: Core Infrastructure (Week 1-2)
**Target:** 8-21 Nisan 2026
**Goal:** Auth, DB ve temel API altyapisi stabil calissin

- [x] PostgreSQL sema finalizasyonu (Prisma) — ✅ 2026-04-09
- [x] Telefon + OTP giris sistemi (Netgsm entegrasyonu) — ✅ 2026-04-08
- [x] Test OTP sistemi (gelistirme icin) — ✅ 2026-04-08
- [x] Google Sign-In entegrasyonu — ✅ 2026-04-09
- [x] Apple Sign-In entegrasyonu (iOS App Store zorunlu) — ✅ 2026-04-09
- [x] Health check endpoint + monitoring — ✅ 2026-04-08
- [x] Monorepo yapisini dogrulama — ✅ 2026-04-08
- [ ] Railway backend deploy stabilizasyonu
- [ ] Redis cache + rate limiting kurulumu (modul var, tam entegrasyon bekliyor)
- [ ] API URL'lerini production sunucuya baglama

---

## Phase 2: Onboarding + Profile Setup (Week 3-4)
**Target:** 22 Nisan - 5 Mayis 2026
**Goal:** Kullanici kayit akisi ve profil olusturma tamamlansin

- [x] Onboarding akisi (13 adim: isim→selfie) — ✅ 2026-04-08
- [x] Uyum Analizi — 20 soru (ZORUNLU, 4 secenekli) — ✅ 2026-04-09
- [x] Onboarding 10+10 split (ilk 10 soru onboarding, geri kalan profilden) — ✅ 2026-04-09
- [x] Kisilik Testi — 5 soru (istege bagli) — ✅ 2026-04-08
- [x] 5 Hedef secimi — ✅ 2026-04-08
- [x] Profil Gucu hesaplama — ✅ 2026-04-08
- [x] Foto yukleme (min 2, max 9) — ✅ 2026-04-08
- [x] Prompt/bio alanlari (max 3) — ✅ 2026-04-08
- [x] Profil duzenleme ekrani — ✅ 2026-04-08
- [x] Sevdigin Mekanlar (max 8) — ✅ 2026-04-08

---

## Phase 3: Kesfet -- Discovery with Swipe (Week 5-6)
**Target:** 6-19 Mayis 2026
**Goal:** Kart swipe sistemi tam calissin

- [x] Kesfet tab — kart swipe UI (begen/pas gec/super begeni) — ✅ 2026-04-08
- [x] Gunun Eslesmesi (AI-powered gunluk oneri) — ✅ 2026-04-09
- [x] Boost sistemi UI (24 saat, 120 jeton) — ✅ 2026-04-08
- [ ] Uyum yuzdesi kart uzerinde gosterim (gercek skor entegrasyonu)
- [ ] Uyum bazli siralama algoritmasi (tam entegrasyon)
- [ ] Gelismis filtreler paket bazli erisim kontrolu
- [ ] Super Begeni jeton kesme (15 jeton) — tam test
- [x] Eslesme animasyonu (MatchAnimation 24 particles) — ✅ 2026-04-09

---

## Phase 4: Akis -- Feed (Week 7-8)
**Target:** 20 Mayis - 2 Haziran 2026
**Goal:** Instagram tarzi hikaye ve gonderi sistemi

- [x] Akis tab — Populer/Takip alt tablari — ✅ 2026-04-08
- [x] Hikaye olusturma + goruntuleme (24 saat expire) — ✅ 2026-04-08
- [x] Gonderi olusturma (foto/video/yazi) — ✅ 2026-04-08
- [x] Yorum sistemi (CommentSheet + backend) — ✅ 2026-04-09
- [x] Begeni kalp animasyonu (HeartBounce) — ✅ 2026-04-09
- [x] Takip sistemi (tek tarafli) — ✅ 2026-04-08
- [x] Karsilikli takip = Arkadas otomatik — ✅ 2026-04-08
- [x] Mood Status (Anlik Ruh Hali) — ✅ 2026-04-09
- [ ] Hikaye/gonderi paket limiti kontrolu (tam enforcement)

---

## Phase 5: Eslesme + Chat (Week 9-10)
**Target:** 3-16 Haziran 2026
**Goal:** Mesajlasma ve iletisim tam calissin

- [x] Eslesme tab — 5 alt tab — ✅ 2026-04-09
- [x] Takipciler tab — ✅ 2026-04-09
- [x] Kim Gordu tab — ✅ 2026-04-09
- [x] WebSocket bazli gercek zamanli mesajlasma — ✅ 2026-04-08
- [x] Buz Kirici Oyunlar (3 oyun) — ✅ 2026-04-09
- [ ] Begeniler blur/net paket kontrolu
- [ ] Selam Gonder jeton kesme (3-10 jeton)
- [ ] Okundu bilgisi (Premium+ only)
- [ ] WebRTC sesli arama (tam entegrasyon)
- [ ] WebRTC goruntulu arama (tam entegrasyon)
- [ ] Ortak Mekan Onerisi

---

## Phase 6: Canli -- Live Video (Week 11-12)
**Target:** 17-30 Haziran 2026
**Goal:** Omegle tarzi canli kesif tam calissin

- [x] Canli tab — UI + camera — ✅ 2026-04-08
- [ ] Uyum bazli eslestirme algoritmasi
- [ ] Gorusme sonu butonlari (Takip Et / Begen / Sonraki)
- [ ] Jeton kesme per Canli session (20 jeton)
- [ ] WebRTC altyapi stabilizasyonu

---

## Phase 7: Payments -- 3 Packages + Jeton (Week 13-14)
**Target:** 1-14 Temmuz 2026
**Goal:** Gelir modeli tam calissin

- [x] 3 paket tanimlama (backend) — ✅ 2026-04-08
- [x] Referral sistemi (50 jeton bonus, davet kodu) — ✅ 2026-04-09
- [x] Premium bitis kampanyasi (%20 indirim, 48h gecerli) — ✅ 2026-04-09
- [ ] In-app purchase — Google Play entegrasyonu
- [ ] In-app purchase — App Store entegrasyonu
- [ ] Subscription satin alma akisi
- [ ] Jeton satin alma akisi
- [ ] AdMob rewarded ads (free users only)
- [ ] Kasif gorevleri jeton kazanma sistemi
- [ ] Paket limitleri tam enforcement

---

## Phase 8: Polish, Notifications, Launch Prep (Week 15-16)
**Target:** 15-28 Temmuz 2026
**Goal:** Lansmana hazirlik

### Notifications
- [x] Bildirim sistemi (likes, comments, follows, matches) — ✅ 2026-04-09
- [x] Bildirim tercihleri ekrani — ✅ 2026-04-08
- [ ] Firebase push notification entegrasyonu (FCM production)

### Safety & Quality
- [x] Rapor sistemi — ✅ 2026-04-09
- [x] Engelleme sistemi — ✅ 2026-04-09
- [x] Foto dogrulama (selfie verification) — ✅ 2026-04-08
- [x] Rate limiting — ✅ 2026-04-08

### i18n
- [x] i18n altyapisi (i18next, TR/EN) — ✅ 2026-04-09
- [x] Dil degistirme toggle (Settings) — ✅ 2026-04-09

### Polish
- [x] Lottie animasyonlar (confetti, skeleton, heart) — ✅ 2026-04-09
- [x] Mikro-animasyonlar (pull-to-refresh, typing, double-tap, tab crossfade) — ✅ 2026-04-09
- [x] Global typography upgrade (bold/thick) — ✅ 2026-04-09
- [x] Premium shared components (BackButton, PrimaryButton, PremiumInput) — ✅ 2026-04-09
- [x] Haftalik Uyum Raporu — ✅ 2026-04-09
- [ ] Performance optimizasyonu
- [ ] E2E testler

### Launch
- [ ] Google Play Store submission
- [ ] iOS App Store submission
- [ ] Beta test grubu
- [ ] Founder Badge ilk 777 kullanici

---

## Key Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Auth + DB stabil | Hafta 2 (21 Nisan) | ✅ Done (2026-04-09) |
| Onboarding tamamlandi | Hafta 4 (5 Mayis) | ✅ Done (2026-04-09) |
| Kesfet + swipe calisiyor | Hafta 6 (19 Mayis) | 🟡 In Progress |
| Akis + hikayeler calisiyor | Hafta 8 (2 Haziran) | 🟡 In Progress |
| Mesajlasma + oyunlar calisiyor | Hafta 10 (16 Haziran) | 🟡 In Progress |
| Canli video calisiyor | Hafta 12 (30 Haziran) | ❌ Not Started |
| Monetization aktif | Hafta 14 (14 Temmuz) | ❌ Not Started |
| App Store / Play Store | Hafta 16 (28 Temmuz) | ❌ Not Started |

---

## Technical Debt
- Railway deploy stability
- WebRTC altyapi kurulumu (peer connection)
- Elasticsearch user search
- Firebase push notification (FCM) production setup
- Redis cache layer optimization
- Paket limitleri tam enforcement
- Jeton kesme logic tam kapsam
