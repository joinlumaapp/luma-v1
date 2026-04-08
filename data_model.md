# LUMA V1 — Data Model

> Prisma ORM kaynak: `apps/backend/src/prisma/schema.prisma`
> Tum id alanlari UUID, tum tarihler UTC.

---

## 1. User Identity & Authentication

### User
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| phone | VARCHAR(20), UNIQUE | Telefon numarasi |
| phoneCountryCode | VARCHAR(5) | Ulke kodu (+90, vs.) |
| isSmsVerified | BOOLEAN | SMS dogrulandi mi |
| isSelfieVerified | BOOLEAN | Selfie dogrulandi mi |
| isFullyVerified | BOOLEAN | Tum dogrulamalar tamamlandi mi |
| packageTier | PackageTier enum | FREE / PREMIUM / SUPREME |
| goldBalance | INT, default 0 | Jeton bakiyesi |
| displayId | VARCHAR(20), UNIQUE | Gorunen kullanici ID'si |
| isActive | BOOLEAN, default true | Aktif mi |
| deletedAt | TIMESTAMP, nullable | Soft delete |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Enum PackageTier:** `FREE` | `PREMIUM` | `SUPREME`

> Not: Prisma sema su an hala eski `GOLD / PRO / RESERVED` degerlerini iceriyor. Migration ile `FREE / PREMIUM / SUPREME` olarak guncellenecek.

### UserSession
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| accessToken | STRING | JWT access token |
| refreshToken | STRING, UNIQUE | JWT refresh token |
| deviceId | VARCHAR(255), nullable | Cihaz ID |
| deviceType | VARCHAR(20), nullable | ios / android |
| ipAddress | VARCHAR(45), nullable | |
| expiresAt | TIMESTAMP | Token bitis zamani |
| isRevoked | BOOLEAN, default false | Iptal edildi mi |
| createdAt | TIMESTAMP | |

### UserVerification
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| type | VerificationType enum | SMS / SELFIE |
| status | VerificationStatus enum | PENDING / VERIFIED / REJECTED / EXPIRED |
| otpCode | VARCHAR(72), nullable | Bcrypt hash (SMS icin) |
| otpExpiresAt | TIMESTAMP, nullable | OTP son kullanma zamani |
| otpAttempts | INT, default 0 | Deneme sayisi |
| selfieUrl | STRING, nullable | Selfie URL (selfie icin) |
| livenessScore | FLOAT, nullable | Canlilik skoru |
| faceMatchScore | FLOAT, nullable | Yuz eslestirme skoru |
| rejectionReason | STRING, nullable | Red nedeni |
| verifiedAt | TIMESTAMP, nullable | Dogrulama zamani |
| createdAt | TIMESTAMP | |

### DeviceToken
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| token | STRING, UNIQUE | Push notification token |
| platform | VARCHAR(10) | ios / android |
| isActive | BOOLEAN, default true | |
| createdAt | TIMESTAMP | |

---

## 2. Profile System

