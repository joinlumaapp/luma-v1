# LUMA V1 — Project Instructions for Claude

## MANDATORY — Session-End .md Update Rule
**At the END of every session, before finishing, you MUST update all relevant .md files to reflect changes made during the session. This is not optional — it is a blocking requirement.**

Check and update these files based on what changed:
- `progress.md` — Mark completed features ✅, update in-progress 🟡, add new features
- `roadmap.md` — Update milestones, mark completed items
- `decisions.md` — Log any architecture or product decisions made
- `data_model.md` — If any Prisma schema or database changes were made
- `monetization.md` — If any package, jeton, or pricing changes were made
- `debug.md` — If any bugs were fixed or new known issues found
- `scope_lock.md` — If any locked numbers changed or concepts were removed

**Never end a session without checking this list.**

---

## Project Overview
LUMA is a premium compatibility-based dating & social discovery app. It combines meaningful matching with social features to create a platform where users find compatible people through algorithmic compatibility scoring, social content, and live interactions.

**Core Philosophy:** "Gerçek uyum için kendin ol." — Compatibility is the foundation. Every feature serves the goal of connecting compatible people.

## Tech Stack
- **Mobile**: React Native + TypeScript (apps/mobile/)
- **Backend**: Node.js + NestJS + TypeScript (apps/backend/)
- **Database**: PostgreSQL + Redis + Elasticsearch
- **Shared Types**: @luma/shared (packages/shared/)
- **Infrastructure**: AWS (Terraform in infrastructure/)
- **CI/CD**: GitHub Actions (.github/workflows/)
- **Real-time**: WebSocket (Socket.io) for messaging, live video, notifications
- **Video**: WebRTC for Canlı (live) random video matching
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Ads**: Google AdMob (rewarded ads for free users)

## Language Rules
- All code, comments, and technical documentation: **English**
- All user-facing strings and responses to the founder: **Turkish**
- Agent prompts are in English, output always in Turkish

## Code Standards
- TypeScript strict mode everywhere
- No `any` types
- All API endpoints must have input validation
- All business logic must have unit tests
- Follow NestJS module pattern for backend
- Follow React Navigation + Zustand for mobile
- Use Prisma ORM for database operations
- All shared types go in `packages/shared/`
- All API routes defined in `packages/shared/src/constants/api.ts`
- All WebSocket events defined in `packages/shared/src/constants/api.ts`

## Design Direction
- **Reference**: Bumpy dating app (animations, gradients, modern UI)
- Smooth card swipe transitions in Keşfet
- Konfeti/kalp animasyonu on match
- Gradient backgrounds (pink-to-peach theme)
- Soft, rounded UI elements
- Micro-animations on interactions (like, follow, boost)
- Dark theme for Üyelik & Jeton screens (purple/dark gradient)

---

## CRITICAL RULE — SESSION-END MD UPDATE

**Her oturum sonunda, yapılan tüm değişiklikleri ilgili .md dosyalarına yansıt.**

Bu kural zorunludur. Oturum boyunca yapılan her kod değişikliği, yeni özellik, bug fix, mimari karar veya kaldırılan özellik aşağıdaki dosyalarda güncellenmelidir:

| Dosya | Ne zaman güncelle |
|-------|-------------------|
| `progress.md` | Herhangi bir özellik tamamlandığında, durumu değiştiğinde veya yeni bir özellik eklendiğinde |
| `roadmap.md` | Yol haritasındaki bir madde tamamlandığında veya plan değiştiğinde |
| `decisions.md` | Yeni bir mimari veya ürün kararı alındığında |
| `data_model.md` | Veritabanı şeması değiştiğinde (yeni tablo, alan ekleme/çıkarma) |
| `algorithm_spec.md` | Uyumluluk algoritması değiştiğinde |
| `monetization.md` | Paket, jeton veya fiyatlandırma değiştiğinde |
| `debug.md` | Önemli bir bug çözüldüğünde veya bilinen sorun eklendiğinde |
| `CLAUDE.md` | Mimari kurallar, tech stack veya temel yapı değiştiğinde |
| `scope_lock.md` | Kilitli sayılar veya kaldırılan konseptler değiştiğinde |
| `vision.md` | Vizyon veya misyon ifadesi değiştiğinde |

