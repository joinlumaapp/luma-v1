# LUMA V1 — UI/UX Improvements Task

> **IMPORTANT**: Read this file completely before starting. Execute tasks in order. Mark each task ✅ when done.
> **Language rule**: All code, comments, variable names in ENGLISH. All user-facing strings in TURKISH.
> **Reference**: UI_UX_IMPROVEMENTS.md has detailed explanations for each item.

---

## Task 1: Update config.ts Constants

**File**: `apps/mobile/src/constants/config.ts`

Find and update these locked constants:

```
MAX_PHOTOS: 6 → 9
MENU_TABS: 4 → 5  (if not already 5)
PACKAGES: 4 → 3  (if still referencing 4 packages)
Total Questions: 45 → 20  (remove premium question count)
Intention Tags: 3 → 5
```

Update PACKAGE_TIERS — remove any references to `gold`, `pro`, `reserved`. Only these should exist:
```typescript
FREE = 'free'
PREMIUM = 'premium'  
SUPREME = 'supreme'
```

Remove HARMONY_CONFIG entirely if it still exists.

**Status**: ⬜

---

## Task 2: Redesign QuestionsScreen.tsx (Uyum Analizi)

**File**: `apps/mobile/src/screens/onboarding/QuestionsScreen.tsx`

This is the MOST IMPORTANT task. The current design is plain text + radio buttons, which looks boring and unusable for 20 questions.

### 2A: Remove all premium question logic
- Delete `isPremium` field from NormalizedQuestion interface
- Delete `showPremium` variable and all references to `selectedMode === 'serious_relationship'`
- Delete `showPremiumInterstitial` function entirely
- Delete the interstitial screen render block (the "Şimdi daha derin sorulara geçelim..." section)
- Delete `premiumBadge` view and styles
- Remove `isPremium` from the `.filter()` and `.map()` in the useEffect that fetches questions
- Only 20 questions should ever load — no premium/deep questions

### 2B: Replace progress bar with ring/circle progress
Replace the linear progress bar with a circular SVG ring progress indicator:
```typescript
// Replace the existing progressContainer with a centered ring
// Center of ring shows: current question number (large) / total (small)
// Ring fills with gradient (purple→pink) as user progresses
// Animate ring fill with withTiming on each question change
```

Use `react-native-svg` for the ring. The ring should be ~80px diameter, centered horizontally, with:
- Background ring: `rgba(139, 92, 246, 0.15)`
- Fill ring: gradient from `palette.purple[500]` to `palette.pink[400]`
- Center text: large number (current) + small "/20" below it

### 2C: Add question category emoji
Add a category badge below the ring progress:
```typescript
const QUESTION_CATEGORIES: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '🏖', label: 'Yaşam Tarzı' },
  2: { emoji: '💬', label: 'İletişim' },
  3: { emoji: '🏖', label: 'Yaşam Tarzı' },
  4: { emoji: '💰', label: 'Finansal Bakış' },
  5: { emoji: '💕', label: 'İlişki Değerleri' },
  6: { emoji: '👨‍👩‍👧', label: 'Aile' },
  7: { emoji: '🧠', label: 'Kişilik' },
  8: { emoji: '🎯', label: 'Hedefler' },
  9: { emoji: '💎', label: 'Değerler' },
  10: { emoji: '🗣', label: 'İletişim' },
  11: { emoji: '🏠', label: 'Yaşam Tarzı' },
  12: { emoji: '🎭', label: 'Sosyal Hayat' },
  13: { emoji: '⏰', label: 'Zaman Yönetimi' },
  14: { emoji: '💪', label: 'Sağlık' },
  15: { emoji: '🏋️', label: 'Fitness' },
  16: { emoji: '📱', label: 'Teknoloji' },
  17: { emoji: '👶', label: 'Gelecek Planları' },
  18: { emoji: '🌆', label: 'Yaşam Ortamı' },
  19: { emoji: '✈️', label: 'Seyahat' },
  20: { emoji: '💕', label: 'İlişki Değerleri' },
};
```

Display as a small centered badge: `[emoji] CATEGORY_NAME` in purple/pink color, uppercase, letter-spacing.