### UserProfile
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User), UNIQUE | 1:1 iliski |
| firstName | VARCHAR(50) | Ad |
| lastName | VARCHAR(50), nullable | Soyad |
| birthDate | DATE | Dogum tarihi |
| gender | Gender enum | MALE / FEMALE / OTHER |
| bio | VARCHAR(500), nullable | Biyografi |
| intentionTag | IntentionTag enum | Hedef etiketi |
| city | VARCHAR(100), nullable | Sehir |
| country | VARCHAR(100), nullable | Ulke |
| latitude | FLOAT, nullable | Enlem |
| longitude | FLOAT, nullable | Boylam |
| locationUpdatedAt | TIMESTAMP, nullable | Konum guncelleme zamani |
| isComplete | BOOLEAN, default false | Profil tamamlandi mi |
| lastActiveAt | TIMESTAMP | Son aktiflik zamani |
| currentMood | VARCHAR(20), nullable | Mood durumu ("Sohbete acigim", "Bugün sessizim", vs.) |
| moodSetAt | TIMESTAMP, nullable | Mood ayarlanma zamani (24h sonra sifirlanir) |
| interestTags | STRING[], default [] | Ilgi alanlari (max 15) |
| voiceIntroUrl | STRING, nullable | Sesli tanitim URL |
| voiceIntroDuration | FLOAT, nullable | Sesli tanitim suresi (sn) |
| height | INT, nullable | Boy (cm, 150-220) |
| education | VARCHAR(50), nullable | Egitim durumu |
| smoking | VARCHAR(20), nullable | iciyor / icmiyor / bazen |
| drinking | VARCHAR(20), nullable | iciyor / icmiyor / sosyal |
| exercise | VARCHAR(20), nullable | aktif / bazen / nadiren |
| zodiacSign | VARCHAR(20), nullable | Burc |
| religion | VARCHAR(50), nullable | Din |
| jobTitle | VARCHAR(100), nullable | Meslek |
| children | VARCHAR(30), nullable | var / yok / istiyor / istemiyor |
| weight | INT, nullable | Kilo (kg) |
| sexualOrientation | VARCHAR(30), nullable | Cinsel yonelim |
| educationLevel | VARCHAR(30), nullable | lise / universite / yuksek_lisans / doktora |
| maritalStatus | VARCHAR(30), nullable | Medeni durum |
| pets | VARCHAR(30), nullable | var / yok / istiyor |
| lifeValues | VARCHAR(200), nullable | Hayat degerleri |
| isIncognito | BOOLEAN, default false | Kesfet'te gizlenme modu |
| mbtiType | VARCHAR(4), nullable | INTJ, ENFP, vs. |
| enneagramType | VARCHAR(2), nullable | 1-9 |
| videoUrl | STRING, nullable | Profil video URL |
| videoKey | STRING, nullable | Video S3 key |
| videoThumbnailUrl | STRING, nullable | Video thumbnail |
| videoDuration | INT, nullable | Video suresi (sn) |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**Enum IntentionTag:** `SERIOUS_RELATIONSHIP` | `EXPLORING` | `NOT_SURE` | `MARRIAGE` | `FRIENDSHIP` | `LEARN_CULTURES` | `TRAVEL`

### UserPhoto
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| url | STRING | Foto URL |
| thumbnailUrl | STRING, nullable | Kucuk boyut URL |
| order | INT, default 0 | Siralama (0-5, max 6 foto) |
| isPrimary | BOOLEAN, default false | Ana foto mu |
| isApproved | BOOLEAN, default false | Moderasyon onayli mi |
| moderationScore | FLOAT, nullable | AI moderasyon skoru |
| createdAt | TIMESTAMP | |

> **Max 6 foto** per user. order=0 olan ana foto.

### ProfilePrompt
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| question | VARCHAR(200) | Prompt sorusu |
| answer | VARCHAR(300) | Kullanici cevabi |
| order | INT, default 0 | 0, 1, 2 (max 3 prompt) |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**UNIQUE:** (userId, order) -- kullanici basina max 3 prompt.

### UserFavoriteSpot
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| name | VARCHAR(100) | Mekan adi |
| category | VARCHAR(30) | park / kafe / sahil / restoran / bar / muze / semt / doga / tarihi / eglence |
| order | INT, default 0 | Siralama |
| createdAt | TIMESTAMP | |

> Max 8 per user.

---

## 3. Compatibility System

### CompatibilityQuestion
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| questionNumber | INT, UNIQUE | Soru numarasi (1-20 core, 21-45 premium) |
| category | QuestionCategory enum | Soru kategorisi |
| textEn | STRING | Ingilizce metin |
| textTr | STRING | Turkce metin |
| weight | FLOAT, default 1.0 | Agirlik (1.0 / 1.2 / 1.5) |
| isPremium | BOOLEAN, default false | Premium soru mu |
| order | INT | Gosterim sirasi |
| isActive | BOOLEAN, default true | |
| createdAt | TIMESTAMP | |

