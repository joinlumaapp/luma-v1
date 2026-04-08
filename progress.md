# LUMA V1 — Progress Tracking

**Last Updated:** 2026-04-08

---

## Overall Status: 🟡 In Progress — Core features built, refinement needed

---

## Authentication & Onboarding

| Feature | Status | Notes |
|---------|--------|-------|
| Phone OTP Login | ✅ Done | +90 TR default, SMS doğrulama çalışıyor |
| Google Sign-In | 🟡 Placeholder | "Çok yakında" badge — henüz entegre değil |
| Apple Sign-In | ❌ Not Started | iOS App Store için zorunlu — eklenecek |
| Onboarding Flow | ✅ Done | İsim, doğum tarihi, cinsiyet, fotoğraf yükleme |
| Uyum Analizi (20 soru) | ✅ Done | 20 soru, 4 seçenek, progress bar çalışıyor |
| Kişilik Testi (5 soru) | ✅ Done | İsteğe bağlı, profil etiketi veriyor |
| Hedef Seçimi | ✅ Done | 5 seçenek mevcut |

---

## Tab 1: Akış (Feed)

| Feature | Status | Notes |
|---------|--------|-------|
| Story circles | ✅ Done | Yatay kaydırmalı, "+" ile ekleme |
| Story oluşturma | ✅ Done | Paket limitli (1/5/sınırsız) |
| Story 24 saat süresi | 🟡 Needs Testing | Expire logic kontrol edilmeli |
| Gönderi paylaşımı | ✅ Done | Fotoğraf, Video, Yazı |
| Popüler tab | ✅ Done | Mesafe + etkileşim sıralaması |
| Takip tab | ✅ Done | Takip edilenlerin gönderileri |
| Beğeni/Yorum | 🟡 Partial | Temel etkileşimler var, animasyonlar eksik |
| Hedef tag on posts | ✅ Done | "Arkadaş Arıyorum" gibi etiketler görünüyor |

---

## Tab 2: Keşfet (Discover)

| Feature | Status | Notes |
|---------|--------|-------|
| Kart swipe UI | ✅ Done | Sağ/sol swipe çalışıyor (test kullanıcı yok) |
| Uyum yüzdesi on cards | 🟡 Needs Implementation | Kart üzerinde uyum skoru gösterilmeli |
| Süper Beğeni (swipe up) | 🟡 Needs Testing | Jeton kesme logic kontrol edilmeli |
| Boost butonu | ✅ Done | Profil öne çıkarma ekranı mevcut |
| Filter butonu | ✅ Done | Temel filtreler çalışıyor |
| Gelişmiş filtreler (paketli) | 🟡 Partial | Premium/Supreme farkı uygulanmalı |
| Empty state | ✅ Done | "Yakınında profil yok" + "Filtreleri Genişlet" |
| Eşleşme animasyonu | ❌ Not Started | Konfeti/kalp animasyonu eklenecek |

---

## Tab 3: Canlı (Live)

| Feature | Status | Notes |
|---------|--------|-------|
| Kamera görünümü | ✅ Done | Full-screen kamera çalışıyor |
| Jeton counter | ✅ Done | Sağ üstte jeton bakiyesi görünüyor |
| "Bağlan" butonu | ✅ Done | Gradient pink-purple buton |
| WebRTC video eşleştirme | 🟡 Partial | Altyapı var, gerçek eşleştirme test edilmeli |
| Uyum bazlı eşleştirme | ❌ Not Started | Algoritma entegrasyonu yapılacak |
| Görüşme sonu seçenekler | ❌ Not Started | Takip Et / Beğen / Sonraki butonları |
| Jeton kesme per session | 🟡 Needs Testing | Logic var, test edilmeli |

---

## Tab 4: Eşleşme (Matches)

| Feature | Status | Notes |
|---------|--------|-------|
| Eşleşmeler tab | ✅ Done | Grid görünümü |
| Mesajlar tab | ✅ Done | Chat listesi |
| Beğenenler tab | ✅ Done | Blurlu görünüm (paket bazlı) |
| Takipçiler tab | ❌ Not Started | Yeni tab — blurlu/net paket bazlı |
| Kim Gördü tab | ✅ Done | Kilit ikonu (paket bazlı) |
| Text messaging | ✅ Done | Temel mesajlaşma çalışıyor |
| Voice call (mesajlaşma içi) | 🟡 Partial | UI var, WebRTC entegrasyonu eksik |
| Video call (mesajlaşma içi) | 🟡 Partial | UI var, WebRTC entegrasyonu eksik |
| Selam Gönder | 🟡 Needs Testing | Jeton kesme kontrol edilmeli |
| Okundu Bilgisi | 🟡 Partial | Premium+ kontrolü uygulanmalı |
| Buz Kırıcı Oyunlar | ❌ Not Started | Yeni özellik — V1'e eklenecek |
| Empty state | ✅ Done | "Henüz Eşleşmen Yok" + "Keşfet'e Git" |

