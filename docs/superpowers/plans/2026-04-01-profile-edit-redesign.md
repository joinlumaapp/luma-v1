# Profile Edit Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the EditProfileScreen into 5 Bumpy-inspired sections with new profile fields, completion percentage header, and compatibility questions progress section.

**Architecture:** Three-layer change: (1) extend shared UserProfile type + ProfileData store with 9 new fields, (2) restructure the 1,754-line EditProfileScreen into 5 collapsible sections with Bumpy-style row items, (3) add compatibility questions progress section. The existing photo/video/prompt/spots logic is preserved — only the layout wrapping changes.

**Tech Stack:** React Native, TypeScript, Zustand (profileStore), @luma/shared types, existing theme system.

**Spec:** `docs/superpowers/specs/2026-04-01-profile-edit-redesign.md`

---

## File Map

- **Modify:** `packages/shared/src/types/user.ts` — add 9 new optional fields to UserProfile
- **Modify:** `apps/mobile/src/stores/profileStore.ts` — add 9 new fields to ProfileData, update calculateCompletion
- **Modify:** `apps/mobile/src/screens/profile/EditProfileScreen.tsx` — major restructure into 5 sections, add new field rows, completion header, photo grid upgrade to 9 slots

---

### Task 1: Extend shared UserProfile type with new fields

**Files:**
- Modify: `packages/shared/src/types/user.ts:18-37`

- [ ] **Step 1: Add new optional fields to UserProfile**

Find the `UserProfile` interface and add these fields before the closing brace:

```typescript
  // Extended profile fields (Bumpy-inspired)
  weight?: number | null;
  sexualOrientation?: string | null;
  zodiacSign?: string | null;
  educationLevel?: string | null;
  maritalStatus?: string | null;
  alcohol?: string | null;
  pets?: string | null;
  religion?: string | null;
  lifeValues?: string | null;
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd packages/shared && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors (all fields are optional).

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/user.ts
git commit -m "feat(shared): add extended profile fields — zodiac, religion, pets, alcohol, etc."
```

---

### Task 2: Extend ProfileData store with new fields

**Files:**
- Modify: `apps/mobile/src/stores/profileStore.ts:18-58`

- [ ] **Step 1: Add new fields to ProfileData interface**

Find the `ProfileData` interface. After the `education: string;` field (line ~37), add:

```typescript
  // Extended profile fields (Bumpy-inspired)
  weight: number | null;
  sexualOrientation: string;
  zodiacSign: string;
  educationLevel: string;
  maritalStatus: string;
  alcohol: string;
  pets: string;
  religion: string;
  lifeValues: string;
```

- [ ] **Step 2: Add defaults in the initial state**

Find the initial state object in `create<ProfileState>()` where `profile:` is defined. Add defaults for all new fields:

```typescript
weight: null,
sexualOrientation: '',
zodiacSign: '',
educationLevel: '',
maritalStatus: '',
alcohol: '',
pets: '',
religion: '',
lifeValues: '',
```

- [ ] **Step 3: Update fetchProfile mapping**

In the `fetchProfile` method, where backend response is mapped to ProfileData, add mappings for new fields. Find the section where fields are assigned from `data` and add:

```typescript
weight: data.weight ?? null,
sexualOrientation: data.sexualOrientation ?? '',
zodiacSign: data.zodiacSign ?? '',
educationLevel: data.educationLevel ?? '',
maritalStatus: data.maritalStatus ?? '',
alcohol: data.alcohol ?? '',
pets: data.pets ?? '',
religion: data.religion ?? '',
lifeValues: data.lifeValues ?? '',
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/stores/profileStore.ts
git commit -m "feat(stores): add extended profile fields to ProfileData store"
```

---

### Task 3: Add field option constants

**Files:**
- Modify: `apps/mobile/src/constants/config.ts`

Add option arrays for the new profile fields that use picker/select UI.

- [ ] **Step 1: Add profile field options**

Find the end of existing constants (or near INTEREST_OPTIONS). Add:

