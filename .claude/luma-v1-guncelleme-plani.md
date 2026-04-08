# LUMA V1 — Güncelleme Planı
## Claude Code İçin Talimatlar

**Tarih:** 2026-04-08
**Hazırlayan:** Pelin (Founder) + Claude Cowork oturumu

---

## ÖZET

Luma'nın tüm MD dosyaları eski "Compatibility Room" konseptine göre yazılmıştı. Uygulama o zamandan beri tamamen farklı bir yapıya evrildi. Bu güncelleme planı, tüm MD dosyalarının yeni yapıya göre değiştirilmesini kapsar.

---

## DEĞİŞTİRİLECEK DOSYALAR (11 adet)

Aşağıdaki her dosyanın YENİ içeriği bu plandaki dosya ismiyle aynı adlı dosyada hazır. Eski içeriği SİL ve yeni içerikle DEĞİŞTİR.

### 1. CLAUDE.md (Ana talimat dosyası)
**Eski sorun:** 4 paket (Free/Gold/Pro/Reserved), 45 soru, 3 intention tag, Room konsepti
**Yeni içerik:** 3 paket (Ücretsiz/Premium/Supreme), 20+5 soru, 5 hedef, 5 tab mimari, jeton ekonomisi, tüm özellik tanımları

### 2. vision.md (Vizyon)
**Eski sorun:** "LUMA is not a swipe platform" yazıyordu (ama swipe var!)
**Yeni içerik:** Compatibility-first social discovery platform tanımı, Instagram+Tinder+Omegle vizyonu

### 3. monetization.md (Para modeli)
**Eski sorun:** Gold/Premium paketler, Room uzatma 99₺, tek soru analizi 69₺
**Yeni içerik:** 3 paket detaylı karşılaştırma tablosu, jeton ekonomisi, boost sistemi, reklam modeli

### 4. algorithm_spec.md (Algoritma)
**Eski sorun:** 1-5 Likert ölçeği, 25 premium soru, Gold paket referansları
**Yeni içerik:** 4 seçenekli 20 soru, 8 psikolojik kategori, skor hesaplama formülleri, Keşfet/Akış/Canlı/Günün Eşleşmesi sıralama algoritmaları

### 5. data_model.md (Veri modeli)
**Eski sorun:** Room entity, max 3 fotoğraf, Gold paket, RelationshipMode
**Yeni içerik:** Tüm entity'ler (User, Profile, Match, Follow, Story, Post, LiveSession, Jeton, Boost, Notification, vs.)

### 6. scope_lock.md (Kapsam kilidi)
**Eski sorun:** 5 dakika oda bekleme, 30 dakika ücretsiz oda, 99₺ uzatma
**Yeni içerik:** 3 paket, 20+5 soru, 5 hedef, 5 tab, skor 47-97, hiçbir özellik kilitli değil kuralı

### 7. agents.md (Agent ve Skill tanımları)
**Eski sorun:** Eski veya yetersiz agent tanımları
**Yeni içerik:** 14 özelleşmiş agent + 10 skill komutu

### 8. progress.md (İlerleme takibi)
**Eski sorun:** Güncel değil
**Yeni içerik:** Her özelliğin mevcut durumu (✅ Done / 🟡 Partial / ❌ Not Started)

### 9. roadmap.md (Yol haritası)
**Eski sorun:** Eski konsepte göre plan
**Yeni içerik:** 8 fazlı 16 haftalık geliştirme planı

### 10. decisions.md (Kararlar)
**Eski sorun:** Room konsepti kararları
**Yeni içerik:** 14 güncel mimari karar (paket sistemi, test yapısı, Canlı kuralları, vb.)

### 11. debug.md (Hata takibi)
**Eski sorun:** Eski hatalar
**Yeni içerik:** Güncel Railway deploy sorunları, API URL, build durumu

---

## UYGULAMANIN GÜNCEL MİMARİSİ