**Güncelleme formatı:**
- Her değişikliğe tarih ekle (format: YYYY-MM-DD)
- Status değişikliklerini işaretle: ❌ Not Started → 🟡 In Progress → ✅ Done
- Kaldırılan özellikler için "Removed" notu ekle, silme
- Yeni eklenen özellikler için "Added on [tarih]" notu ekle

**Oturum sonu kontrol listesi:**
1. Bu oturumda hangi dosyalar değişti?
2. Bu değişiklikler hangi .md dosyalarını etkiliyor?
3. İlgili tüm .md dosyalarını güncelle
4. progress.md'deki "Last Updated" tarihini güncelle

---

## APP ARCHITECTURE — 5 Main Tabs

### Tab 1: Akış (Feed)
Instagram-like social feed with stories and posts.

**Top Section — Stories:**
- Horizontal scrollable story circles
- First circle: user's own story with "+" to add new
- Only stories from matched/followed users visible
- Stories expire after 24 hours
- Story creation limits by package (Ücretsiz: 1/gün, Premium: 5/gün, Supreme: Sınırsız)
- Supreme users' stories appear first (Hikaye Önde Gösterim)

**Post Creation:**
- "Gönderini paylaş..." input area
- 3 post types: Fotoğraf, Video, Yazı
- Each post shows: user avatar, name, verification badge, city, time ago, hedef tag (e.g., "Arkadaş Arıyorum")

**Feed Tabs:**
- **Popüler**: Posts from nearby users sorted by distance + uyum score + engagement. Visible to everyone.
- **Takip**: Posts only from users you follow.

**Interactions on posts:**
- Beğen (like with heart animation)
- Yorum (comment)
- Takip et (follow from post)
- Profili ziyaret et (visit profile)

### Tab 2: Keşfet (Discover)
Card-based swipe system for finding compatible people.

**Card Display:**
- Full-screen profile cards with photos
- Shows: name, age, city, uyum yüzdesi (compatibility %), hedef tag, kişilik tipi tag
- Swipe right = Beğen, Swipe left = Pas geç
- Swipe up = Süper Beğeni (costs jeton)

**Top Right Controls:**
- ⚡ Boost button (profilini öne çıkar)
- ⚙ Filter button (yaş, mesafe, cinsiyet, gelişmiş filtreler)

**Matching Logic:**
- Karşılıklı beğeni (mutual like) = Eşleşme → mesajlaşma açılır
- Tek taraflı beğeni → Eşleşme bölümünde "Beğenenler" tabında blurlu görünür
- Beğeni görünürlüğü: Ücretsiz (1-2 blurlu), Premium (sınırlı net), Supreme (sınırsız net)

**Empty State:**
- "Şu an yakınında yeni profil yok"
- "Filtreleri Genişlet" button
- "Tekrar Ara" link

**Filters (package-tiered):**
- Ücretsiz: Yaş aralığı, cinsiyet, mesafe (temel)
- Premium: + İlgi alanları, eğitim, yaşam tarzı
- Supreme: Tüm filtreler açık + gelişmiş kombinasyonlar

### Tab 3: Canlı (Live)
Omegle-style random video matching for instant connections.

