# LUMA Oyun Merkezi (Game Center) — Design Spec

**Tarih:** 2026-03-27
**Durum:** Onaylandı
**Konum:** Aktiviteler sekmesi icinde
**Model:** Freemium (gunluk 3 oyun ucretsiz)

---

## 1. Genel Bakis

Aktiviteler sekmesinin ust bolumune entegre edilen "Oyun Odalari" sistemi. Kullanicilar canli grup oyunlarina katilir, sosyallesir ve oyun sonrasi baglanti onerileri alir.

Mevcut 191KB tek dosya (IcebreakerRoomScreen.tsx) moduler yapiya donusturulecek. Harmony Room'un altyapisi korunup game-room modulu olarak genisletilecek.

---

## 2. Ekran Yapisi

### Aktiviteler Sekmesi Duzeni

Ust bolum: Yatay scroll ile Oyun Odalari kartlari + kategori filtreleri
Alt bolum: Mevcut yakinlardaki aktiviteler feed'i (degismez)

### Ekran Akisi

```
Aktiviteler Sekmesi
├── Oyun Odalari (ust bolum)
│   ├── Kategori filtreleri (Klasikler, Buz Kiricilar, Yarisma, Uyumluluk)
│   ├── Aktif oda kartlari (yatay scroll)
│   └── "Oda Olustur" butonu
│
├── Yakinlardaki Aktiviteler (alt bolum, mevcut)
│
└── Tiklanan Oda → Oyun Lobisi Ekrani
    ├── Oda bilgisi (oyun turu, oyuncu sayisi)
    ├── Oyuncu listesi (avatar + isim)
    ├── Sohbet alani
    ├── "Hazirim" butonu
    └── Oyun basladiginda → Oyun Ekrani
        ├── Oyun alani (oyuna ozel UI)
        ├── Sohbet + reaksiyonlar
        ├── Skor tablosu
        └── Oyun bitti → Sonuc Ekrani
            ├── Siralama
            ├── Baglanti onerileri
            └── "Tekrar Oyna" / "Baska Oda"
```

---

## 3. Oyun Turleri

### 4 Kategori, 8 Oyun

#### Klasikler (Gradient: #FF6B35 → #FF8C42)

| Oyun | Oyuncu | Sure | Aciklama |
|------|--------|------|----------|
| UNO | 2-6 | 10-15dk | Klasik UNO kurallari. Renk + sayi kartlari, +2, +4, renk degistir, ters, pas. Son kart "UNO!" butonu |
| Okey | 2-4 | 15-20dk | Basitlestirilmis Okey. 4 renk, 13 sayi. Per olustur, ilk bitiren kazanir |

#### Buz Kiricilar (Gradient: #00C9FF → #92FE9D)

| Oyun | Oyuncu | Sure | Aciklama |
|------|--------|------|----------|
| Dogruluk mu Cesaret mi | 2-6 | 10dk | Sirayla cark cevirir. Dogruluk: flortoz/eglenceli soru. Cesaret: mini gorev. Pas hakki gunde 2 |
| Iki Dogru Bir Yalan | 2-6 | 8dk | Her turda bir kisi 3 cumle yazar. Digerleri yalani bulmaya calisir. Dogru tahmin = +10 puan, kandirma = +5 puan |

#### Yarismalar (Gradient: #FC466B → #3F5EFB)

| Oyun | Oyuncu | Sure | Aciklama |
|------|--------|------|----------|
| Trivia Quiz | 2-6 | 8dk | 10 soru, kategoriler: Genel Kultur, Sinema, Muzik, Ask & Iliskiler, Turkiye. 15sn cevap suresi. Hizli cevap = bonus puan |
| Kelime Savasi | 2-4 | 8dk | Verilen harflerden en uzun kelimeyi bul. 30sn sure. Turkce sozluk dogrulamasi |
| Emoji Tahmin | 2-6 | 8dk | Sirayla biri emoji ile film/sarki/unlu anlatir, digerleri tahmin eder. 45sn sure |

#### Uyumluluk (Gradient: #F857A6 → #FF5858)

| Oyun | Oyuncu | Sure | Aciklama |
|------|--------|------|----------|
| Uyumluluk Challenge | 2-6 | 10dk | 10 ikili tercih sorusu. Herkes ayni anda cevaplar. Ayni cevap = puan. Oyun sonunda uyumluluk yuzdesi |

---

## 4. Ortak Mekanikler

### Tum Oyunlarda