```typescript
// ── Extended Profile Field Options ────────────────────────────

export const ZODIAC_SIGNS = [
  'Koc', 'Boga', 'Ikizler', 'Yengec', 'Aslan', 'Basak',
  'Terazi', 'Akrep', 'Yay', 'Oglak', 'Kova', 'Balik',
] as const;

export const EDUCATION_LEVELS = [
  'Lise', 'On Lisans', 'Lisans', 'Yuksek Lisans', 'Doktora',
] as const;

export const MARITAL_STATUS_OPTIONS = [
  'Bekar', 'Bosanmis', 'Dul',
] as const;

export const ALCOHOL_OPTIONS = [
  'Icmem', 'Bazen', 'Sosyal', 'Duzenli',
] as const;

export const SEXUAL_ORIENTATION_OPTIONS = [
  'Heteroseksuel', 'Gay', 'Lezbiyen', 'Biseksuel', 'Diger',
] as const;

export const PETS_OPTIONS = [
  'Kedi', 'Kopek', 'Kedi ve Kopek', 'Diger', 'Yok',
] as const;

export const RELIGION_OPTIONS = [
  'Islam', 'Hristiyan', 'Yahudi', 'Ateist', 'Agnostik', 'Diger',
] as const;

export const EXERCISE_OPTIONS = [
  'Hic', 'Bazen', 'Sik',
] as const;

export const SMOKING_OPTIONS = [
  'Icmem', 'Bazen', 'Duzenli', 'Tolere Ederim',
] as const;

export const CHILDREN_OPTIONS = [
  'Var', 'Yok', 'Istiyorum', 'Istemiyorum',
] as const;
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/constants/config.ts
git commit -m "feat(config): add extended profile field option constants"
```

---

### Task 4: Restructure EditProfileScreen — Section components and header

This is the largest task. The existing EditProfileScreen.tsx will be restructured into sections.

**Files:**
- Modify: `apps/mobile/src/screens/profile/EditProfileScreen.tsx`

- [ ] **Step 1: Update PHOTO_SLOTS constant and add section helper components**

At the top of the file, change:
```typescript
const PHOTO_SLOTS = 6;
```
To:
```typescript
const PHOTO_SLOTS = 9;
```

Also update `PHOTO_CELL_WIDTH` for 3x3 grid (this should already work since it divides by 3).

After the imports and constants, add these helper components:

```typescript
// ─── Section Header (Bumpy-style) ──────────────────────────────

interface SectionHeaderProps {
  title: string;
  description?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description }) => (
  <View style={sectionStyles.header}>
    <Text style={sectionStyles.headerTitle}>{title}</Text>
    {description && <Text style={sectionStyles.headerDesc}>{description}</Text>}
  </View>
);

// ─── Profile Field Row (Bumpy-style) ────────────────────────────

interface FieldRowProps {
  icon: string;
  label: string;
  value?: string;
  placeholder?: string;
  readOnly?: boolean;
  onPress?: () => void;
}

const FieldRow: React.FC<FieldRowProps> = ({
  icon, label, value, placeholder = 'Ekle', readOnly = false, onPress,
}) => (
  <TouchableOpacity
    style={sectionStyles.fieldRow}
    onPress={onPress}
    disabled={readOnly || !onPress}
    activeOpacity={readOnly ? 1 : 0.7}
  >
    <Text style={sectionStyles.fieldIcon}>{icon}</Text>
    <Text style={sectionStyles.fieldLabel}>{label}</Text>
    <View style={sectionStyles.fieldRight}>
      {value ? (
        <Text style={sectionStyles.fieldValue}>{value}</Text>
      ) : (
        <Text style={sectionStyles.fieldPlaceholder}>{placeholder}</Text>
      )}
      {readOnly ? (
        <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      )}
    </View>
  </TouchableOpacity>
);

// ─── Completion Header ──────────────────────────────────────────

interface CompletionHeaderProps {
  percent: number;
  onBack: () => void;
}

const CompletionHeader: React.FC<CompletionHeaderProps> = ({ percent, onBack }) => (
  <View style={sectionStyles.completionHeader}>
    <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="arrow-back" size={24} color={colors.text} />
    </TouchableOpacity>
    <Text style={sectionStyles.completionTitle}>Profili Duzenle</Text>
    <View style={sectionStyles.completionRight}>
      <Text style={sectionStyles.completionPercent}>%{percent} doldurulmus</Text>
    </View>
  </View>
);

// ─── Option Picker Modal ────────────────────────────────────────

interface OptionPickerProps {
  visible: boolean;
  title: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  onDismiss: () => void;
}

const OptionPicker: React.FC<OptionPickerProps> = ({
  visible, title, options, selected, onSelect, onDismiss,
}) => {
  if (!visible) return null;
  return (
    <View style={sectionStyles.pickerOverlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} />
      <View style={sectionStyles.pickerSheet}>
        <Text style={sectionStyles.pickerTitle}>{title}</Text>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[sectionStyles.pickerOption, selected === opt && sectionStyles.pickerOptionSelected]}
            onPress={() => { onSelect(opt); onDismiss(); }}
          >
            <Text style={[
              sectionStyles.pickerOptionText,
              selected === opt && sectionStyles.pickerOptionTextSelected,
            ]}>{opt}</Text>
            {selected === opt && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
```