**Enum QuestionCategory (Core):** `COMMUNICATION` | `LIFE_GOALS` | `VALUES` | `LIFESTYLE` | `EMOTIONAL_INTELLIGENCE` | `RELATIONSHIP_EXPECTATIONS` | `SOCIAL_COMPATIBILITY`

**Enum QuestionCategory (Premium):** `ATTACHMENT_STYLE` | `LOVE_LANGUAGE` | `CONFLICT_STYLE` | `FUTURE_VISION` | `INTELLECTUAL` | `INTIMACY` | `GROWTH_MINDSET` | `CORE_FEARS`

### QuestionOption
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| questionId | UUID (FK -> CompatibilityQuestion) | |
| labelEn | STRING | Ingilizce etiket |
| labelTr | STRING | Turkce etiket |
| value | FLOAT | 0-1 normalize deger |
| order | INT | Siralama |

### UserAnswer
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| questionId | UUID (FK -> CompatibilityQuestion) | |
| optionId | UUID (FK -> QuestionOption) | |
| answeredAt | TIMESTAMP | |

**UNIQUE:** (userId, questionId) -- soru basina tek cevap.

### CompatibilityScore
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userAId | UUID (FK -> User) | Kullanici A (dusuk ID) |
| userBId | UUID (FK -> User) | Kullanici B (yuksek ID) |
| baseScore | FLOAT | 0-100, 20 core sorudan |
| deepScore | FLOAT, nullable | 0-100, tum sorulardan |
| finalScore | FLOAT | Agirlikli kombinasyon |
| level | CompatibilityLevel enum | NORMAL / SUPER |
| dimensionScores | JSON, nullable | { communication: 85, values: 72, ... } |
| calculatedAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

**UNIQUE:** (userAId, userBId)
**Enum CompatibilityLevel:** `NORMAL` | `SUPER` (>= 90 = Super Uyum)

### DailyQuestionAnswer
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| questionId | UUID (FK -> CompatibilityQuestion) | |
| optionId | UUID (FK -> QuestionOption), nullable | |
| dayNumber | INT | Gun numarasi |
| createdAt | TIMESTAMP | |

**UNIQUE:** (userId, dayNumber)

---

## 4. Discovery & Matching (Kesfet)

### Swipe
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| swiperId | UUID (FK -> User) | Kaydiran kullanici |
| targetId | UUID (FK -> User) | Hedef kullanici |
| action | SwipeAction enum | LIKE / PASS / SUPER_LIKE |
| comment | VARCHAR(200), nullable | Begeni ile gonderilen yorum |
| createdAt | TIMESTAMP | |

**UNIQUE:** (swiperId, targetId) -- ayni kisiye iki kez kaydirilmaz.
**Enum SwipeAction:** `LIKE` | `PASS` | `SUPER_LIKE`

### DailySwipeCount
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| date | DATE | Gun |
| count | INT, default 0 | O gunun kaydir sayisi |
| createdAt | TIMESTAMP | |

**UNIQUE:** (userId, date)

### Match
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userAId | UUID (FK -> User) | |
| userBId | UUID (FK -> User) | |
| compatibilityScore | FLOAT | Uyum yüzdesi |
| compatibilityLevel | CompatibilityLevel enum | NORMAL / SUPER |
| animationType | MatchAnimationType enum | NORMAL / SUPER_COMPATIBILITY |
| isActive | BOOLEAN, default true | Aktif eslestirme mi |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |
| unmatchedAt | TIMESTAMP, nullable | Eslestirme bozulma zamani |

**UNIQUE:** (userAId, userBId)
**Enum MatchAnimationType:** `NORMAL` | `SUPER_COMPATIBILITY` (2 animasyon tipi)