- **Sohbet**: Oyun sirasinda metin sohbet (freemium sinirli)
- **Reaksiyonlar**: 6 emoji (hizli gonderim, animasyonlu)
- **Skor tablosu**: Canli guncellenen siralama
- **Baglanti skoru**: Mesaj, reaksiyon, sure bazli otomatik hesaplama
- **Oyun sonu**: Siralama + en uyumlu kisi onerisi + "Baglanti Gonder" butonu

### Freemium Limitler

| Ozellik | Ucretsiz | Gold | Pro |
|---------|----------|------|-----|
| Gunluk oyun hakki | 3 | 10 | Sinirsiz |
| Oyun ici mesaj | 5/oyun | 20/oyun | Sinirsiz |
| Oda olusturma | 1/gun | 5/gun | Sinirsiz |
| Ozel oda (sifreli) | Hayir | Evet | Evet |
| Baglanti onerisi gorme | 1/oyun | 3/oyun | Tumu |

---

## 5. Lobi Sistemi

### Kurallar

- Minimum oyuncu: 2
- Maksimum oyuncu: Oyuna gore (2-6)
- Herkes "Hazirim" deyince 5sn geri sayim baslar
- 5 dakika icinde yeterli oyuncu gelmezse oda kapanir
- Oda sahibi ayrilirsa en eski oyuncu yeni sahip olur
- AFK korumasi: 60sn uyari, 90sn otomatik cikis

### Oda Durumlari

```
WAITING → READY_CHECK → COUNTDOWN → PLAYING → FINISHED
   │          │                         │
   └── CANCELLED                        └── ABANDONED
```

---

## 6. WebSocket Event Yapisi

### Client → Server

```
game:join_room        → Odaya katil
game:leave_room       → Odadan cik
game:ready            → Hazirim
game:unready          → Hazir degilim
game:action           → Oyun ici hamle (oyuna ozel payload)
game:send_message     → Sohbet mesaji
game:react            → Emoji reaksiyon
game:rematch          → Tekrar oyna talebi
```

### Server → Client

```
game:room_updated     → Oda durumu degisti
game:player_ready     → Bir oyuncu hazir oldu
game:countdown_start  → 5sn geri sayim basladi
game:started          → Oyun basladi
game:turn             → Sira kimde
game:action_result    → Hamle sonucu (tum oyunculara)
game:score_update     → Skor guncellendi
game:message          → Sohbet mesaji geldi
game:reaction         → Reaksiyon geldi
game:finished         → Oyun bitti + sonuclar
game:connection_score → Baglanti skoru hesaplandi
game:error            → Hata mesaji
game:afk_warning      → AFK uyarisi
```

---

## 7. Backend Mimari

### Modul Yapisi

```
backend/src/modules/
├── harmony/              (mevcut, dokunulmaz)
└── game-room/
    ├── game-room.module.ts
    ├── game-room.controller.ts    (REST: oda listele, olustur)
    ├── game-room.service.ts       (is mantigi)
    ├── game-room.gateway.ts       (WebSocket)
    ├── dto/
    │   ├── create-room.dto.ts
    │   ├── join-room.dto.ts
    │   └── game-action.dto.ts
    ├── guards/
    │   └── room-access.guard.ts   (freemium kontrol)
    └── engines/
        ├── base-game.engine.ts    (ortak oyun mantigi)
        ├── uno.engine.ts
        ├── okey.engine.ts
        ├── truth-dare.engine.ts
        ├── would-you-rather.engine.ts
        ├── trivia.engine.ts
        ├── word-battle.engine.ts
        ├── emoji-guess.engine.ts
        └── compatibility.engine.ts
```

### Veritabani Tablolari

```
GameRoom
├── id, creatorId, gameType, status
├── maxPlayers, currentPlayers
├── isPrivate, roomCode (sifreli oda icin)
├── createdAt, startedAt, endedAt

GameRoomPlayer
├── id, roomId, userId
├── isReady, isHost, score
├── joinedAt, leftAt

GameRoomMessage
├── id, roomId, senderId
├── content, type (TEXT/REACTION/SYSTEM)
├── createdAt

GameHistory
├── id, roomId, gameType
├── winnerId, duration
├── playerScores (JSON)
├── connectionScores (JSON)
├── createdAt
```

---

## 8. Mobile Dosya Yapisi