- [ ] **Step 2: Add section styles**

Add a new `sectionStyles` StyleSheet at the end of the file (before or after the existing `styles`):

```typescript
const sectionStyles = StyleSheet.create({
  header: {
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: GRID_PADDING,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerDesc: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: GRID_PADDING,
    marginBottom: 8,
  },
  fieldIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  fieldLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.text,
  },
  fieldRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldValue: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
  },
  fieldPlaceholder: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textTertiary,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID_PADDING,
    paddingVertical: spacing.md,
    gap: 12,
  },
  completionTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
  },
  completionRight: {
    alignItems: 'flex-end',
  },
  completionPercent: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: colors.primary,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
  },
  pickerOptionText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.text,
  },
  pickerOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/profile/EditProfileScreen.tsx
git commit -m "feat(profile): add SectionHeader, FieldRow, CompletionHeader, OptionPicker components"
```

---

### Task 5: Restructure main component — Section 1 (Media) + Section 2 (Basic Info)

**Files:**
- Modify: `apps/mobile/src/screens/profile/EditProfileScreen.tsx`

This task restructures the main render method to wrap existing content in sections.

- [ ] **Step 1: Add picker state variables**

In the main `EditProfileScreen` component, add state for option picker:

```typescript
const [pickerConfig, setPickerConfig] = useState<{
  visible: boolean;
  title: string;
  options: readonly string[];
  field: string;
} | null>(null);
```

Add a handler to open the picker:

```typescript
const openPicker = useCallback((title: string, options: readonly string[], field: string) => {
  setPickerConfig({ visible: true, title, options, field });
}, []);

const handlePickerSelect = useCallback((value: string) => {
  if (pickerConfig) {
    // Update the local state for the field
    switch (pickerConfig.field) {
      case 'zodiacSign': setLocalProfile(prev => ({ ...prev, zodiacSign: value })); break;
      case 'educationLevel': setLocalProfile(prev => ({ ...prev, educationLevel: value })); break;
      case 'maritalStatus': setLocalProfile(prev => ({ ...prev, maritalStatus: value })); break;
      case 'alcohol': setLocalProfile(prev => ({ ...prev, alcohol: value })); break;
      case 'sexualOrientation': setLocalProfile(prev => ({ ...prev, sexualOrientation: value })); break;
      case 'pets': setLocalProfile(prev => ({ ...prev, pets: value })); break;
      case 'religion': setLocalProfile(prev => ({ ...prev, religion: value })); break;
      case 'sports': setLocalProfile(prev => ({ ...prev, sports: value })); break;
      case 'smoking': setLocalProfile(prev => ({ ...prev, smoking: value })); break;
      case 'children': setLocalProfile(prev => ({ ...prev, children: value })); break;
    }
    setPickerConfig(null);
  }
}, [pickerConfig]);
```

- [ ] **Step 2: Wrap existing photo grid in Section 1**

In the ScrollView render, wrap the existing photo grid + video section with:

```typescript
{/* ─── Section 1: Medya ─── */}
<SectionHeader
  title="Medya"
  description="Fotograflarin ve videon"
/>
{/* existing photo grid code */}
{/* existing video section code */}
```

- [ ] **Step 3: Replace existing basic info fields with Section 2 FieldRows**

Replace the existing basic info fields (name, age, city, height, job, education) with:

```typescript
{/* ─── Section 2: Temel Bilgilerim ─── */}
<SectionHeader
  title="Temel Bilgilerim"
  description="Kendiniz hakkinda genel bilgileri belirtin"
/>
<FieldRow icon="👤" label="Ad" value={localProfile.firstName} readOnly />
<FieldRow icon="🎂" label="Yas" value={age ? `${age} yil` : ''} readOnly />
<FieldRow icon="🚻" label="Cinsiyet" value={localProfile.gender === 'MALE' ? 'Erkek' : localProfile.gender === 'FEMALE' ? 'Kadin' : 'Diger'} readOnly />
<FieldRow icon="💼" label="Is" value={localProfile.job || ''} onPress={() => {/* existing job edit */}} />
<FieldRow icon="🏛" label="Okul" value={localProfile.education || ''} onPress={() => {/* existing education edit */}} />
<FieldRow icon="📍" label="Sehir" value={localProfile.city || ''} onPress={() => {/* existing city picker */}} />
<FieldRow icon="📏" label="Boy" value={localProfile.height ? `${localProfile.height} cm` : ''} onPress={() => {/* existing height picker */}} />

{/* Intention Tag subsection */}
<SectionHeader title="Hedefim" description="Baskalarina ne aradiginizi soyleyin" />
{/* existing intention tag chips */}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/profile/EditProfileScreen.tsx
git commit -m "feat(profile): restructure sections 1-2 — media and basic info with FieldRow"
```