> Eslestirme: Karsilikli begeni (Kesfet'ten) -> Match olusur.
> Normal = standart kalp animasyonu, Super Compatibility = ozel konfeti animasyonu.

### FeedView
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| viewedUserId | UUID (FK -> User) | |
| viewedAt | TIMESTAMP | |

> Anti-repeat: 24 saat icinde ayni profili tekrar gostermemek icin.

### DailyPick
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| pickedUserId | UUID (FK -> User) | |
| date | DATE | Gunun tarihi |
| isViewed | BOOLEAN, default false | |
| isLiked | BOOLEAN, default false | |
| createdAt | TIMESTAMP | |

**UNIQUE:** (userId, pickedUserId, date)

> Gunluk 10 yuksek-uyum profil onerisi (Gunun Eslesmesi).

---

## 5. Follow System (Akis / Profil / Canli)

### UserFollow
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| followerId | UUID (FK -> User) | Takip eden |
| followingId | UUID (FK -> User) | Takip edilen |
| createdAt | TIMESTAMP | |

**UNIQUE:** (followerId, followingId)

> Tek tarafli takip. Karsilikli takip = Arkadas (computed, ayri tablo yok).
> Takip kaynaklari: Akis (hikaye/gonderi), Profil sayfasi, Canli gorusme.

---

## 6. Stories (Hikayeler -- 24 saat)

### Story
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| mediaUrl | STRING | Medya URL |
| mediaType | VARCHAR(10) | image / video |
| overlays | TEXT, nullable | JSON overlay verisi (sticker, metin, vs.) |
| expiresAt | TIMESTAMP | Bitis zamani (created + 24h) |
| deletedAt | TIMESTAMP, nullable | Soft delete |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

> Instagram tarzi hikayeler. 24 saat sonra otomatik sona erer.

### StoryView
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| storyId | UUID (FK -> Story) | |
| viewerId | UUID (FK -> User) | |
| viewedAt | TIMESTAMP | |

**UNIQUE:** (storyId, viewerId)

### StoryLike
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| storyId | UUID (FK -> Story) | |
| userId | UUID (FK -> User) | |
| createdAt | TIMESTAMP | |

**UNIQUE:** (storyId, userId)

---

## 7. Posts (Gonderiler -- Kalici)

### Post
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| postType | VARCHAR(10) | photo / video / text |
| content | TEXT | Gonderi metni / basligi |
| photoUrls | STRING[] | Foto URL listesi |
| videoUrl | STRING, nullable | Video URL |
| likeCount | INT, default 0 | Denormalize begeni sayisi |
| deletedAt | TIMESTAMP, nullable | Soft delete |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

### PostLike
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| postId | UUID (FK -> Post) | |
| userId | UUID (FK -> User) | |
| createdAt | TIMESTAMP | |

**UNIQUE:** (postId, userId)

---

## 8. Messaging & Calls

### ChatMessage
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| matchId | UUID (FK -> Match) | Mesaj hangi eslestirmeye ait |
| senderId | UUID (FK -> User) | Gonderen |
| content | STRING | Mesaj icerigi |
| type | ChatMessageType enum | TEXT / IMAGE / GIF / VOICE / SYSTEM |
| status | ChatMessageStatus enum | SENT / DELIVERED / READ / DELETED |
| mediaUrl | STRING, nullable | Medya URL (gorsel/ses) |
| mediaDuration | FLOAT, nullable | Ses suresi (sn) |
| metadata | JSONB, nullable | Link preview vs. ek veri |
| readAt | TIMESTAMP, nullable | Okunma zamani |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

### MessageReaction
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| messageId | UUID (FK -> ChatMessage) | |
| userId | UUID (FK -> User) | |
| emoji | VARCHAR(20) | Emoji tepkisi |
| createdAt | TIMESTAMP | |

**UNIQUE:** (messageId, userId)

### CallHistory
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| matchId | UUID (FK -> Match) | |
| callerId | UUID (FK -> User) | Arayan |
| receiverId | UUID (FK -> User) | Aranan |
| callType | CallType enum | VOICE / VIDEO |
| status | CallStatus enum | RINGING / ANSWERED / REJECTED / MISSED / CANCELLED |
| startedAt | TIMESTAMP | Arama baslangici |
| answeredAt | TIMESTAMP, nullable | Cevaplanma zamani |
| endedAt | TIMESTAMP, nullable | Bitis zamani |
| durationSeconds | INT, nullable | Sure (sn) |
| goldCost | INT | Jeton maliyeti |
| endedBy | UUID, nullable | Bitirenin user ID'si |
| goldTransactionId | UUID, nullable | Ilgili jeton islemi |
| deletedByCaller | BOOLEAN, default false | Arayan sildi mi |
| deletedByReceiver | BOOLEAN, default false | Aranan sildi mi |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

### IcebreakerSession
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| matchId | UUID (FK -> Match) | |
| gameType | VARCHAR(50) | Oyun tipi |
| status | VARCHAR(20), default "active" | Oyun durumu |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

> Buz Kirici Oyunlar -- eslestirme sonrasi ilk mesaji kolaylastirmak icin.

### IcebreakerAnswer
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| sessionId | UUID (FK -> IcebreakerSession) | |
| userId | UUID (FK -> User) | |
| questionId | STRING | Soru kimlik bilgisi |
| answer | TEXT | Kullanicinin cevabi |
| createdAt | TIMESTAMP | |

**UNIQUE:** (sessionId, userId, questionId)

### DatePlan
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| matchId | UUID (FK -> Match) | |
| proposedById | UUID (FK -> User) | Oneren kullanici |
| title | VARCHAR(100) | Plan basligi |
| suggestedDate | TIMESTAMP, nullable | Onerilen tarih |
| suggestedPlace | VARCHAR(200), nullable | Onerilen mekan |
| note | VARCHAR(300), nullable | Ek not |
| status | DatePlanStatus enum | PROPOSED / ACCEPTED / DECLINED / COMPLETED / CANCELLED |
| respondedAt | TIMESTAMP, nullable | Yanitlanma zamani |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

> Ortak Mekan Onerisi -- eslestirme sonrasi bulusma planlama.

---

## 9. Jeton Economy (Virtual Currency)

### GoldTransaction
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| type | GoldTransactionType enum | Islem tipi |
| amount | INT | Pozitif = alis/kazanc, Negatif = harcama |
| balance | INT | Bu islem sonrasi bakiye |
| description | VARCHAR(255) | Islem aciklamasi |
| referenceId | UUID, nullable | Referans (boost ID, badge ID, vs.) |
| createdAt | TIMESTAMP | |

**Enum GoldTransactionType:**
- Kazanc: `PURCHASE` | `SUBSCRIPTION_ALLOCATION` | `REFERRAL_BONUS` | `BADGE_REWARD` | `STREAK_REWARD` | `DAILY_LOGIN`
- Harcama: `PROFILE_BOOST` | `SUPER_LIKE` | `READ_RECEIPTS` | `UNDO_PASS` | `SPOTLIGHT` | `TRAVEL_MODE` | `PRIORITY_MESSAGE` | `VOICE_CALL` | `VIDEO_CALL`

---

## 10. Profile Boost

### ProfileBoost
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| startedAt | TIMESTAMP | Baslangic |
| endsAt | TIMESTAMP | Bitis (baslangic + 30dk) |
| goldSpent | INT | Harcanan jeton |
| isActive | BOOLEAN, default true | Aktif mi |

> Profil boost: 30 dakika boyunca Kesfet'te one cikarir.

---

## 11. Subscription (3 Tier)

### Subscription
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| packageTier | PackageTier enum | PREMIUM / SUPREME |
| platform | PaymentPlatform enum | APPLE / GOOGLE / TRIAL |
| productId | VARCHAR(100) | Store urun ID |
| purchaseToken | STRING, nullable | Satin alma token |
| startDate | TIMESTAMP | Baslangic |
| expiryDate | TIMESTAMP | Bitis |
| isActive | BOOLEAN, default true | |
| autoRenew | BOOLEAN, default true | Otomatik yenileme |
| isTrial | BOOLEAN, default false | Deneme surumu mu |
| trialEndDate | TIMESTAMP, nullable | Deneme bitis zamani |
| gracePeriodEnd | TIMESTAMP, nullable | Odeme tolerans suresi |
| cancelledAt | TIMESTAMP, nullable | Iptal zamani |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

### IapReceipt
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| subscriptionId | UUID (FK -> Subscription), nullable | |
| platform | PaymentPlatform enum | APPLE / GOOGLE / TRIAL |
| receiptData | STRING | Makbuz verisi |
| transactionId | STRING, UNIQUE | Store islem ID |
| productId | VARCHAR(100) | Store urun ID |
| isValid | BOOLEAN | Gecerli mi |
| validationResponse | JSON, nullable | Store dogrulama yaniti |
| createdAt | TIMESTAMP | |

---

## 12. Notifications (3 Katman)

### Notification
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| type | NotificationType enum | Bildirim tipi |
| title | VARCHAR(200) | Baslik |
| body | VARCHAR(500) | Icerik |
| data | JSON, nullable | Ek veri (matchId, deeplink, vs.) |
| isRead | BOOLEAN, default false | Okundu mu |
| createdAt | TIMESTAMP | |

**Enum NotificationType:** `NEW_MATCH` | `NEW_MESSAGE` | `SUPER_LIKE` | `MATCH_REMOVED` | `BADGE_EARNED` | `SUBSCRIPTION_EXPIRING` | `RELATIONSHIP_REQUEST` | `SYSTEM` | `POST_LIKE` | `STORY_LIKE` | `NEW_FOLLOWER`

**3 Oncelik Katmani (uygulama seviyesinde):**
- **Kritik:** NEW_MATCH, NEW_MESSAGE, SUPER_LIKE -- her zaman push
- **Onemli:** NEW_FOLLOWER, POST_LIKE, BADGE_EARNED -- varsayilan acik
- **Dusuk:** STORY_LIKE, SYSTEM -- varsayilan kapali

### NotificationPreference
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User), UNIQUE | 1:1 iliski |
| newMatches | BOOLEAN, default true | Eslestirme bildirimleri |
| messages | BOOLEAN, default true | Mesaj bildirimleri |
| badges | BOOLEAN, default true | Rozet bildirimleri |
| system | BOOLEAN, default true | Sistem bildirimleri |
| allDisabled | BOOLEAN, default false | Tumu kapali |
| quietHoursStart | VARCHAR(5), default "23:00" | Sessiz saat baslangici |
| quietHoursEnd | VARCHAR(5), default "08:00" | Sessiz saat bitisi |
| timezone | VARCHAR(50), default "Europe/Istanbul" | Zaman dilimi |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

