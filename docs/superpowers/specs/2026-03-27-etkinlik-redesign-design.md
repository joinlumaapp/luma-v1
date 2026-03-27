# LUMA Etkinlik Sekmesi Redesign — Design Spec

**Tarih:** 2026-03-27
**Durum:** Onaylandi

---

## 1. Genel Bakis

"Aktiviteler" sekmesi "Etkinlik" olarak yeniden adlandirilacak. Sekme tiklandiginda direkt tam ekran Google Maps haritasi acilir. Etkinlikler haritada kategoriye gore renkli pin'lerle gosterilir. Altta yatay kaydirilan etkinlik kartlari karuseli yer alir. Uyumluluk yuzdeleri kartlarda ve detay ekraninda belirgin sekilde gosterilir.

Kullanici etkinlikleri ve sehir etkinlikleri (konser, sergi, festival) ayni sekilde gosterilir, ayrim yoktur.

---

## 2. Sekme ve Navigasyon

- Tab adi: "Etkinlik" (eski: "Aktiviteler")
- Tab ikonu: Harita pin ikonu
- Tiklandiginda direkt harita ekrani acilir (ayri EventMap ekrani yok — harita ANA ekran)
- Mevcut ActivitiesScreen + EventMapScreen tek ekrana birlestiriliyor

---

## 3. Ana Ekran Yapisi

```
┌─────────────────────────────────┐
│ Etkinlik              🔍  ⚙️   │  Ust bar
├─────────────────────────────────┤
│ [Tumumu][Kahve][Yemek][Spor]... │  Kategori chip'leri (yatay scroll)
├─────────────────────────────────┤
│                                  │
│         Google Maps              │  Tam ekran harita
│    (react-native-maps)           │  ~70% ekran
│                                  │
│    Renkli pin'ler                │
│    Kullanici konumu (mavi)       │
│    Cluster'lar (zoom out)        │
│                                  │
├─────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐    │  Alt karusel
│ │Etknlk│ │Etknlk│ │Etknlk│ →  │  (yatay FlatList)
│ │ %85  │ │ %72  │ │ %68  │    │
│ └──────┘ └──────┘ └──────┘    │
│                          [＋]  │  Etkinlik olustur FAB
└─────────────────────────────────┘
```

---

## 4. Harita

### Teknoloji
- `react-native-maps` with `PROVIDER_GOOGLE`
- Google Maps API key zaten `app.config.ts`'de tanimli
- `react-native-map-clustering` ile pin kumeleme

### Varsayilan Gorunum
- Istanbul merkez: `{ latitude: 41.0452, longitude: 29.0343, latitudeDelta: 0.15, longitudeDelta: 0.15 }`
- Kullanici konumuna gore otomatik odaklanma (izin verildiyse)
- minZoomLevel: 10, maxZoomLevel: 18
- Koyu/muted harita stili (LUMA markasina uygun)

### Pin'ler
- Kategoriye gore renkli yuvarlak (36px) + emoji ikon + ucgen kuyruk
- Uyumluluk halesi: Katilimcilardan biri %70+ uyumluysa pin etrafinda mor parlama
- Kullanicinin katildigi etkinlikler: altin cerceve
- Populer etkinlikler (5+ katilimci): daha buyuk pin (44px) + katilimci sayisi badge

### Kumeleme (Cluster)
- Yakin pin'ler zoom out'ta kumelenir
- Cluster gorunumu: "Kadikoy'de 8 etkinlik" seklinde sayi gosterimi
- Cluster tikla: zoom in yaparak pin'leri ac
- Cluster radius: 50px

### Istanbul Ozellikleri
- Hizli filtre: "Avrupa Yakasi" / "Anadolu Yakasi" (longitude 29.02 siniri)
- Semt bazli cluster isimleri

---

## 5. Etkinlik Kartlari (Alt Karusel)

### Karusel Yapisi
- Yatay FlatList, snapToInterval ile hizalama
- Kart genisligi: ekran genisligi - 60px (yanlardan gorunme)
- Harita ile senkronize: karta tikla = pin vurgulanir, pin'e tikla = karusel kayar

### Kart Icerigi (Uyumluluk Odakli)
```
┌────────────────────────┐
│ ☕ Karakoy'de Kahve     │  Kategori ikonu + baslik
│ 📍 Karakoy • 1.2km     │  Konum + mesafe
│ 📅 Yarin, 15:00        │  Tarih/saat
│ 💜 3 kisi ile %80+ uyum│  Uyumluluk badge'i
│ 👥 4/6 kisi            │  Doluluk gostergesi
└────────────────────────┘
```

### Uyumluluk Badge Kurallari
- %80+ uyumlu katilimci varsa: mor badge "X kisi ile %80+ uyum"
- %60-79 arasi: acik mor badge "X kisi ile %60+ uyum"
- %60 altinda veya katilimci yoksa: badge gosterilmez
- Uyum hesaplanamadi (sorular tamamlanmamis): "Uyum icin sorulari tamamla"

### Kart Etkilesileri
- Tiklama: Etkinlik detay ekranina git + haritada pin vurgula
- Mesafe hesaplama: kullanici konumundan etkinlik konumuna

---

## 6. Kategori Sistemi (6 Kategori)

| Kategori | Ikon | Renk | Gradient |
|----------|------|------|----------|
| Kahve & Sohbet | ☕ | #92400E | #92400E → #78350F |
| Yemek & Icecek | 🍽️ | #B91C1C | #B91C1C → #991B1B |
| Spor & Doga | 🏃 | #065F46 | #065F46 → #064E3B |
| Kultur & Sanat | 🎨 | #7C3AED | #7C3AED → #6D28D9 |
| Gece & Eglence | 🎉 | #6D28D9 | #6D28D9 → #5B21B6 |
| Diger | 📌 | #6B7280 | #6B7280 → #4B5563 |

