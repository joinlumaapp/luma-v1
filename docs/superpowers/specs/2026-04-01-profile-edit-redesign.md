# Profile Edit Redesign — Bumpy-Inspired Sectioned Layout

**Date:** 2026-04-01
**Screen:** EditProfileScreen (Profil Duzenle)
**File:** `apps/mobile/src/screens/profile/EditProfileScreen.tsx`
**Inspiration:** Bumpy dating app — sectioned profile editing with clear categories

## Problem Statement

The current EditProfileScreen has all fields in a single long scroll without clear visual separation. Fields like smoking, exercise, children are buried at the bottom. New fields (zodiac, pets, religion, weight, etc.) need to be added. Users need a clear, organized editing experience like Bumpy's categorized layout.

## Solution: 5-Section Categorized Profile Editor

Reorganize the existing 1,754-line EditProfileScreen into 5 clearly separated sections with headers, descriptions, and Bumpy-style row items. Add new profile fields. Show profile completion percentage at the top.

## Section 1: Medya (Photos & Video)

**Header:** "Medya" / "Fotograflarin ve videon"

### Photo Grid
- **3x3 grid** (9 slots) — upgrade from current 6 slots
- First slot: main photo badge
- Empty slots: gray background + blue (+) icon (Bumpy style)
- Drag-to-reorder with haptic feedback
- "Foto tuyolarina goz at" link below grid
- Tap photo → action sheet (Set Main / Delete / Replace)

### Photo Genius Toggle
- "Foto Dahisi" — AI picks best photo as primary
- Toggle switch with description: "En iyi fotograflarinizi otomatik olarak bulur ve ilk olarak gosterir"
- Bumpy has this exact feature

### Photo Verification CTA
- Turquoise/purple gradient button: "Fotograf dogrulamasini gec"
- Camera icon on right
- Shown only if user is not yet verified

### Profile Video
- Existing video section preserved (10-30s, upload progress)

## Section 2: Temel Bilgilerim (Basic Info)

**Header:** "Temel Bilgilerim" / "Kendiniz hakkinda genel bilgileri belirtin"

Each row: icon + label + value/placeholder + chevron (>). Bumpy-style list items.

| Icon | Field | Type | Notes |
|------|-------|------|-------|
| 👤 | Ad | read-only | Shows name with lock badge |
| 🎂 | Yas | read-only | Shows age calculated from birthDate |
| 🚻 | Cinsiyet | read-only | Shows gender |
| 💼 | Is | text input | 60 char limit, placeholder "Ekle" |
| 🏛 | Okul | text input | 80 char limit, placeholder "Ekle" |
| 📍 | Sehir | picker | 20 Turkish cities dropdown |
| 📏 | Boy | picker | 140-220 cm range |

### Intention Tag
- "Hedefim" subsection with description: "Baskalarina ne aradiginizi soyleyin"
- Current 3 chip options preserved: Ciddi Iliski, Kesfediyorum, Emin Degilim
- Single select, pill/chip style

## Section 3: Hakkimda Daha Fazlasi (Extended Info)

**Header:** "Hakkimda daha fazlasi" / "Uygun kisileri bulmak icin kendiniz hakkinda daha fazla bilgi belirtin"

New Bumpy-style detailed field list. Each row: icon + label + "Ekle >" or value + chevron.

| Icon | Field | Options | New? |
|------|-------|---------|------|
| ⚖ | Kilo | Free text or range picker | NEW |
| ⚥ | Cinsel Yonelim | Heterosexual, Gay, Lesbian, Bisexual, Other | NEW |
| ♍ | Burc | 12 zodiac signs | NEW |
| 🏋 | Egzersiz | Hic, Bazen, Sik (existing: Never/Sometimes/Often) | EXISTS (moved) |
| 🎓 | Egitim Seviyesi | Lise, Universite, Yuksek Lisans, Doktora | NEW |
| 💕 | Medeni Durum | Bekar, Bosanmis, Dul | NEW |
| 👶 | Cocuklar | Var, Yok, Istiyorum, Istemiyorum (existing) | EXISTS (moved) |
| 🍷 | Icki | Icmem, Bazen, Sosyal, Duzenli | NEW |
| 🚬 | Sigara | Icmem, Bazen, Duzenli, Tolere Ederim (existing) | EXISTS (moved) |
| 🐾 | Evcil Hayvanlar | Kedi, Kopek, Diger, Yok | NEW |
| 🕌 | Din | Islam, Hristiyan, Yahudi, Ateist, Agnostik, Diger | NEW |
| 🌐 | Degerler | Free text or multi-select tags | NEW |