---

## 13. Badge & Achievement System

### BadgeDefinition
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| key | VARCHAR(50), UNIQUE | Rozet anahtari (orn: "first_spark") |
| nameEn | VARCHAR(100) | Ingilizce ad |
| nameTr | VARCHAR(100) | Turkce ad |
| descriptionEn | STRING | Ingilizce aciklama |
| descriptionTr | STRING | Turkce aciklama |
| iconUrl | STRING, nullable | Rozet ikonu |
| criteria | JSON | Kazanma kosullari |
| goldReward | INT, default 0 | Kazanilan jeton odulu |
| isActive | BOOLEAN, default true | |
| createdAt | TIMESTAMP | |

### UserBadge
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| badgeId | UUID (FK -> BadgeDefinition) | |
| earnedAt | TIMESTAMP | Kazanilma zamani |

**UNIQUE:** (userId, badgeId) -- ayni rozet iki kez kazanilamaz.

### LoginStreak
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User), UNIQUE | 1:1 iliski |
| currentStreak | INT, default 1 | Mevcut seri |
| longestStreak | INT, default 1 | En uzun seri |
| lastLoginDate | DATE | Son giris tarihi |
| totalGoldEarned | INT, default 0 | Toplam kazanilan jeton |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

### WeeklyReport
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| weekStart | DATE | Hafta baslangici (Pazartesi) |
| totalSwipes | INT, default 0 | Haftalik kaydir sayisi |
| totalLikes | INT, default 0 | Haftalik begeni sayisi |
| totalMatches | INT, default 0 | Haftalik eslestirme sayisi |
| avgCompatibility | FLOAT, default 0 | Ortalama uyum skoru |
| topCategory | VARCHAR(50), nullable | En guclu kategori |
| messagesExchanged | INT, default 0 | Mesaj sayisi |
| mostActiveDay | VARCHAR(10), nullable | En aktif gun |
| createdAt | TIMESTAMP | |

