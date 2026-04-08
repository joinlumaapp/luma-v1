# LUMA V1 -- Development Roadmap

**Last Updated:** 2026-04-08
**Structure:** 8 phases, 16 weeks
**Start Date:** April 2026

---

## Phase 1: Core Infrastructure (Week 1-2)
**Target:** 8-21 Nisan 2026
**Goal:** Auth, DB ve temel API altyapisi stabil calissin

- [ ] Railway backend deploy stabilizasyonu
- [ ] PostgreSQL sema finalizasyonu (Prisma)
- [ ] Redis cache + rate limiting kurulumu
- [ ] Telefon + OTP giris sistemi (Netgsm entegrasyonu)
- [ ] Test OTP sistemi (gelistirme icin)
- [ ] Google Sign-In entegrasyonu
- [ ] Apple Sign-In entegrasyonu (iOS App Store zorunlu)
- [ ] API URL'lerini production sunucuya baglama
- [ ] Health check endpoint + monitoring
- [ ] Monorepo yapisini dogrulama (apps/mobile + apps/backend + packages/shared)

---

## Phase 2: Onboarding + Profile Setup (Week 3-4)
**Target:** 22 Nisan - 5 Mayis 2026
**Goal:** Kullanici kayit akisi ve profil olusturma tamamlansin

- [ ] Onboarding akisi (isim, dogum tarihi, cinsiyet, boy, sehir, bio, foto)
- [ ] Uyum Analizi -- 20 soru (ZORUNLU, 4 secenekli, uyum yuzdesi hesaplar)
- [ ] Kisilik Testi -- 5 soru (istege bagli, profil etiketi verir)
- [ ] 5 Hedef secimi (Evlenmek, Iliski bulmak, Sohbet/Arkadas, Kulturleri ogrenmek, Dunyayi gezmek)
- [ ] Profil Gucu hesaplama
- [ ] Foto yukleme (S3 entegrasyonu, min 2, max 9)
- [ ] Prompt/bio alanlari (max 3 prompt)
- [ ] Profil duzenleme ekrani
- [ ] Sevdigin Mekanlar (max 8)

---

## Phase 3: Kesfet -- Discovery with Swipe (Week 5-6)
**Target:** 6-19 Mayis 2026
**Goal:** Kart swipe sistemi tam calissin

- [ ] Kesfet tab -- kart swipe UI (begen/pas gec/super begeni)
- [ ] Uyum yuzdesi kart uzerinde gosterim (47-97 arasi, 90+ = Super Uyum glow)
- [ ] Uyum bazli siralama algoritmasi
- [ ] Gelismis filtreler (yas, sehir, boy, hedef) + paket bazli erisim
- [ ] Super Begeni -- jeton kesme (15 jeton)
- [ ] Eslesmeler olusturma (karsilikli begeni)
- [ ] Eslesme animasyonu (konfeti + kalp -- Bumpy referansi)
- [ ] Swipe animasyonlarini yumusat
- [ ] Gunun Eslesmesi (AI-powered gunluk oneri)
- [ ] Boost sistemi (24 saat, 120 jeton)

---

## Phase 4: Akis -- Feed (Week 7-8)
**Target:** 20 Mayis - 2 Haziran 2026
**Goal:** Instagram tarzi hikaye ve gonderi sistemi

- [ ] Akis tab -- Populer/Takip alt tablari
- [ ] Hikaye olusturma + goruntuleme (24 saat expire)
- [ ] Gonderi olusturma (foto/video/yazi)
- [ ] Begeni kalp animasyonu (Bumpy-style)
- [ ] Yorum sistemi
- [ ] Takip sistemi (tek tarafli)
- [ ] Karsilikli takip = Arkadas otomatik olusturma
- [ ] Hikaye/gonderi paket limiti kontrolu
- [ ] Mood Status (Anlik Ruh Hali) profilde durum paylasimi

---

## Phase 5: Eslesme + Chat (Week 9-10)
**Target:** 3-16 Haziran 2026
**Goal:** Mesajlasma ve iletisim tam calissin

- [ ] Eslesme tab -- 5 alt tab: Eslesmeler, Mesajlar, Begeniler, Takipciler, Kim Gordu
- [ ] Begeniler blur/net paket kontrolu
- [ ] Takipciler blur/net paket kontrolu
- [ ] Kim Gordu paket kontrolu
- [ ] WebSocket bazli gercek zamanli mesajlasma
- [ ] Selam Gonder (jeton ile, paket bazli maliyet: 3-10 jeton)
- [ ] Buz Kirici Oyunlar (2 Dogru 1 Yanlis, Hizli soru, Bu mu O mu)
- [ ] Okundu bilgisi (Premium+ only)
- [ ] WebRTC sesli arama (eslesme/arkadas arasi, messaging icerisinde)
- [ ] WebRTC goruntulu arama (eslesme/arkadas arasi, messaging icerisinde)
- [ ] Ortak Mekan Onerisi (eslesme sonrasi mekan)

