# LUMA V1 — Development Roadmap

**Last Updated:** 2026-04-08

---

## Phase 1: Critical Fixes & Auth (Week 1-2)
**Goal:** Authentication tam çalışsın, deploy stabil olsun

- [ ] Apple Sign-In implementasyonu (iOS App Store zorunlu)
- [ ] Google Sign-In gerçek entegrasyon ("Çok yakında" → aktif)
- [ ] Railway backend deploy sorunlarını çöz
- [ ] API URL'lerini production sunucuya bağla
- [ ] Status bar düzeltmesi (siyah arka plan, beyaz ikonlar)
- [ ] Logo büyütme ve yukarı taşıma

---

## Phase 2: Core Experience Polish (Week 2-4)
**Goal:** Ana kullanıcı deneyimi pürüzsüz olsun

### Keşfet
- [ ] Kart üzerinde uyum yüzdesi gösterimi
- [ ] Eşleşme animasyonu (konfeti + kalp — Bumpy referansı)
- [ ] Swipe animasyonlarını yumuşat
- [ ] Süper Beğeni jeton kesme testi
- [ ] Gelişmiş filtrelerde paket kontrolü (Free: temel, Premium: +ilgi alanı, Supreme: tümü)

### Eşleşme
- [ ] Takipçiler tab'ını ekle (5. sub-tab)
- [ ] Beğenenler blurlu/net paket kontrolü
- [ ] Takipçiler blurlu/net paket kontrolü
- [ ] Kim Gördü paket kontrolü

### Akış
- [ ] Beğeni kalp animasyonu
- [ ] Yorum sistemi iyileştirme
- [ ] Story expire logic testi (24 saat)
- [ ] Hikaye oluşturma paket limiti kontrolü

### Profil
- [ ] Bildirim tercihleri ekranı (3 katmanlı sistem)
- [ ] Profil Gücü hesaplama mantığını düzelt

---

## Phase 3: Communication Features (Week 4-6)
**Goal:** Mesajlaşma ve iletişim tam çalışsın

- [ ] WebRTC sesli arama (eşleşme/arkadaş arası — mesajlaşma içi)
- [ ] WebRTC görüntülü arama (eşleşme/arkadaş arası — mesajlaşma içi)
- [ ] Selam Gönder jeton kesme doğrulama
- [ ] Okundu Bilgisi paket kontrolü (Premium+)
- [ ] Buz Kırıcı Oyunlar implementasyonu:
  - [ ] "2 Doğru 1 Yanlış" mini-oyunu
  - [ ] Hızlı soru promptları
  - [ ] "Bu mu O mu?" (This or That)

---

## Phase 4: Live & Matching Engine (Week 6-8)
**Goal:** Canlı keşfet ve algoritma entegrasyonu

- [ ] Canlı'da uyum bazlı eşleştirme algoritması
- [ ] Görüşme sonu butonları (Takip Et / Beğen / Sonraki)
- [ ] Karşılıklı takip = Arkadaş otomatik oluşturma
- [ ] Jeton kesme per Canlı session
- [ ] Paket bazlı günlük Canlı limiti (Free: 3, Premium: 10, Supreme: sınırsız)
- [ ] Günün Eşleşmesi özelliği (AI-powered günlük öneri)

---

## Phase 5: New V1 Features (Week 8-10)
**Goal:** Yeni özellikleri ekle

- [ ] Mood Status (Anlık Ruh Hali) — profilde durum paylaşımı
- [ ] Ortak Mekan Önerisi — eşleşme sonrası mekan önerme
- [ ] Haftalık Uyum Raporu — haftalık özet bildirimi
- [ ] Bumpy-tarzı animasyonlar ve geçişler (tüm ekranlarda)
- [ ] Gradient tema iyileştirmeleri (pink-peach light, purple-dark premium)

---

## Phase 6: Monetization & Ads (Week 10-12)
**Goal:** Gelir modeli tam çalışsın

- [ ] In-app purchase — App Store entegrasyonu
- [ ] In-app purchase — Google Play entegrasyonu
- [ ] Jeton satın alma flow testi
- [ ] Boost satın alma flow testi
- [ ] Subscription (Premium/Supreme) satın alma flow
- [ ] AdMob rewarded ads entegrasyonu (free users)
- [ ] Reklam izle → jeton kazan flow
- [ ] Paket limitleri tam enforcement (tüm özellikler)

---

## Phase 7: Safety & Quality (Week 12-14)
**Goal:** Güvenlik ve kalite kontrolü

- [ ] Rapor sistemi (fake profil, taciz, spam, uygunsuz içerik)
- [ ] Engelleme sistemi
- [ ] Sahte profil tespiti (otomasyon)
- [ ] Fotoğraf doğrulama (selfie verification)
- [ ] Anti-manipulation kontrolleri (Uyum Analizi)
- [ ] Content moderation hooks
- [ ] Rate limiting (spam önleme)

---

## Phase 8: Testing & Launch Prep (Week 14-16)
**Goal:** Lansmana hazırlık

- [ ] Tüm özelliklerin unit test'leri
- [ ] API integration test'leri
- [ ] E2E test'leri (kritik flow'lar)
- [ ] Performance optimization
- [ ] iOS App Store submission
- [ ] Google Play Store submission
- [ ] Beta test grubu oluşturma
- [ ] Founder Badge ilk 777 kullanıcı sistemi
- [ ] Launch marketing materyalleri

---

## Key Milestones

| Milestone | Target | Status |
|-----------|--------|--------|
| Auth tam çalışır | Hafta 2 | 🟡 |
| İlk stabil APK | Hafta 3 | 🟡 |
| Eşleşme sistemi tam | Hafta 5 | ❌ |
| Mesajlaşma + arama | Hafta 6 | ❌ |
| Canlı keşfet tam | Hafta 8 | ❌ |
| Monetization aktif | Hafta 12 | ❌ |
| Beta test | Hafta 14 | ❌ |
| App Store / Play Store | Hafta 16 | ❌ |

---

## Technical Debt
- Railway deploy stability
- API URL yönlendirme
- WebRTC altyapı kurulumu
- Redis cache layer
- Elasticsearch user search
- Push notification (FCM) setup