**UNIQUE:** (userId, weekStart)

---

## 14. Safety & Moderation

### Report
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| reporterId | UUID (FK -> User) | Sikayet eden |
| reportedId | UUID (FK -> User) | Sikayet edilen |
| category | ReportCategory enum | Sikayet kategorisi |
| details | VARCHAR(1000), nullable | Detay aciklama |
| status | ReportStatus enum | PENDING / REVIEWING / RESOLVED / DISMISSED |
| reviewedAt | TIMESTAMP, nullable | Inceleme zamani |
| reviewNote | STRING, nullable | Moderator notu |
| createdAt | TIMESTAMP | |

**Enum ReportCategory:** `FAKE_PROFILE` | `HARASSMENT` | `INAPPROPRIATE_PHOTO` | `SPAM` | `UNDERAGE` | `SCAM` | `OTHER`

### Block
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| blockerId | UUID (FK -> User) | Engelleyen |
| blockedId | UUID (FK -> User) | Engellenen |
| createdAt | TIMESTAMP | |

**UNIQUE:** (blockerId, blockedId)

---

## 15. Discovered Places (Ortak Mekan)

### DiscoveredPlace
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| name | VARCHAR(200) | Mekan adi |
| address | STRING, nullable | Adres |
| latitude | FLOAT | Enlem |
| longitude | FLOAT | Boylam |
| category | VARCHAR(50), nullable | restaurant / park / cafe / vs. |
| imageUrl | STRING, nullable | Mekan gorseli |
| createdAt | TIMESTAMP | |

