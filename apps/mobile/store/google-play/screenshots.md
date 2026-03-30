# LUMA - Google Play Store Screenshot Requirements

## Google Play Specifications

- **Count**: Minimum 2, maximum 8 screenshots per device type
- **Aspect Ratio**: 16:9 (landscape) or 9:16 (portrait)
- **Resolution**: Minimum 320px, maximum 3840px on any side
- **Format**: JPEG or 24-bit PNG (no alpha)
- **Recommended**: 1080x1920 (portrait) or 1920x1080 (landscape)

---

## Required Screenshots (8 screens, priority order)

### 1. Discovery Feed (Kesifet)
- **File**: `01-discovery-feed.png`
- **Content**: Main swipe card view with a sample profile visible
- **Overlay Text (TR)**: "Uyumluluk bazli eslesme"
- **Overlay Text (EN)**: "Compatibility-based matching"
- **Key Elements**: Profile card with photo, name, age, compatibility percentage badge

### 2. Compatibility Result
- **File**: `02-compatibility-result.png`
- **Content**: Detailed compatibility analysis between two users
- **Overlay Text (TR)**: "15 boyutlu uyumluluk analizi"
- **Overlay Text (EN)**: "15-dimension compatibility analysis"
- **Key Elements**: Compatibility score, dimension breakdown chart, colored bars

### 3. Match Animation
- **File**: `03-match-animation.png`
- **Content**: The moment two users match, showing match animation
- **Overlay Text (TR)**: "Ruh esini bul!"
- **Overlay Text (EN)**: "Find your soulmate!"
- **Key Elements**: Two profile photos, match animation, confetti/hearts

### 4. Chat / Messaging
- **File**: `04-chat.png`
- **Content**: Active conversation between two matched users
- **Overlay Text (TR)**: "Anlamli sohbetler"
- **Overlay Text (EN)**: "Meaningful conversations"
- **Key Elements**: Message bubbles, text input, profile header

### 5. Profile Detail
- **File**: `05-profile-detail.png`
- **Content**: Full profile view showing photos, bio, compatibility info
- **Overlay Text (TR)**: "Detayli profiller"
- **Overlay Text (EN)**: "Detailed profiles"
- **Key Elements**: Photo gallery, bio section, intention tag, badges

### 6. Onboarding Questions
- **File**: `06-onboarding-questions.png`
- **Content**: One of the 45 compatibility questions during onboarding
- **Overlay Text (TR)**: "45 bilimsel uyumluluk sorusu"
- **Overlay Text (EN)**: "45 scientific compatibility questions"
- **Key Elements**: Question card, answer options, progress indicator

### 7. Packages / Premium
- **File**: `07-packages.png`
- **Content**: Package comparison showing Free, Gold, Pro, Reserved
- **Overlay Text (TR)**: "Sana uygun paketi sec"
- **Overlay Text (EN)**: "Choose your perfect plan"
- **Key Elements**: Four package cards, feature comparison, pricing

---

## Feature Graphic

- **File**: `feature-graphic.png`
- **Dimensions**: 1024x500 px (required)
- **Content**: LUMA logo centered, tagline "Uyumluluk Bazli Tanisma", gradient background using brand colors
- **Notes**: No text smaller than 12sp equivalent, must look good at small sizes

---

## App Icon

- **File**: `app-icon.png`
- **Dimensions**: 512x512 px (required)
- **Format**: 32-bit PNG with alpha
- **Content**: LUMA logo mark on brand gradient background

---

## Screenshot Design Guidelines

1. **Consistent style**: All screenshots should use the same frame/device mockup style
2. **Brand colors**: Use LUMA's primary color palette consistently
3. **Overlay text**: White or light text with subtle shadow for readability
4. **Font**: Use the app's primary font (or a clean sans-serif)
5. **Device frame**: Optional but recommended - use a modern Android device frame
6. **Background**: Subtle gradient or solid color behind device frame
7. **Localization**: Prepare both TR and EN versions of overlay text
8. **Sample data**: Use realistic but fictional profile data (no real user data)

---

## Directory Structure

```
apps/mobile/store/google-play/screenshots/
  tr/
    01-discovery-feed.png
    02-compatibility-result.png
    03-match-animation.png
    04-chat.png
    05-profile-detail.png
    06-onboarding-questions.png
    07-packages.png
  en/
    01-discovery-feed.png
    02-compatibility-result.png
    03-match-animation.png
    04-chat.png
    05-profile-detail.png
    06-onboarding-questions.png
    07-packages.png
  feature-graphic.png
  app-icon.png
```