---

## Phase 6: Canli -- Live Video (Week 11-12)
**Target:** 17-30 Haziran 2026
**Goal:** Omegle tarzi canli kesif tam calissin

- [ ] Canli tab -- rastgele video eslestirme (SADECE kesif, arama degil)
- [ ] Uyum bazli eslestirme algoritmasi
- [ ] Gorusme sonu butonlari (Takip Et / Begen / Sonraki)
- [ ] Jeton kesme per Canli session (20 jeton)
- [ ] Paket bazli gunluk Canli limiti
- [ ] WebRTC altyapi stabilizasyonu
- [ ] Moderasyon/guvenlik kontrolleri

---

## Phase 7: Payments -- 3 Packages + Jeton (Week 13-14)
**Target:** 1-14 Temmuz 2026
**Goal:** Gelir modeli tam calissin

- [ ] 3 paket tanimlama: Ucretsiz (0 TL), Premium (499 TL/ay), Supreme (1.199 TL/ay)
- [ ] In-app purchase -- Google Play entegrasyonu
- [ ] In-app purchase -- App Store entegrasyonu
- [ ] Subscription (Premium/Supreme) satin alma akisi
- [ ] Jeton satin alma akisi (79,99 TL / 199,99 TL / 349,99 TL)
- [ ] Boost satin alma akisi (1=120, 5=500, 10=900, 20=1500 jeton)
- [ ] AdMob rewarded ads entegrasyonu (free users only)
- [ ] Reklam izle -> jeton kazan akisi (5 jeton/reklam)
- [ ] Kasif gorevleri -> jeton kazan sistemi (5-10 jeton/gorev)
- [ ] Paket limitleri tam enforcement (tum ozellikler)

---

## Phase 8: Polish, Notifications, Launch Prep (Week 15-16)
**Target:** 15-28 Temmuz 2026
**Goal:** Lansmana hazirlik

### Notifications
- [ ] Firebase push notification entegrasyonu (FCM)
- [ ] 3 katmanli bildirim sistemi (Kritik/Onemli/Dusuk)
- [ ] Bildirim tercihleri ekrani

### Safety & Quality
- [ ] Rapor sistemi (fake profil, taciz, spam, uygunsuz icerik)
- [ ] Engelleme sistemi
- [ ] Sahte profil tespiti
- [ ] Foto dogrulama (selfie verification)
- [ ] Rate limiting (spam onleme)

### Polish
- [ ] Bumpy-tarzi animasyonlar ve gecisler (tum ekranlarda)
- [ ] Gradient tema iyilestirmeleri (pink-peach light, purple-dark premium)
- [ ] Haftalik Uyum Raporu (gamification)
- [ ] Super Uyum (90+) glow efektleri
- [ ] Performance optimizasyonu

### Testing & Launch
- [ ] Unit test'ler + API integration test'ler
- [ ] E2E test'ler (kritik akislar)
- [ ] Google Play Store submission
- [ ] iOS App Store submission
- [ ] Beta test grubu olusturma
- [ ] Founder Badge ilk 777 kullanici sistemi
- [ ] Launch marketing materyalleri

---

## Key Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Auth + DB stabil | Hafta 2 (21 Nisan) | In Progress |
| Onboarding tamamlandi | Hafta 4 (5 Mayis) | In Progress |
| Kesfet + swipe calisiyor | Hafta 6 (19 Mayis) | Not Started |
| Akis + hikayeler calisiyor | Hafta 8 (2 Haziran) | Not Started |
| Mesajlasma + arama calisiyor | Hafta 10 (16 Haziran) | Not Started |
| Canli video calisiyor | Hafta 12 (30 Haziran) | Not Started |
| Monetization aktif | Hafta 14 (14 Temmuz) | Not Started |
| App Store / Play Store | Hafta 16 (28 Temmuz) | Not Started |

---

## Technical Debt
- Railway deploy stability
- WebRTC altyapi kurulumu
- Elasticsearch user search
- Firebase push notification (FCM) setup
- Netgsm SMS entegrasyonu
- Redis cache layer optimization
- Prisma schema migration (eski enum'lari guncelle: IntentionTag -> Hedef, goldBalance -> jeton terminolojisi)