### PlaceCheckIn
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| placeId | UUID (FK -> DiscoveredPlace) | |
| userId | UUID (FK -> User) | |
| relationshipId | UUID, nullable | Iliski baglami |
| checkedInAt | TIMESTAMP | |

### PlaceMemory
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| placeId | UUID (FK -> DiscoveredPlace) | |
| userId | UUID (FK -> User) | |
| note | VARCHAR(500), nullable | Anket notu |
| photoUrl | STRING, nullable | Ani fotosu |
| createdAt | TIMESTAMP | |

---

## 16. Relationship Mode

### Relationship
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userAId | UUID (FK -> User) | |
| userBId | UUID (FK -> User) | |
| status | RelationshipStatus enum | PROPOSED / ACTIVE / HIDDEN / ENDING / ENDED |
| isVisible | BOOLEAN, default true | Herkes gorebilir mi |
| activatedAt | TIMESTAMP, nullable | Aktiflesme zamani |
| endedAt | TIMESTAMP, nullable | Bitis zamani |
| deactivationInitiatedAt | TIMESTAMP, nullable | Sonlandirma baslangici |
| deactivationInitiatedBy | UUID, nullable | Sonlandirmayi baslatan |
| deactivationDeadline | TIMESTAMP, nullable | 48 saat onay suresi |
| createdAt | TIMESTAMP | |

**UNIQUE:** (userAId, userBId)

> Eslestirme sonrasi resmi iliski modu. 48 saatlik cikis onay sureci var.

### CoupleBadge
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| relationshipId | UUID (FK -> Relationship), UNIQUE | |
| badgeType | VARCHAR(50) | Cift rozeti tipi |
| issuedAt | TIMESTAMP | |

---

## 17. Couples Club

### CouplesClubEvent
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| title | VARCHAR(200) | Etkinlik adi (EN) |
| titleTr | VARCHAR(200) | Etkinlik adi (TR) |
| description | STRING | Aciklama (EN) |
| descriptionTr | STRING | Aciklama (TR) |
| eventDate | TIMESTAMP | Etkinlik tarihi |
| location | STRING, nullable | Konum |
| maxCouples | INT | Max cift sayisi |
| imageUrl | STRING, nullable | Gorsel |
| isActive | BOOLEAN, default true | |
| createdAt | TIMESTAMP | |