### 2D: Redesign option cards (NO radio buttons)
Replace radio button options with large, tappable cards:

```typescript
// Each option card should have:
// - Left: emoji icon in a rounded square background (40x40)
// - Center: option text (15px, medium weight)
// - Right: circular check indicator (empty when unselected, gradient fill when selected)
//
// Option emojis for each question — assign contextually relevant emojis:
// Q1 options: 📚 🎉 🏔 🎨
// Q2 options: 🗣 🧘 🤝 ✍️
// Q3 options: 🏖 🏛 🧗 🍽
// etc.
//
// Selected state:
// - border: 2px solid purple
// - background: subtle purple gradient (rgba(168,85,247,0.1))
// - scale: 1.03 (use Animated transform)
// - glow shadow effect
// - check circle: filled with gradient
//
// Unselected state after one is selected:
// - opacity: 0.6
// - no border highlight
```

Remove ALL radio button styles (`optionRadio`, `optionRadioDot`, etc.)

### 2E: Auto-advance after selection
When user taps an option:
1. Haptic feedback (already exists, keep it)
2. Show selected state animation (scale + glow)
3. Wait 700ms
4. Auto-advance to next question (no "Sonraki" button needed)
5. Remove the GlowButton "Sonraki"/"Tamamla" from footer
6. Keep only last question with a "Tamamla" button (since it submits)

```typescript
const handleSelectOption = useCallback((optionIndex: number) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setSelectedOption(optionIndex);
  
  if (!isLastQuestion) {
    // Auto-advance after delay
    setTimeout(() => {
      const newAnswers = { ...answers, [currentQuestion.id]: optionIndex };
      setAnswers(newAnswers);
      setSelectedOption(null);
      setCurrentIndex((prev) => prev + 1);
      setCardKey((prev) => prev + 1);
    }, 700);
  }
}, [isLastQuestion, answers, currentQuestion]);
```

### 2F: Add back button
Add a back button (← arrow) in the top-left corner:
```typescript
// Only show if currentIndex > 0
// On press: go back to previous question, restore previous answer
// Style: 36px circle, rgba(255,255,255,0.08) background
```

### 2G: Milestone celebrations
Every 5 questions (5, 10, 15), show a brief celebration overlay (1 second):
- Question 5: "🎉 Harika gidiyorsun!"
- Question 10: "💪 Yarısını tamamladın!"  
- Question 15: "⭐ Neredeyse bitti!"
- Question 20: Full celebration screen (already exists, keep it but improve)

Use a simple Animated.View with FadeIn/FadeOut, scale spring animation. Show for 1200ms then auto-dismiss.

### 2H: Move skip button
Move "Bu soruyu atla" from bottom center to top-right:
```typescript
// Small text: "Atla →"  
// Color: rgba(255,255,255,0.4)
// Position: absolute, top-right of header
// Font size: 13px
```

**Status**: ⬜

---

## Task 3: Add Apple Sign-In

**File**: `apps/mobile/src/screens/auth/WelcomeScreen.tsx`

Install the package:
```bash
npx expo install expo-apple-authentication
```

Add Apple Sign-In button ABOVE Google button:
```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

// In the render, add before Google button:
{Platform.OS === 'ios' && (
  <AppleAuthentication.AppleAuthenticationButton
    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
    cornerRadius={28}
    style={{ width: '100%', height: 52 }}
    onPress={handleAppleSignIn}
  />
)}
```

Create `handleAppleSignIn` function that:
1. Calls `AppleAuthentication.signInAsync()`
2. Gets the `identityToken` and `fullName`
3. Sends to backend auth endpoint (similar pattern to Google sign-in)
4. On success, navigates to onboarding or main app

Button order should be: Apple → Google → Phone

**Status**: ⬜

---

## Task 4: Add Takipçiler (Followers) Tab to Matches Screen

**File**: `apps/mobile/src/screens/matches/MatchesListScreen.tsx`

Add "Takipçiler" as the 4th tab (between Beğenenler and Kim Gördü):

```
Tabs: Eşleşmeler | Mesajlar | Beğenenler | Takipçiler | Kim Gördü
```