---

## Tab 5: Profil (Profile)

| Feature | Status | Notes |
|---------|--------|-------|
| Profil görünümü | ✅ Done | Kapak fotoğrafı, isim, yaş, şehir, badge'ler |
| Hakkımda grid | ✅ Done | 12 bilgi kartı (Yaş, Cinsiyet, Şehir, İş, etc.) |
| Profil Gücü bar | ✅ Done | %32 gösteriyor, ipuçları veriyor |
| Profilini Öne Çıkar (Boost) | ✅ Done | 24 saat 10x görünürlük CTA |
| "X kişi gördü — Premium ile öğren" | ✅ Done | Upsell CTA çalışıyor |
| Kaşif görevleri | ✅ Done | 5 profili keşfet, timer, progress bar |
| Bu Haftanın Yıldızları | ✅ Done | 3 kategori tab'ı görünüyor |
| Düzenle — Kişilik Testi | ✅ Done | 5 soru, 1 dakika |
| Düzenle — Profil Videosu | ✅ Done | 10-30 sn video ekleme UI |
| Düzenle — Fotoğraflar | ✅ Done | 3x3 grid, min 2 max 9, "Ana" etiketi |
| Düzenle — Hedefim | ✅ Done | 5 seçenek |
| Düzenle — Hakkımda Daha Fazlası | ✅ Done | 12 alan (Kilo → Değerler) |
| Düzenle — İlgi Alanları | ✅ Done | Max 15 seçim |
| Düzenle — Prompt'larım | ✅ Done | Max 3 soru |
| Düzenle — Sevdiğin Mekanlar | ✅ Done | Max 8, kategoriler, popüler mekanlar |
| Settings | 🟡 Partial | Temel ayarlar var, bildirim tercihleri eksik |

---

## Monetization

| Feature | Status | Notes |
|---------|--------|-------|
| Paket ekranı (3 paket) | ✅ Done | Ücretsiz/Premium/Supreme görünüyor |
| Jeton mağazası | ✅ Done | 3 paket (79.99₺/199.99₺/349.99₺) |
| Boost mağazası | ✅ Done | 4 seçenek (120-1500 jeton) |
| In-app purchase (iOS) | ❌ Not Started | App Store entegrasyonu yapılacak |
| In-app purchase (Android) | ❌ Not Started | Google Play entegrasyonu yapılacak |
| Jeton kesme logic | 🟡 Partial | Bazı yerlerde çalışıyor, tümü test edilmeli |
| Paket limitleri enforcement | 🟡 Partial | Bazı limitler uygulanıyor, tümü kontrol edilmeli |
| AdMob reklam entegrasyonu | ❌ Not Started | Rewarded ads sistemi kurulacak |

---

## Yeni Özellikler (V1'e eklenecek)

| Feature | Status | Priority |
|---------|--------|----------|
| Günün Eşleşmesi | ❌ Not Started | Yüksek |
| Ortak Mekan Önerisi | ❌ Not Started | Orta |
| Mood Status | ❌ Not Started | Orta |
| Buz Kırıcı Oyunlar | ❌ Not Started | Yüksek |
| Haftalık Uyum Raporu | ❌ Not Started | Düşük |
| Eşleşme animasyonu (konfeti/kalp) | ❌ Not Started | Yüksek |
| Bumpy-tarzı animasyonlar | ❌ Not Started | Yüksek |

---

## Infrastructure & Deploy

| Feature | Status | Notes |
|---------|--------|-------|
| Railway backend deploy | 🟡 Issues | Deploy sorunları yaşanıyor |
| EAS APK build | 🟡 In Progress | Preview build kuyruğunda |
| Docker setup | ✅ Done | docker-compose.yml mevcut |
| CI/CD (GitHub Actions) | 🟡 Partial | Temel pipeline var |
| PostgreSQL | ✅ Done | Railway üzerinde çalışıyor |
| Redis | 🟡 Needs Setup | Cache layer kurulacak |
| Elasticsearch | ❌ Not Started | Kullanıcı arama için gerekecek |

---

## Next Steps (Priority Order)
1. 🔴 Apple Sign-In ekle (App Store zorunluluğu)
2. 🔴 Google Sign-In entegre et (şu an placeholder)
3. 🔴 Eşleşme animasyonları (konfeti/kalp) — Bumpy referansı
4. 🟡 Takipçiler tab'ını ekle (Eşleşme bölümünde)
5. 🟡 Buz Kırıcı Oyunlar implementasyonu
6. 🟡 Günün Eşleşmesi özelliği
7. 🟡 Canlı'da uyum bazlı eşleştirme
8. 🟡 WebRTC sesli/görüntülü arama (mesajlaşma içi)
9. 🟡 In-app purchase entegrasyonu (App Store + Google Play)
10. 🟡 AdMob reklam sistemi