### 5 Ana Tab
1. **Akış** — Instagram tarzı hikayeler + gönderiler (foto/video/yazı), Popüler/Takip tabları
2. **Keşfet** — Kart swipe sistemi (beğen/pas geç/süper beğeni), filtreler, boost
3. **Canlı** — Omegle tarzı rastgele video eşleştirme (SADECE keşif amaçlı)
4. **Eşleşme** — 5 alt tab: Eşleşmeler, Mesajlar, Beğenenler, Takipçiler, Kim Gördü
5. **Profil** — Profil yönetimi, ayarlar, gamification (Kaşif, Yıldızlar)

### 3 Paket (hiçbir özellik kilitli DEĞİL, sadece miktar farkı)
- **Ücretsiz** (0₺) — Tadımlık, her özelliği deneyebilir ama çok kısıtlı
- **Premium** (499₺/ay) — Her özelliğe erişim, makul limitlerle
- **Supreme** (1.199₺/ay) — Sınırsız + özel ayrıcalıklar, "En Popüler"

### 4 İlişki Türü
- **Takip** — Tek taraflı (Akış, profil, Canlı'dan)
- **Arkadaş** — Karşılıklı takip
- **Eşleşme** — Karşılıklı beğeni (Keşfet'ten)
- **Süper Beğeni** — Jeton ile özel beğeni

### Test Sistemi
- **Uyum Analizi** — 20 soru, ZORUNLU, uyum yüzdesi hesaplar (47-97 arası)
- **Kişilik Testi** — 5 soru, isteğe bağlı, profil etiketi verir ("Açık Fikirli" gibi)

### Jeton Ekonomisi
- Selam Gönder, Süper Beğeni, Boost, Canlı görüşme, sesli/görüntülü arama (free users)
- Satın alma: 79,99₺ / 199,99₺ (500) / 349,99₺ (1000)
- Kazanma: Kaşif görevleri, reklam izleme

### Giriş Sistemi
- Telefon + OTP (ana yöntem)
- Google Sign-In (eklenecek)
- Apple Sign-In (eklenecek — iOS App Store zorunlu)

### Yeni V1 Özellikleri
1. Günün Eşleşmesi (AI günlük öneri)
2. Ortak Mekan Önerisi (eşleşme sonrası mekan)
3. Mood Status (anlık ruh hali)
4. Buz Kırıcı Oyunlar (ilk mesaj kolaylaştırma)
5. Haftalık Uyum Raporu (gamification)

### Bildirim Sistemi (3 katman)
- Kritik: Eşleşme, mesaj, süper beğeni (her zaman push)
- Önemli: Takipçi, beğeni, arkadaşlık (varsayılan açık)
- Düşük: Hikaye görüntüleme, gönderi etkileşimi (varsayılan kapalı)

### Tasarım Hedefi
- Bumpy dating app referanslı animasyonlar
- Gradient temalar (pembe-şeftali light, mor-koyu premium)
- Mikro-animasyonlar (beğeni, takip, eşleşme)
- Eşleşme anında konfeti/kalp animasyonu

---

## CLAUDE CODE İÇİN TALİMAT

Yukarıdaki 11 dosyanın her birinin yeni içeriği aynı isimli dosyada hazır. Şu adımları izle:

1. Projedeki mevcut `CLAUDE.md` dosyasını aç
2. Tüm içeriği sil
3. Yeni CLAUDE.md içeriğini yaz
4. Kaydet
5. Diğer 10 dosya için aynısını tekrarla

**ÖNEMLİ:** Eski "Room" konsepti, "Gold/Pro/Reserved" paketleri ve "45 soru" yapısı TAMAMEN kaldırıldı. Bunlara hiçbir referans kalmamalı.

---

## SİLİNEBİLECEK ESKİ DOSYALAR

Eğer projede aşağıdaki dosyalar varsa ve eski konsepte aitse kontrol et:
- Eski agent dosyaları (`.claude/agents/` içinde Room konseptine referans verenler)
- Eski skill dosyaları (`.claude/skills/` içinde eski yapıya referans verenler)
