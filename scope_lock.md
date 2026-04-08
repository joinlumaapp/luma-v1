# LUMA Scope Lock -- Non-Negotiable Rules

These rules define the boundaries of LUMA V1. If any of these change, the scope lock is violated.

---

## Locked Numbers

| Item | Value | Notes |
|------|-------|-------|
| Paketler | **3** | Ucretsiz, Premium, Supreme |
| Uyum Analizi sorulari | **20** | Zorunlu, 4 secenek |
| Kisilik Testi sorulari | **5** | Istege bagli |
| Hedefler | **5** | Evlenmek, Iliski bulmak, Sohbet/Arkadas, Kulturleri ogrenmek, Dunyayi gezmek |
| Ana tab'lar | **5** | Akis, Kesfet, Canli, Eslesme, Profil |
| Eslesme alt tab'lari | **5** | Eslesmeler, Mesajlar, Begeniler, Takipciler, Kim Gordu |
| Iliski turleri | **4** | Takip, Arkadas, Eslesme, Super Begeni |
| Uyum skor araligi | **47-97** | 100% matematik olarak imkansiz |
| Super Uyum esigi | **90+** | Ozel UI efektleri tetikler |
| Maksimum fotograf | **9** | Profil basina (min 2, max 9) |
| Bildirim katmanlari | **3** | Kritik, Onemli, Dusuk |

---

## Locked Package System

- **3 paket ONLY**: Ucretsiz (0 TL), Premium (499 TL/ay), Supreme (1.199 TL/ay)
- **NO Gold, Pro, or Reserved packages** -- these are permanently removed
- Supreme is positioned as "En Populer"

### Core Rule: NO Feature Is Locked

Every feature in the app is accessible to ALL users (Ucretsiz included). Packages ONLY change **quantities and limits**, never access. Examples:

| Feature | Ucretsiz | Premium | Supreme |
|---------|----------|---------|---------|
| Kesfet swipe | Limited/gun | More/gun | Sinirsiz |
| Hikaye paylasimi | 1/gun | 5/gun | Sinirsiz |
| Canli gorusme | Limited/gun | More/gun | Sinirsiz |
| Gelismis filtreler | Temel set | Genisletilmis | Tam set |
| Okundu bilgisi | Hayir | Evet | Evet |
| Kim Gordu | Blur'lu | Net | Net + detay |
| Begeni gorunurlugu | 1-2 blurlu | Sinirli net | Sinirsiz net |
| Boost | Jeton ile satin al | 4/ay dahil | Sinirsiz |
| Gunun Eslesmesi | 1/hafta | 1/gun | 3/gun |

---

## Locked Score System

- Compatibility score range: **47-97**
- 100% is mathematically impossible
- **90+ = Super Uyum** (Super Compatibility) with special UI treatment
- Super Uyum triggers: glow animation, priority in Kesfet, ozel konfeti animasyonu, badge
- Package type NEVER alters compatibility scores

---

## Locked Relationship Types

| Type | Description |
|------|-------------|
| **Takip** | Tek tarafli follow (Akis, profil, Canli'dan) |
| **Arkadas** | Karsilikli takip |
| **Eslesme** | Karsilikli begeni (Kesfet'ten) |
| **Super Begeni** | Jeton ile ozel begeni |

---

## Locked Authentication

- Phone (OTP) -- primary, always available
- Google Sign-In -- planned
- Apple Sign-In -- planned (iOS App Store mandate)

---

## Locked Pricing

| Item | Fiyat |
|------|-------|
| Premium | 499 TL/ay |
| Supreme | 1.199 TL/ay |
| Jeton paketi 1 | 79,99 TL |
| Jeton paketi 2 | 199,99 TL (500 jeton) |
| Jeton paketi 3 | 349,99 TL (1000 jeton) |
| Boost | 1 boost = 120 jeton |

---

## Locked Jeton Economy

- Jeton-powered actions: Selam Gonder, Super Begeni, Boost, Canli gorusme, sesli/goruntulu arama (free users)
- Jeton kazanma: Kasif gorevleri, reklam izleme
- Jeton balance must be atomic (no race conditions)
- Aylik jeton: Ucretsiz 0, Premium 250, Supreme 1000

---

## Locked Canli Rules

- Canli tab = Omegle-style random video ONLY
- Voice/video calls between matched users = in Messaging section ONLY
- Canli costs jeton per session
- End-of-session options: Takip Et / Begen / Sonraki

---

## Locked Notification Tiers

| Tier | Examples | Default |
|------|----------|---------|
| Kritik | Eslesme, mesaj, super begeni, canli eslesme bulundu | Her zaman push |
| Onemli | Takipci, begeni, arkadaslik, gunun eslesmesi hazir | Varsayilan acik |
| Dusuk | Hikaye goruntuleme, gonderi etkilesimi, kasif gorevi hatirlatma | Varsayilan kapali |

---

## Locked Design Direction

- Reference: Bumpy dating app for animations/polish
- Gradient themes (pink-peach light, purple-dark premium)
- Smooth animations on all interactions
- Dark theme for Uyelik & Jeton screens
- Eslesme animasyonu: konfeti/kalp
- Super Uyum (90+): glow effect on profile cards

---

## Permanently Removed Concepts

These concepts are **permanently removed** from V1. They must never appear in code, UI, or documentation:

| Removed | Replaced By |
|---------|-------------|
| Room (Compatibility Room) | Kesfet swipe + Canli random video |
| 45-question system (20+25) | 20+5 system (Uyum Analizi + Kisilik Testi) |
| Gold package | Removed entirely |
| Pro package | Removed entirely |
| Reserved package | Removed entirely |
| Intention tags (3 adet) | 5 Hedefler |
| Likert 1-5 scale | 4 discrete choices |
| Room uzatma (99 TL) | Removed entirely |
| Tek soru analizi (69 TL) | Removed entirely |
| Premium questions (21-45) | Removed entirely |

---

## What CAN Change (with founder approval)

- Question content (wording of the 20+5 questions)
- Category weights (the 8 psychological categories)
- Jeton costs per action (fine-tuning)
- UI layouts and component designs
- Notification copy/messaging
- Gamification mission types and rewards
- Popular places list content
- Ad placement positions
- Daily swipe/message limits per package (exact numbers)