---

### Task 6: Add Section 3 (Extended Info) with new field rows

**Files:**
- Modify: `apps/mobile/src/screens/profile/EditProfileScreen.tsx`

- [ ] **Step 1: Add Section 3 with all extended field rows**

After Section 2, add:

```typescript
{/* ─── Section 3: Hakkimda Daha Fazlasi ─── */}
<SectionHeader
  title="Hakkimda Daha Fazlasi"
  description="Uygun kisileri bulmak icin kendiniz hakkinda daha fazla bilgi belirtin"
/>
<FieldRow icon="⚖" label="Kilo" value={localProfile.weight ? `${localProfile.weight} kg` : ''} onPress={() => {/* weight picker */}} />
<FieldRow icon="⚥" label="Cinsel Yonelim" value={localProfile.sexualOrientation || ''} onPress={() => openPicker('Cinsel Yonelim', SEXUAL_ORIENTATION_OPTIONS, 'sexualOrientation')} />
<FieldRow icon="♍" label="Burc" value={localProfile.zodiacSign || ''} onPress={() => openPicker('Burc', ZODIAC_SIGNS, 'zodiacSign')} />
<FieldRow icon="🏋" label="Egzersiz" value={localProfile.sports || ''} onPress={() => openPicker('Egzersiz', EXERCISE_OPTIONS, 'sports')} />
<FieldRow icon="🎓" label="Egitim Seviyesi" value={localProfile.educationLevel || ''} onPress={() => openPicker('Egitim Seviyesi', EDUCATION_LEVELS, 'educationLevel')} />
<FieldRow icon="💕" label="Medeni Durum" value={localProfile.maritalStatus || ''} onPress={() => openPicker('Medeni Durum', MARITAL_STATUS_OPTIONS, 'maritalStatus')} />
<FieldRow icon="👶" label="Cocuklar" value={localProfile.children || ''} onPress={() => openPicker('Cocuklar', CHILDREN_OPTIONS, 'children')} />
<FieldRow icon="🍷" label="Icki" value={localProfile.alcohol || ''} onPress={() => openPicker('Icki', ALCOHOL_OPTIONS, 'alcohol')} />
<FieldRow icon="🚬" label="Sigara" value={localProfile.smoking || ''} onPress={() => openPicker('Sigara', SMOKING_OPTIONS, 'smoking')} />
<FieldRow icon="🐾" label="Evcil Hayvanlar" value={localProfile.pets || ''} onPress={() => openPicker('Evcil Hayvanlar', PETS_OPTIONS, 'pets')} />
<FieldRow icon="🕌" label="Din" value={localProfile.religion || ''} onPress={() => openPicker('Din', RELIGION_OPTIONS, 'religion')} />
<FieldRow icon="🌐" label="Degerler" value={localProfile.lifeValues || ''} onPress={() => {/* text input modal */}} />
```

- [ ] **Step 2: Add import for new constants**

Add to imports:

```typescript
import {
  INTEREST_OPTIONS,
  ZODIAC_SIGNS,
  EDUCATION_LEVELS,
  MARITAL_STATUS_OPTIONS,
  ALCOHOL_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  PETS_OPTIONS,
  RELIGION_OPTIONS,
  EXERCISE_OPTIONS,
  SMOKING_OPTIONS,
  CHILDREN_OPTIONS,
} from '../../constants/config';
```

- [ ] **Step 3: Render OptionPicker at end of component**

Before the closing `</View>` of the main component, add:

```typescript
{pickerConfig && (
  <OptionPicker
    visible={pickerConfig.visible}
    title={pickerConfig.title}
    options={pickerConfig.options}
    selected={localProfile[pickerConfig.field as keyof typeof localProfile] as string ?? ''}
    onSelect={handlePickerSelect}
    onDismiss={() => setPickerConfig(null)}
  />
)}
```

- [ ] **Step 4: Remove old inline lifestyle section**