```
screens/activities/
├── ActivitiesScreen.tsx          (mevcut, ustune Oyun Odalari eklenir)
├── gameRoom/
│   ├── GameLobbyScreen.tsx       (lobi - oyuncular, sohbet, hazirlik)
│   ├── GamePlayScreen.tsx        (oyun yonlendirici - dogru oyunu yukler)
│   ├── GameResultScreen.tsx      (sonuc, siralama, baglanti onerisi)
│   ├── components/
│   │   ├── RoomCard.tsx          (oda karti)
│   │   ├── PlayerList.tsx        (oyuncu avatarlari)
│   │   ├── GameChat.tsx          (oyun ici sohbet)
│   │   ├── ScoreBoard.tsx        (skor tablosu)
│   │   └── ReactionBar.tsx       (emoji reaksiyonlar)
│   └── games/
│       ├── UnoGame.tsx
│       ├── OkeyGame.tsx
│       ├── TruthOrDare.tsx
│       ├── WouldYouRather.tsx
│       ├── TriviaQuiz.tsx
│       ├── WordBattle.tsx
│       ├── EmojiGuess.tsx
│       └── CompatibilityChallenge.tsx
```

---

## 9. Baglanti Skoru Sistemi

### Sinyal Agirliklari

| Sinyal | Agirlik | Aciklama |
|--------|---------|----------|
| Mesaj sayisi | x3 | Sohbet ettiler |
| Reaksiyon sayisi | x2 | Birbirlerine tepki verdiler |
| Direkt yanit | x5 | Birbirlerine ozel mesaj |
| Odada gecen sure | x0.02 | Uzun sure birlikteydiler |
| Oynanan tur | x1 | Oyunu birlikte oynadilar |
| Emoji kullanimi | x1.5 | Duygusal ifade |
| Sesli sohbet (dk) | x8 | Ses ile bag kurduler |
| Ayni cevap (uyumluluk) | x4 | Benzer dusunuyorlar |
| Birbirine guldu | x3 | Eglendiler |
| Rematch teklifi | x10 | Tekrar oynamak istiyorlar |
| Profil goruntuleme | x6 | Merak ettiler |

### Baglanti Seviyeleri

| Skor | Seviye | Mesaj |
|------|--------|-------|
| 80-100 | Mukemmel | "Harika anlastiniz!" |
| 60-79 | Guclu | "Guzel bir baglanti!" |
| 40-59 | Iyi | "Tanismaya deger!" |
| 0-39 | — | Gosterilmez |

---

## 10. Animasyonlar

| Ani | Animasyon | Sure |
|-----|-----------|------|
| Odaya katilim | Avatar bounce ile gelir | 400ms |
| Hazirim | Yesil halka pulse | loop |
| Geri sayim | 5-4-3-2-1 buyuyup kuculen | 5sn |
| Oyun baslangici | Isik patlamasi | 600ms |
| Dogru cevap | Confetti + yesil flash | 800ms |
| Yanlis cevap | Kirmizi titreme (shake) | 300ms |
| UNO kart cekme | Desteden ele ucar | 400ms |
| UNO kart oynama | Elden ortaya ucar + donme | 350ms |
| "UNO!" butonu | Altin parlti + buyume | 500ms |
| Reaksiyon | Emoji yukariya suzulur | 1.5sn |
| Cark cevirme | Donen cark, yavaslar | 2sn |
| Skor artisi | Sayi yukari sayar + bounce | 600ms |
| Siralama acilisi | Kartlar flip ile acilir | 300ms/kart |
| Baglanti onerisi | Kalp pulse + avatarlar yaklasir | 1sn |
| Uyumluluk yuzdesi | Daire dolarak animasyonlu sayar | 1.2sn |

### Haptic Feedback

| Olay | Tip |
|------|-----|
| Kart oynama | Light impact |
| Dogru cevap | Success notification |
| Yanlis cevap | Error notification |
| UNO! | Heavy impact |
| Oyun sonu | Success notification |
| Baglanti eslesmesi | Heavy impact x 2 |

### Ses Efektleri (opsiyonel, kapatilabilir)

| Olay | Ses |
|------|-----|
| Odaya katilim | Soft "ding" |
| Geri sayim | Tick-tick-tick |
| Oyun baslangici | Upbeat jingle (1sn) |
| Kart oynama | "whoosh" |
| Dogru cevap | Pozitif "pling" |
| Cark donusu | Tikirtili donus sesi |
| Oyun sonu | Fanfare (2sn) |
| Baglanti onerisi | Soft romantic chime |

### Karanlik Mod

- Arka planlar: #1A1A2E → #16213E gradient
- Kart yuzeyleri: #0F3460 hafif transparan
- Metin: #E0E0E0 (birincil), #A0A0A0 (ikincil)
- Kategori renkleri korunur, parlaklik %80'e dusurulur

---

## 11. Kapsam Disi (V2 icin)

- Sesli/goruntulu sohbet (Harmony Room'da var, game room V2'de)
- Turnuva sistemi / liderlik tablosu
- Ozel oyun icerikleri (sezonluk sorular, ozel kartlar)
- Izleyici modu (oyunu izleme)
- Arkadas davet etme (deep link ile)