**Screen Layout:**
- Full-screen camera view (user's own camera)
- Jeton counter (top right)
- "Uyumuna göre biriyle anında tanış" text
- "Bağlan" button (gradient pink-purple)

**How It Works:**
1. User taps "Bağlan"
2. System finds a compatible user (based on uyum score + filters)
3. Live video chat begins (jeton consumed)
4. At end of chat, options appear:
   - Takip Et → adds to following
   - Beğen → if mutual, creates match
   - Sonraki → skip to next person
5. Karşılıklı takip = Arkadaş olur

**Jeton Cost:**
- Each Canlı session costs jeton (exact amount defined in monetization.md)
- Ücretsiz users get limited daily sessions
- Supreme users: unlimited

**Important:** Voice/video calls between matched/friended users happen in the MESSAGING section, NOT in Canlı tab. Canlı is ONLY for random discovery.

### Tab 4: Eşleşme (Matches)
Central hub for all connections and communications.

**Scrollable Tabs (horizontal):**
1. **Eşleşmeler** — Grid of matched users (mutual likes from Keşfet)
2. **Mesajlar** — Chat list with matched/friended users. Supports: text, voice call, video call, selam gönder
3. **Beğenenler** — Users who liked you (blurlu for free, limited for premium, full for supreme)
4. **Takipçiler** — Users who follow you (blurlu for free, limited for premium, full for supreme)
5. **Kim Gördü** — Users who viewed your profile (package-gated)

**Empty State:**
- "Henüz Eşleşmen Yok"
- "Keşfet sekmesinde profilleri beğenerek eşleşme oluşturabilirsin."
- "Keşfet'e Git" button

**Messaging Features:**
- Text messages
- Voice call (between matched/friended users, costs jeton for free users)
- Video call (between matched/friended users, costs jeton for free users)
- Selam Gönder (icebreaker message, costs jeton)
- Okundu Bilgisi (read receipts — Premium+)
- Buz Kırıcı Oyunlar (icebreaker mini-games to start conversation)

### Tab 5: Profil (Profile)
User profile management and settings.

**Profile View:**
- Cover photo area
- Name, Age, Verification badge, Uyum yüzdesi badge
- City
- Kişilik tipi tag (e.g., "Açık Fikirli")
- Stats: Gönderi count, Takipçi count, Takip count
- Buttons: "Düzenle" + "Premium'a Geç" (or package upgrade CTA)
- Profil Gücü bar (% completion indicator with tips)
- "Profilini Öne Çıkar" (Boost — 24 saat 10x görünürlük)
- "X kişi profilini gördü — Premium ile öğren"

**Hakkımda Section (grid cards):**
Yaş, Cinsiyet, Şehir, İş, Eğitim, Çocuk, Sigara, Boy, Spor, Burç, Evcil Hayvan, Alkol

**Gamification Section:**
- **Kaşif** — Daily missions (e.g., "5 profili keşfet" → earn jeton). Timer for next mission.
- **Bu Haftanın Yıldızları** — Weekly leaderboard: En Çok Beğenilen, En Çok Mesaj, En Uyumlu. Resets every Monday.

**Profili Düzenle (Edit Profile):**
- Kişilik Tipi: "Kişilik Testini Çöz" (5 fun questions, 1 minute)
- Profil Videosu: 10-30 second video
- Fotoğraflar: Min 2, max 9 (3x3 grid). First photo = Ana (main profile photo)
- Hedefim: Evlenmek, Bir ilişki bulmak, Sohbet etmek ve arkadaşlarla tanışmak, Diğer kültürleri öğrenmek, Dünyayı gezmek
- Hakkımda Daha Fazlası: Kilo, Cinsel Yönelim, Burç, Egzersiz, Eğitim Seviyesi, Medeni Durum, Çocuklar, İçki, Sigara, Evcil Hayvanlar, Din, Değerler
- İlgi Alanları: Select up to 15
- Prompt'larım: Max 3 profile prompts (questions displayed on profile)
- Sevdiğin Mekanlar: Max 8 favorite places. Categories: Park, Kafe, Sahil. Popular places list (Istanbul-based: Kadıköy, Bebek Sahili, etc.)

**Settings (⚙ icon):**
- Account settings
- Notification preferences (3-tier system, see below)
- Privacy settings
- Package management
- Help & support
- Logout

---

## RELATIONSHIP SYSTEM

4 types of user connections:

| Type | How It Happens | Result |
|------|---------------|--------|
| **Takip** (Follow) | One-way from Akış, profile, or Canlı | See their posts in Takip tab |
| **Arkadaş** (Friend) | Mutual follow (both follow each other) | Enhanced visibility, messaging |
| **Eşleşme** (Match) | Mutual like in Keşfet | Full messaging + voice/video call |
| **Süper Beğeni** | Jeton-powered like in Keşfet | Notifies other user, priority visibility |

---

## AUTHENTICATION SYSTEM

**Login Screen:**
- Luma logo (3D heart)
- "Gerçek uyum için kendin ol."
- "Google ile bağlan" button
- "Apple ile bağlan" button (required for iOS App Store)
- "Telefon ile devam et" button (primary, red/pink gradient)
- "Zaten hesabın var mı? Giriş yap" link
- Terms & Privacy links at bottom

**Phone Auth Flow:**
- Country code selector (+90 Turkey default)
- Phone number input
- SMS OTP verification
- "Numaranı kimseyle paylaşmıyoruz." privacy notice

**Onboarding Flow (after auth):**
1. Basic info (name, birthday, gender)
2. Photo upload (min 2 required)
3. Uyum Analizi (20 questions — MANDATORY)
4. Hedef selection
5. City/location permission
6. Kişilik Testi (5 questions — OPTIONAL, can skip)
7. Welcome to app

---

## COMPATIBILITY SYSTEM

### Uyum Analizi (Compatibility Analysis)
- **20 questions**, mandatory during onboarding
- 4 answer options per question
- Progress bar shows completion (Soru 1/20, 2/20, etc.)
- "Atla" (Skip) option available but discouraged
- Results calculate **uyum yüzdesi** (compatibility %) between users
- Uyum score range: **47-97**, 90+ = **Süper Uyum**
- This is the CORE matching algorithm — all recommendations depend on it
- Questions cover: lifestyle, values, communication style, future plans, personality traits

### Kişilik Testi (Personality Quiz)
- **5 questions**, optional
- Quick and fun format
- Results assign a **kişilik tipi** tag shown on profile (e.g., "Açık Fikirli", "Lider ve kararlı", "Sessiz ve derin", "Eğlenceli ve enerjik", "Mantıklı ve analitik")
- Does NOT affect matching algorithm, purely cosmetic/social

---

## PACKAGE SYSTEM

**CRITICAL RULE: No feature is fully locked. Every feature is accessible to all users — only QUANTITY differs by package.**

### 3 Packages:
1. **Ücretsiz** (0₺/ay) — Tadımlık deneyim
2. **Premium** (499₺/ay) — Tam erişim, makul limitlerle
3. **Supreme** (1.199₺/ay) — Sınırsız + özel ayrıcalıklar, "En Popüler" badge

**IMPORTANT: There are NO other packages. Gold, Pro, Reserved are permanently removed concepts.**

**Detailed comparison table: See monetization.md**

### Jeton (Token) Economy:
- In-app currency for premium actions (DB field: `goldBalance`)
- Used for: Selam Gönder, Süper Beğeni, Boost, Canlı sessions
- Purchase packages: 79.99₺ (base), 199.99₺ (500, "EN POPÜLER"), 349.99₺ (1000)
- Supreme gets 1000 free jeton/month, Premium gets 250/month
- Earned through: Kaşif daily missions, watching ads (free users)

### Boost System:
- "24 saat boyunca profilini öne çıkar ve 10x daha fazla görünürlük kazan"
- Boost packages (jeton): 1 boost (120), 5 boost (500, %20 kaydet), 900 (%32 kaydet), 1500 (%37 kaydet, "EN POPÜLER")
- Supreme: Sınırsız boost
- Premium: 4 boost/ay included

---

## NEW FEATURES (V1)

### 1. Günün Eşleşmesi (Daily Match)
AI-powered daily recommendation based on uyum score + ilgi alanları + mesafe.
- Ücretsiz: 1/hafta
- Premium: 1/gün
- Supreme: 3/gün

### 2. Ortak Mekan Önerisi (Mutual Place Suggestion)
When two users match, system checks their "Sevdiğin Mekanlar" lists and suggests a meeting place if overlap exists.

### 3. Mood Status (Anlık Ruh Hali)
Quick status on profile: "Sohbete açığım", "Bugün sessizim", "Buluşmaya varım", "Kafede takılıyorum".
Active users with mood status get priority in feeds.

### 4. Buz Kırıcı Oyunlar (Icebreaker Games)
Mini-games to start conversations after matching:
- "2 Doğru 1 Yanlış"
- Quick question prompts
- "Bu mu O mu?" (This or That)

### 5. Haftalık Uyum Raporu (Weekly Compatibility Report)
Weekly summary sent to user:
- "Bu hafta X kişiyle %80+ uyumun vardı"
- "En aktif günün: Çarşamba"
- "Profil görüntülenme: X kişi"
- Gamification boost — keeps users engaged

---

## NOTIFICATION SYSTEM

3-tier notification architecture:

**Kritik (Always push, cannot disable):**
- Yeni eşleşme (new match)
- Yeni mesaj (new message)
- Süper beğeni aldın (received super like)
- Canlı eşleşme bulundu (live match found)

**Önemli (Default ON, user can disable):**
- Yeni takipçi
- Beğeni aldın
- Arkadaşlık oluştu
- Uyum sonucu hazır
- Günün eşleşmesi hazır

**Düşük Öncelik (Default OFF, user can enable):**
- Hikaye görüntüleme
- Gönderi etkileşimi (like/comment on post)
- Kaşif görevi hatırlatma
- Boost süresi bitti
- Haftalık rapor hazır

User can toggle each notification type individually in Settings.

---

## GAMIFICATION

### Kaşif (Explorer) Missions
- Daily missions that reward jeton
- Example: "5 profili keşfet" → +5 jeton
- Progress bar (0/5)
- Timer shows when next mission available
- Resets daily

### Bu Haftanın Yıldızları (Weekly Stars)
- Leaderboard with 3 categories:
  - En Çok Beğenilen (Most Liked)
  - En Çok Mesaj (Most Messages)
  - En Uyumlu (Most Compatible)
- Resets every Monday
- Visible on profile scroll-down

### Profil Gücü (Profile Strength)
- Percentage indicator showing profile completion
- Tips to improve: "İlgi alanlarını seç", "Profil videosu ekle", etc.
- Higher profile strength = better visibility in feeds

---

## AD SYSTEM
- Google AdMob integration for free users
- Rewarded ads: "Devam etmek için reklam izle" — watch ad to unlock temporary access
- Ads NEVER shown to Premium or Supreme users (Reklamsız Deneyim)
- Ad placements: between feed posts, before Canlı sessions, after keşfet card stack ends

---

## PERMANENTLY REMOVED CONCEPTS
These features/terms have been permanently removed from V1. Do NOT re-add them:
- **Gold/Pro/Reserved packages** — Only Ücretsiz/Premium/Supreme exist
- **Harmony Room** — All room-based features removed
- **Couples Club** — Removed from V1
- **Relationship module** — Removed from V1
- **Premium questions (25 extra)** — Only 20 core questions exist
- **Likert scale** — All questions use 4 discrete options
- **30-minute boost** — Boost duration is 24 hours

---

## LOCKED NUMBERS
- 3 packages: Ücretsiz, Premium, Supreme
- 20 compatibility questions, 4 options each
- 5 personality quiz questions
- 5 Hedef options: Evlenmek, İlişki, Sohbet/Arkadaş, Kültür, Dünya gezme
- Photos: min 2, max 9
- İlgi Alanları: max 15
- Prompt'larım: max 3
- Sevdiğin Mekanlar: max 8
- Profile Video: 10-30 seconds
- Uyum score range: 47-97, 90+ = Süper Uyum
- Boost duration: 24 hours

---

## ARCHITECTURE RULES
- Follow the module structure described above — do not invent new tabs or sections
- Package system: NEVER fully lock a feature, only limit quantities
- 3 packages ONLY: Ücretsiz, Premium, Supreme
- Jeton in UI = `goldBalance` in database
- All .md files MUST be updated at end of each session

## Available Agents
See `.claude/agents/` for department-specific agents.

## Available Skills
See `.claude/skills/` for quick-action slash commands.

## Reference Documents
- `monetization.md` — Detailed package comparison table & jeton pricing
- `algorithm_spec.md` — Compatibility algorithm specification
- `data_model.md` — Database schema and models
- `vision.md` — App vision and mission
- `roadmap.md` — Development roadmap
- `progress.md` — Current progress tracking
- `scope_lock.md` — Locked numbers and removed concepts
- `decisions.md` — Architecture and product decisions
