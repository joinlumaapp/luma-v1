// LUMA V1 — Compatibility System Types
// Updated: 2026-04-08
//
// Uyum Analizi: 20 questions, 4 options each, MANDATORY during onboarding
// Kişilik Testi: 5 questions, OPTIONAL, gives personality tag only (cosmetic)
// Premium questions: REMOVED (no 25 premium questions, no 45 total)

export interface CompatibilityQuestion {
  id: string;
  questionNumber: number; // 1-20 (Uyum Analizi)
  category: QuestionCategory;
  text: string;
  textTr: string;
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption]; // Always exactly 4
  weight: number; // 1.0, 1.2, or 1.5
  order: number;
}

export interface QuestionOption {
  id: string;
  label: string;
  labelTr: string;
  value: number; // normalized 0-1
}

export interface UserAnswer {
  userId: string;
  questionId: string;
  selectedOptionId: string;
  answeredAt: Date;
}

export interface CompatibilityScore {
  userAId: string;
  userBId: string;
  score: number; // 47-97 (display range)
  rawScore: number; // 0-100 (internal calculation)
  level: CompatibilityLevel;
  calculatedAt: Date;
}

export enum CompatibilityLevel {
  NORMAL = 'NORMAL',       // score < 90
  SUPER = 'SUPER',         // score >= 90 (Süper Uyum)
}

// 8 psychological categories for Uyum Analizi (20 questions)
export enum QuestionCategory {
  COMMUNICATION = 'communication',                       // Q1-Q3
  LIFE_GOALS = 'life_goals',                             // Q4-Q6
  VALUES = 'values',                                     // Q7-Q9
  LIFESTYLE = 'lifestyle',                               // Q10-Q12
  EMOTIONAL_INTELLIGENCE = 'emotional_intelligence',     // Q13-Q15
  RELATIONSHIP_EXPECTATIONS = 'relationship_expectations', // Q16-Q18
  SOCIAL_COMPATIBILITY = 'social_compatibility',         // Q19-Q20
}

// Kişilik Testi (5 questions, optional) — separate from Uyum Analizi
export interface PersonalityQuestion {
  id: string;
  questionNumber: number; // 1-5
  text: string;
  textTr: string;
  options: [PersonalityOption, PersonalityOption, PersonalityOption, PersonalityOption];
}

export interface PersonalityOption {
  id: string;
  label: string;
  labelTr: string;
  personalityType: PersonalityType;
}

// Kişilik tipi tag shown on profile (cosmetic only, does NOT affect matching)
export enum PersonalityType {
  ACIK_FIKIRLI = 'acik_fikirli',         // Açık Fikirli
  LIDER_KARARLI = 'lider_kararli',       // Lider ve kararlı
  SESSIZ_DERIN = 'sessiz_derin',         // Sessiz ve derin
  EGLENCELI_ENERJIK = 'eglenceli_enerjik', // Eğlenceli ve enerjik
  MANTIKLI_ANALITIK = 'mantikli_analitik', // Mantıklı ve analitik
}

export const PERSONALITY_TYPE_LABELS: Record<PersonalityType, { en: string; tr: string }> = {
  [PersonalityType.ACIK_FIKIRLI]: { en: 'Open-minded', tr: 'Açık Fikirli' },
  [PersonalityType.LIDER_KARARLI]: { en: 'Leader & Decisive', tr: 'Lider ve Kararlı' },
  [PersonalityType.SESSIZ_DERIN]: { en: 'Quiet & Deep', tr: 'Sessiz ve Derin' },
  [PersonalityType.EGLENCELI_ENERJIK]: { en: 'Fun & Energetic', tr: 'Eğlenceli ve Enerjik' },
  [PersonalityType.MANTIKLI_ANALITIK]: { en: 'Logical & Analytical', tr: 'Mantıklı ve Analitik' },
};

// Score display bounds — LOCKED
export const MIN_DISPLAY_SCORE = 47;
export const MAX_DISPLAY_SCORE = 97;

// Super Compatibility threshold
export const SUPER_COMPATIBILITY_THRESHOLD = 90;