Filtre chip'leri:
- "Tumumu" (varsayilan secili)
- 6 kategori chip'i
- Secilen chip kategori renginde gosterilir
- Harita ve karusel filtreye gore guncellenir

---

## 7. Etkinlik Detay Ekrani

Karta tiklandiginda acilan detay ekrani:

```
┌─────────────────────────────────┐
│ ← Geri          ☕ Kahve & Sohbet│
├─────────────────────────────────┤
│ Karakoy'de Kahve Bulusmasi      │  Baslik
│ 📍 Karakoy, Beyoglu             │  Konum
│ 📅 29 Mart 2026, 15:00          │  Tarih
│ 👥 4/6 kisi katiliyor           │  Doluluk
│ 📏 1.2 km uzaklikta             │  Mesafe
├─────────────────────────────────┤
│ Aciklama:                        │
│ "Deniz manzarali cafede          │
│  sohbet edelim..."               │
├─────────────────────────────────┤
│ Katilimcilar:                    │
│                                  │
│ 👩 Elif    💜 %87 uyum           │
│   [Birlikte Gidelim]            │
│                                  │
│ 👨 Mehmet  💜 %72 uyum           │
│   [Birlikte Gidelim]            │
│                                  │
│ 👩 Zeynep  %45 uyum              │
│ 👨 Can     %38 uyum              │
│                                  │
├─────────────────────────────────┤
│ 🗺️ [Haritada Gor]               │  Mini harita preview
├─────────────────────────────────┤
│     [Katil]    [Paylas]          │
└─────────────────────────────────┘
```

### Katilimci Listesi
- Uyumluluk yuzdesine gore sirali (en yuksek ust)
- %60+ olan katilimcilara "Birlikte Gidelim" butonu gosterilir
- Her katilimcinin uyumluluk yuzdesi gorunur

---

## 8. "Birlikte Gidelim" Ozelligi

### Akis
1. Kullanici etkinlik detayinda %60+ uyumlu bir katilimciya "Birlikte Gidelim" tiklar
2. Karsi tarafa bildirim gider: "Elif seninle Karakoy kahve etkinligine birlikte gitmek istiyor"
3. Karsi taraf kabul/reddet
4. Kabul ederse: her iki kullaniciya bildirim + sohbet baslama imkani
5. Etkinlik kartinda "Birlikte geliyorlar" etiketi gosterilir

### Kurallar
- Sadece %60+ uyumlu katilimcilara gonderilebilir
- Bir etkinlik icin en fazla 3 teklif gonderilebilir (spam onleme)
- Teklif etkinlik tarihine kadar gecerli
- FREE kullanicilar: gunde 1 teklif, GOLD: 5, PRO: sinirsiz

---

## 9. Etkinlik Olusturma

Mevcut CreateActivityScreen korunur, su degisikliklerle:

- Kategori secimi: 11 → 6 kategoriye dusurulur
- Konum alani: metin alani korunur (ileride harita picker eklenebilir)
- Maks katilimci: 2-6 arasi (mevcut)
- Yeni: Etkinlik gorseli ekleme (opsiyonel, sehir etkinlikleri icin)

---

## 10. Geolocation

- "When In Use" izni — sadece Etkinlik sekmesinde konum istenir
- 5 dakika cooldown ile konum guncelleme
- Izin reddedilirse: Istanbul merkez varsayilan, manuel bolge secimi
- Gizlilik: Kesin konum asla diger kullanicilara gosterilmez, sadece mesafe

---

## 11. Performans

- Viewport bazli yukleme: sadece gorunen harita bolgesindeki etkinlikler yuklenir
- Pan bitiminde 500ms debounce ile yeni sorgu
- Pin'lerde `tracksViewChanges={false}` (performans icin kritik)
- Marker component'leri `React.memo` ile sarmalanir
- Maksimum 100 pin ayni anda render

---

## 12. Dosya Yapisi Degisiklikleri

### Silinecek/Birlestirilecek
- `EventMapScreen.tsx` → ActivitiesScreen'e entegre edilecek (ayri ekran kaldirilacak)

### Degisecek
- `ActivitiesScreen.tsx` → Tamamen yeniden yazilacak (harita-first)
- `ActivityDetailScreen.tsx` → Uyumluluk yuzdesi + "Birlikte Gidelim" eklenecek
- `CreateActivityScreen.tsx` → 6 kategoriye dusurulecek
- `activityService.ts` → Activity interface'e compatibilityScore, eventSource eklenecek
- `activityStore.ts` → Harita bolge filtresi, kategori filtresi eklenecek
- `MainTabNavigator.tsx` → Tab adi + ikonu degisecek, EventMap route kaldirilacak
- `navigation/types.ts` → EventMap route kaldirilacak, BirlikteGidelim route eklenecek

### Yeni
- `components/EventPin.tsx` — Harita pin componenti
- `components/EventCard.tsx` — Karusel kart componenti

---

## 13. Kapsam Disi (Sonraki Surum)

- Sehir etkinlikleri API entegrasyonu (Biletix, Passo)
- Heatmap (sicak bolgeler)
- "Su an musait" modu
- Post-event match onerisi
- Etkinlik check-in (geofenced)
- Google Directions ile seyahat suresi tahmini
- Etkinlik streak / badge sistemi