### CouplesClubParticipant
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| eventId | UUID (FK -> CouplesClubEvent) | |
| relationshipId | UUID (FK -> Relationship) | |
| rsvpStatus | VARCHAR(20) | attending / maybe / declined |
| joinedAt | TIMESTAMP | |

**UNIQUE:** (eventId, relationshipId)

---

## 18. Analytics

### AnalyticsEvent
| Alan | Tip | Aciklama |
|------|-----|----------|
| id | UUID (PK) | |
| userId | UUID (FK -> User) | |
| event | VARCHAR(100) | Olay adi |
| properties | JSON, default {} | Olay detaylari |
| sessionId | VARCHAR(50) | Oturum ID |
| platform | VARCHAR(20) | ios / android |
| appVersion | VARCHAR(20) | Uygulama versiyonu |
| clientTimestamp | TIMESTAMP | Client zamani |
| createdAt | TIMESTAMP | Server zamani |

---

## Entity Relationship Summary

```
User 1--1 UserProfile
User 1--* UserSession
User 1--* UserVerification
User 1--* UserPhoto (max 6)
User 1--* ProfilePrompt (max 3)
User 1--* UserFavoriteSpot (max 8)
User 1--* UserAnswer
User 1--* Swipe (given/received)
User *--* Match (via userA/userB)
User 1--* UserFollow (given/received)
User 1--* Story
User 1--* Post
User 1--* GoldTransaction
User 1--* Subscription
User 1--* Notification
User 1--1 NotificationPreference
User 1--* UserBadge
User 1--1 LoginStreak
User 1--* WeeklyReport
User 1--* ProfileBoost
User 1--* Report (made/received)
User 1--* Block (given/received)
User *--* Relationship (via userA/userB)

Match 1--* ChatMessage
Match 1--* IcebreakerSession
Match 1--* CallHistory
Match 1--* DatePlan

Story 1--* StoryView
Story 1--* StoryLike

Post 1--* PostLike

ChatMessage 1--* MessageReaction

IcebreakerSession 1--* IcebreakerAnswer

Relationship 1--1 CoupleBadge
Relationship 1--* CouplesClubParticipant

BadgeDefinition 1--* UserBadge

CompatibilityQuestion 1--* QuestionOption
CompatibilityQuestion 1--* UserAnswer
CompatibilityQuestion 1--* DailyQuestionAnswer

DiscoveredPlace 1--* PlaceCheckIn
DiscoveredPlace 1--* PlaceMemory

CouplesClubEvent 1--* CouplesClubParticipant
```

---

## Notes

1. **Jeton = Gold**: Uygulama icinde "jeton" olarak adlandirilan sanal para, Prisma'da `goldBalance` / `GoldTransaction` olarak tanimli. Her iki terim de ayni seyi ifade eder.

2. **3 Paket**: Ucretsiz (FREE), Premium (PREMIUM), Supreme (SUPREME). Hicbir ozellik kilitli degil, sadece miktar/limit farki var.

3. **Foto Limiti**: Kullanici basina max 6 foto. `UserPhoto.order` 0-5 arasi. `isPrimary=true` olan ana foto.

4. **Soft Delete Patterni**: `User.deletedAt`, `Story.deletedAt`, `Post.deletedAt` alanlari soft delete icin kullanilir. `isActive` flagi da bazi modellerde mevcut.

5. **Canli (Live) Oturumlar**: Prisma'da henuz ayri bir `LiveSession` modeli yok. Canli video eslestirme WebSocket/Redis uzerinden yonetilir, kalici kayit gerektiginde `CallHistory` veya ayri bir tablo eklenecek.

6. **Bildirim Oncelikleri**: Prisma schemada `priority` alani yok, 3 katmanli oncelik uygulama seviyesinde (backend service) `NotificationType`'a gore belirlenir.

7. **Uyum Skoru Araligi**: `CompatibilityScore.finalScore` 0-100 arasi float. SUPER level >= 90.