### Implementation Notes
- Existing fields (Egzersiz, Sigara, Cocuklar) are MOVED from their current position to this section
- New fields need to be added to ProfileData interface in store
- New fields need backend support (PATCH /profiles)
- Each row taps to open a picker/modal for selection
- Selected value replaces "Ekle" placeholder

## Section 4: Kisiliğimi Tanit (Personality)

**Header:** "Kisligimi Tanit" / "Kendini ifade et, insanlarin seni tanimasi icin"

### Ilgi Alanlari (Interests)
- Emoji + text pill chips (existing, max 10)
- Bumpy-style: light blue background pills
- Multi-select from predefined list

### Promptlarim (Prompts)
- 3 prompt cards (existing)
- Bumpy style: "Bir Ipucu Sec" + "Ve cevabini yaz" + (+) button
- Each card is a white rounded rectangle
- Tap to select from prompt list, then type answer (200 char)

### Hakkimda (Bio)
- Free text area, 500 char limit with counter
- Description: "Canli ve ilgi cekici bir giris yaz"
- Placeholder: "Kendiniz hakkinda bir seyler soyleyin..."

### Sevdigim Mekanlar (Favorite Spots)
- Existing FavoriteSpotsEditor preserved
- Category-based spot selection

## Section 5: Uyum Sorulari (Compatibility Questions)

**Header:** "Uyum Sorulari" / "45 soru ile uyum puanini yukselt"

### Progress Display
- Circular or bar progress: "12/45 soru cevaplanmis"
- Percentage: "%27 tamamlandi"
- Color coded: red (<30%), orange (30-60%), green (>60%)

### Category Breakdown
Show answered/total per category:
- Iliski & Baglanma
- Yasam Tarzi
- Degerler & Inanclar
- Iletisim & Duygusal
- Gelecek Planlari

Each category: icon + name + "3/5 cevaplanmis" + progress bar

### CTA Button
- "Sorulara Devam Et" purple gradient button
- Navigates to compatibility questions screen
- Shows which category has unanswered questions

## Profile Completion Header

At the very top of the screen, above all sections:

```
← Profili Duzenle          %42 doldurulmus
   [====--------] progress bar
```

- Back arrow + title on left
- Completion percentage + thin progress bar
- Percentage calculated from: photos, bio, basic info, extended info, interests, prompts, compatibility questions
- Bar color: purple gradient fill on gray track

## Visual Design

### Section Headers
- Bold title (18px, Poppins_700Bold)
- Description text below (13px, Poppins_400Regular, textSecondary)
- 24px top margin between sections
- 8px gap between title and description

### Row Items (Bumpy-style)
- White/surface background card with 1px border (surfaceBorder)
- Border radius: 12px
- Padding: 16px horizontal, 14px vertical
- Left: icon (20px, textSecondary color)
- Middle: label text (15px, Poppins_500Medium)
- Right: value text or "Ekle" placeholder + chevron (>)
- Rows stacked with 8px gap

### Section Dividers
- 32px vertical spacing between sections
- Optional thin divider line (colors.divider)

## Implementation Scope

### Files to Modify
- `apps/mobile/src/screens/profile/EditProfileScreen.tsx` — major restructure into sections
- `apps/mobile/src/stores/profileStore.ts` — add new fields to ProfileData
- `packages/shared/src/types/user.ts` — add new fields to UserProfile type

### New Fields to Add (ProfileData + UserProfile)
```typescript
weight?: number | null;
sexualOrientation?: string | null;
zodiacSign?: string | null;
educationLevel?: string | null;
maritalStatus?: string | null;
alcohol?: string | null;
pets?: string | null;
religion?: string | null;
values?: string | null;
```

### Preserved (no changes to logic)
- Photo upload/delete/reorder flow
- Video upload flow
- Profile save/update API call
- Intention tag selection
- Interest tags selection
- Prompt editing
- Favorite spots editing
- Profile completion calculation (needs update to include new fields)

### Removed
- Nothing removed — all existing fields are reorganized into the new sections

## Success Criteria

- All fields organized into 5 clear sections with Bumpy-style headers
- New fields (zodiac, pets, religion, weight, alcohol, etc.) are functional
- Profile completion percentage shown at top
- Compatibility questions section with progress tracking
- Existing functionality (photos, video, bio, prompts) continues to work
- Clean, organized feel — not a single overwhelming scroll