The Takipçiler tab should:
- Show a list of users who follow the current user
- Use the same list item component as Beğenenler
- Package gating: FREE = blurred avatars, PREMIUM = limited clear view, SUPREME = full access
- Empty state: "Henüz takipçin yok" + "Profilini paylaş ve takipçi kazan!"

**Status**: ⬜

---

## Task 5: Update Photo Grid to 3x3 (9 photos)

**File**: `apps/mobile/src/screens/profile/EditProfileScreen.tsx`
**File**: `apps/mobile/src/constants/config.ts`

- Change MAX_PHOTOS from 6 to 9 (in config.ts, done in Task 1)
- Update the photo grid layout from 2 columns to 3 columns
- Show 9 photo slots in a 3x3 grid
- First photo slot should have a "ANA" (main) badge
- Update the Turkish string: "en fazla 6 fotoğraf" → "en fazla 9 fotoğraf"
- Each slot: square aspect ratio, rounded corners (12px), dashed border for empty slots

**Status**: ⬜

---

## Task 6: Update IntentionTag to 5 Options

**File**: `apps/mobile/src/screens/onboarding/IntentionTagScreen.tsx`
**File**: `apps/mobile/src/screens/profile/EditProfileScreen.tsx` (if intention editing exists)

Update from 3 intention options to 5:

```typescript
const INTENTION_OPTIONS = [
  { value: 'evlenmek', label: 'Evlenmek', emoji: '💍' },
  { value: 'iliski', label: 'Bir ilişki bulmak', emoji: '💕' },
  { value: 'sohbet_arkadas', label: 'Sohbet etmek ve arkadaşlarla tanışmak', emoji: '💬' },
  { value: 'kultur', label: 'Diğer kültürleri öğrenmek', emoji: '🌍' },
  { value: 'dunya_gezme', label: 'Dünyayı gezmek', emoji: '✈️' },
];
```

Remove old options (serious_relationship, exploring, not_sure). 
Each option should be a large card with emoji on the left, Turkish label in the center.

**Status**: ⬜

---

## Task 7: Fix MatchDetailScreen — Remove Harmony Room

**File**: `apps/mobile/src/screens/matches/MatchDetailScreen.tsx`

Find the button/action "Uyum Odası Başlat" (Start Harmony Room) and replace with:
- Label: "Buz Kırıcı Oyun Başlat" 
- Icon: 🎮 (game controller)
- Action: navigate to IcebreakerGameScreen (or show a coming soon modal if screen doesn't exist yet)

Also remove any imports related to HarmonyRoom/HarmonySession from this file.

**Status**: ⬜

---

## Task 8: Clean Dev Bypass Code

**Files**:
- `apps/mobile/src/screens/auth/WelcomeScreen.tsx`
- `apps/mobile/src/screens/auth/OTPVerificationScreen.tsx`  
- `apps/mobile/src/screens/auth/EmotionalIntroScreen.tsx`

Find all instances of `packageTier: 'reserved'` and replace with `packageTier: 'supreme'`.
Find all type definitions like `'free' | 'gold' | 'pro' | 'reserved'` and replace with `'free' | 'premium' | 'supreme'`.

**Status**: ⬜

---

## Task 9: Fix Story Circle Profile Photo

**File**: Look in `apps/mobile/src/screens/feed/` or wherever the story circles are rendered (likely a StoryBar or StoryCircle component).

The user's own story circle shows the letter "H" instead of their profile photo. Fix this:
- Load the user's profile photo from the auth/profile store
- Display it as the circle background image
- Keep the "+" overlay for adding new story
- If no profile photo exists, show the first letter of their name with a gradient background

**Status**: ⬜

---

## COMPLETION CHECKLIST

After all tasks are done:
1. Update `progress.md` with today's date and mark UI/UX improvements as completed
2. Update this file — mark all tasks ✅
3. Run `npx tsc --noEmit` to check for TypeScript errors
4. Fix any TypeScript errors found

---

## REFERENCE FILES
- `UI_UX_IMPROVEMENTS.md` — Detailed design specifications in Turkish
- `CLAUDE.md` — Project rules and locked numbers
- `monetization.md` — Package details