Find and remove the old inline Sigara/Spor/Cocuklar section that was previously at the bottom of the form. These fields are now in Section 3 via FieldRow components.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/profile/EditProfileScreen.tsx
git commit -m "feat(profile): add Section 3 — extended info with 12 Bumpy-style field rows"
```

---

### Task 7: Add Section 4 (Personality) and Section 5 (Compatibility)

**Files:**
- Modify: `apps/mobile/src/screens/profile/EditProfileScreen.tsx`

- [ ] **Step 1: Wrap existing interests, prompts, bio, spots in Section 4**

```typescript
{/* ─── Section 4: Kisligimi Tanit ─── */}
<SectionHeader
  title="Kisligimi Tanit"
  description="Kendini ifade et, insanlarin seni tanimasi icin"
/>
{/* existing interest tags section */}
{/* existing prompts section */}
{/* existing bio/hakkimda section */}
{/* existing favorite spots section */}
```

- [ ] **Step 2: Add Section 5 — Compatibility Questions progress**

After Section 4, add:

```typescript
{/* ─── Section 5: Uyum Sorulari ─── */}
<SectionHeader
  title="Uyum Sorulari"
  description="45 soru ile uyum puanini yukselt"
/>
<View style={[sectionStyles.fieldRow, { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
  {/* Progress display */}
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
    <Text style={{ fontSize: 14, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: colors.text }}>
      {answeredCount}/45 soru cevaplanmis
    </Text>
    <Text style={{ fontSize: 13, fontFamily: 'Poppins_500Medium', fontWeight: '500', color: colors.primary }}>
      %{Math.round((answeredCount / 45) * 100)}
    </Text>
  </View>
  {/* Progress bar */}
  <View style={{ height: 6, backgroundColor: colors.surfaceLight, borderRadius: 3, overflow: 'hidden' }}>
    <View style={{
      height: '100%',
      width: `${(answeredCount / 45) * 100}%`,
      backgroundColor: colors.primary,
      borderRadius: 3,
    }} />
  </View>
  {/* CTA */}
  <TouchableOpacity
    onPress={() => navigation.navigate('CompatibilityQuestions' as never)}
    style={{
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    }}
  >
    <Text style={{ fontSize: 15, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: '#fff' }}>
      Sorulara Devam Et
    </Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 3: Add answeredCount calculation**

In the component body, add:

```typescript
const answeredCount = Object.keys(profile.answers ?? {}).length;
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/profile/EditProfileScreen.tsx
git commit -m "feat(profile): add Section 4 (personality) and Section 5 (compatibility questions)"
```

---

### Task 8: Replace screen header with CompletionHeader

**Files:**
- Modify: `apps/mobile/src/screens/profile/EditProfileScreen.tsx`

- [ ] **Step 1: Replace existing header**

Find the existing header in the main render (usually a back button + title). Replace with:

```typescript
<CompletionHeader
  percent={completionPercent}
  onBack={() => navigation.goBack()}
/>
```

Where `completionPercent` comes from the store or is calculated locally.

- [ ] **Step 2: Update completion calculation to include new fields**

In `profileStore.ts`, update the `calculateCompletion` function to weight new fields:

The existing calculation scores: name, birthDate, gender, intention, 2+ photos, 100+ bio, answers.
Add bonus points for extended fields (each filled field adds ~2% up to a max bonus):

```typescript
// Extended fields bonus (up to 18% — 2% each for 9 fields)
const extendedFields = [
  profile.zodiacSign, profile.educationLevel, profile.maritalStatus,
  profile.alcohol, profile.pets, profile.religion, profile.sexualOrientation,
  profile.sports, profile.smoking,
].filter(f => f && f.length > 0).length;
const extendedBonus = extendedFields * 2;
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/profile/EditProfileScreen.tsx apps/mobile/src/stores/profileStore.ts
git commit -m "feat(profile): add completion header with percentage, update completion calculation"
```

---

### Task 9: Final cleanup and verification

**Files:**
- Modify: `apps/mobile/src/screens/profile/EditProfileScreen.tsx`

- [ ] **Step 1: Remove any duplicate field renders**

Search the file for any fields that now appear twice (old inline render + new FieldRow). Remove the old inline versions. Specifically check for:
- Old smoking/sports/children inline section
- Old city picker inline
- Old height picker inline

These should only render via FieldRow in their respective sections now.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Verify all 5 sections are in correct order**

Confirm the ScrollView contains:
1. CompletionHeader
2. Section 1: Medya (photos + video)
3. Section 2: Temel Bilgilerim (basic info + intention)
4. Section 3: Hakkimda Daha Fazlasi (12 extended fields)
5. Section 4: Kisligimi Tanit (interests + prompts + bio + spots)
6. Section 5: Uyum Sorulari (progress + CTA)
7. Save button

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(profile): complete profile edit redesign — 5 Bumpy-inspired sections"
```
