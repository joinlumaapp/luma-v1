# Seni Kim Gördü — Ekran Yeniden Tasarımı

**Tarih:** 2026-03-31
**Yaklaşım:** Timeline Feed — merak odaklı, premium'a yönlendiren canlı aktivite akışı
**Dosya:** `apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx`
**Store:** `apps/mobile/src/stores/viewersStore.ts`

---

## Amaç

Mevcut "Seni Kim Gördü" ekranı boş ve düşük değerli hissettiriyor. Bu yeniden tasarım:
- Ekranı canlı ve aktif gösterecek
- "Birisi bana bakıyor" hissini güçlü şekilde verecek
- Merak psikolojisiyle kullanıcıyı premium'a yönlendirecek
- Teaser sistemiyle tat verip daha fazlasını istetecek

---

## Ekran Yapısı (Yukarıdan Aşağıya)

### 1. Header

- Sol: geri butonu (chevron-back, 42x42 yuvarlak surface)
- Orta: "Seni Kim Gördü" başlık + "X ziyaretçi" alt yazı
- Sağ: göz ikonu badge + toplam ziyaretçi sayısı
  - Göz ikonu her 4 saniyede bir blink animasyonu (scale 1→0.85→1, 350ms döngü)

### 2. Özet İstatistik Kartı

Gradient kart (primary %12 → pink %06), borderRadius: 20, border: primary %20.

3 satır (sayı > 0 olan satırlar gösterilir):
- `👁 X kişi bugün profiline baktı` — `viewers.filter(v => isToday(v.lastViewedAt)).length`
- `🔁 X kişi geri geldi` — `viewers.filter(v => v.viewCount > 1).length`
- `💜 X kişi yoğun ilgi gösterdi` — `viewers.filter(v => v.viewCount >= 3).length`

Tüm sayılar 0 ise: "Profiline henüz bakılmadı" tek satır.

Her satır: emoji (24px) + metin (body, semibold). Dikey gap: 8px. Padding: 18px.

### 3. Timeline Kartları

Dikey timeline düzeni: sol kenar çizgisi (1px, surfaceBorder) + her kartın solunda daire nokta (8px, primary).

**Kart anatomisi:**
- Sol: 56x56 bulanık avatar
  - Gradient ring: purple[400] → pink[500], 3px
  - İçeride profil fotoğrafı, blurRadius: 20
  - Hafif glow: avatar etrafında %15 opacity mor ring
- Sağ:
  - Ana metin: aktivite açıklaması (body, semibold, colors.text)
  - Zaman: "2 dk önce" (caption, textTertiary)
  - Tekrar ziyaret: "Bu kişi profiline X kez baktı" (12px, pink[400]) — viewCount > 1 ise

**Aktivite metin çeşitleri (rastgele seçilir, viewer.id hash ile deterministik):**
1. "Birisi profilini inceledi"
2. "Birisi profiline göz attı"
3. "Profiline tekrar bakıldı"
4. "Birisi profilinde zaman geçirdi"
5. "Profilin ilgi çekti"

**Teaser Sistemi (Kilit Mantığı):**
- İlk kart (index 0) = TEASER: dokunulunca blurRadius 20→12'ye animasyonla düşer (300ms easeOut). Asla tam açılmaz. İkinci dokunuşta premium upgrade alert.
- Kart index >= 1 = KİLİTLİ: blur sabit, küçük kilit ikonu overlay. Dokunulunca direkt premium upgrade alert.
- Premium kullanıcılar (Gold+): tüm kartlar blurRadius: 8, dokunulunca profil ekranına navigate.

**Giriş Animasyonu:**
- Kartlar ilk render'da: translateY: 20→0 + opacity: 0→1
- Sıralı gecikme: her kart 100ms arayla
- Süre: 400ms, easing: easeOut

### 4. Premium Kilit Bölümü

Timeline kartlarının altında. Ekranın premium dönüşüm noktası.

**Blurred Avatar Grid:**
- 4 bulanık avatar yan yana, hafif overlap (-8px marginLeft)
- Her biri: 48x48, borderRadius: 24, blurRadius: 25, border: 2px white
- Üzerine gradient overlay: transparent → colors.surface %80
- Satır ortada (alignItems: center)

**Metin:**
- Başlık: "Kimlerin baktığını gör" (h3, colors.text, ortalı)
- Alt metin: "Aç ve sana ilgi duyanları anında keşfet" (body, textSecondary, ortalı)

**CTA Butonu:**
- Tam genişlik (padding horizontal: 24)
- Height: 52, borderRadius: 16
- Gradient: purple[500] → purple[700]
- İçerik: diamond ikonu + "Premium ile Aç" (beyaz, bold)
- Dokunulunca: `navigation.navigate('MembershipPlans')`

**Kart stili:**
- backgroundColor: colors.surface
- border: 1px colors.surfaceBorder
- borderRadius: 24
- padding: 28
- Hafif shadow (shadows.small)

### 5. Boş Durum

Hiç viewer yoksa:
- Büyük göz ikonu (eye-off-outline, 48px, gradient daire içinde)
- "Henüz kimse bakmamış" başlık
- "Profilini zenginleştir, daha fazla kişi tarafından görün!" alt metin
- "Premium ile Öne Çık" gradient butonu

---

## Store Değişiklikleri

`viewersStore.ts` — mevcut yapı korunur, ek alan yok. Teaser/kilit mantığı tamamen UI tarafında:
- `isTeaser(index)` = `index === 0 && packageTier === 'FREE'`
- `isLocked(index)` = `index > 0 && packageTier === 'FREE'`
- Premium kullanıcılar için tüm kartlar açık

---

## Görsel Stil Kuralları

- Arka plan: `BrandedBackground` (mevcut Luma logo deseni, düşük opacity)
- Renkler: Luma tema sistemi (colors.*, palette.*)
- Tipografi: Poppins ailesi (mevcut typography.* tokenleri)
- Animasyonlar: react-native-reanimated veya Animated API
- Agresif motion yok — her şey yumuşak ve zarif
- Tam görünür profil yok — her zaman bir derece blur

---

## Dokunulmayan Alanlar

- Navigation yapısı değişmez (MatchesStack içinde ViewersPreview)
- Store API'si değişmez (fetchViewers, revealViewer aynı kalır)
- Shared types değişmez (ProfileViewer interface korunur)
- Backend endpoint'ler değişmez
