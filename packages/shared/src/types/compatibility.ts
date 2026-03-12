// LUMA V1 — Compatibility System Types
// Subsystems 5, 6, 7

// Subsystem 5: Core Compatibility — 20 Questions
// Subsystem 6: Premium Compatibility — 25 Questions
// Total: 45 Questions — LOCKED

export interface CompatibilityQuestion {
  id: string;
  questionNumber: number; // 1-45
  category: QuestionCategory;
  text: string;
  textTr: string; // Turkish version
  options: QuestionOption[];
  weight: number; // 1.0, 1.2, or 1.5
  isPremium: boolean; // true for Q21-Q45
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
  baseScore: number; // 0-100 (from 20 core questions)
  deepScore: number | null; // 0-100 (from all 45 questions, null if not premium)
  finalScore: number; // 0-100 (weighted combination)
  level: CompatibilityLevel;
  calculatedAt: Date;
}

// Subsystem 7: Compatibility Levels — LOCKED: 2 Levels
export enum CompatibilityLevel {
  NORMAL = 'NORMAL',
  SUPER = 'SUPER',
}

// Extended compatibility level labels for UI display (Turkish)
export enum CompatibilityLevelLabel {
  YUKSEK_UYUM = 'Yüksek Uyum',   // 80%+
  IYI_UYUM = 'İyi Uyum',          // 60-79%
  ORTA_UYUM = 'Orta Uyum',        // 40-59%
  DUSUK_UYUM = 'Düşük Uyum',      // <40%
}

// Full compatibility result returned from scoring algorithm
export interface CompatibilityResult {
  userId: string;
  targetUserId: string;
  score: number;                    // 0-100 final score
  level: CompatibilityLevel;        // NORMAL or SUPER (LOCKED: 2 levels)
  levelLabel: CompatibilityLevelLabel; // Turkish display label
  baseScore: number;                // core questions score
  deepScore: number | null;         // all questions score (null if no premium answers)
  categoryScores: CategoryScore[];  // per-category breakdown
  topReasons: string[];             // top 3 reasons in Turkish
  bonuses: CompatibilityBonuses;    // bonus points breakdown
  commonQuestions: number;           // number of questions both users answered
  isSuperCompatible: boolean;       // shorthand for level === SUPER
}

// Per-category compatibility breakdown
export interface CategoryScore {
  category: QuestionCategory;
  categoryLabel: string;            // Turkish display label
  score: number;                    // 0-100
  matchedQuestions: number;         // questions both answered in this category
  totalQuestions: number;           // total questions in this category
}

// Bonus points applied to compatibility score
export interface CompatibilityBonuses {
  intentionTagMatch: number;        // +10% for same intention, 0 otherwise
  sameCityBonus: number;            // +5% for same city, 0 otherwise
  totalBonus: number;               // sum of all bonuses
}

// Question categories mapping to psychological dimensions
export enum QuestionCategory {
  // Core Questions (Q1-Q20)
  COMMUNICATION = 'communication', // Q1-Q3
  LIFE_GOALS = 'life_goals', // Q4-Q6
  VALUES = 'values', // Q7-Q9
  LIFESTYLE = 'lifestyle', // Q10-Q12
  EMOTIONAL_INTELLIGENCE = 'emotional_intelligence', // Q13-Q15
  RELATIONSHIP_EXPECTATIONS = 'relationship_expectations', // Q16-Q18
  SOCIAL_COMPATIBILITY = 'social_compatibility', // Q19-Q20
  // Premium Questions (Q21-Q45)
  ATTACHMENT_STYLE = 'attachment_style', // Q21-Q24
  LOVE_LANGUAGE = 'love_language', // Q25-Q27
  CONFLICT_STYLE = 'conflict_style', // Q28-Q30
  FUTURE_VISION = 'future_vision', // Q31-Q34
  INTELLECTUAL = 'intellectual', // Q35-Q37
  INTIMACY = 'intimacy', // Q38-Q40
  GROWTH_MINDSET = 'growth_mindset', // Q41-Q43
  CORE_FEARS = 'core_fears', // Q44-Q45
}

// Score display bounds — LOCKED per product spec
export const MIN_DISPLAY_SCORE = 47;
export const MAX_DISPLAY_SCORE = 97;

// Super Compatibility threshold criteria
export const SUPER_COMPATIBILITY_THRESHOLD = {
  minimumDeepScore: 90,
  minimumDimensionScore: 60,
  requiredHighDimensions: 3,
  highDimensionThreshold: 90,
} as const;

// Scoring constants for the compatibility algorithm
export const SCORING_CONSTANTS = {
  // Points awarded based on answer proximity (option order distance)
  EXACT_MATCH_POINTS: 100,
  ADJACENT_MATCH_POINTS: 70,     // 1 step apart
  TWO_STEP_MATCH_POINTS: 40,     // 2 steps apart
  FAR_MATCH_POINTS: 10,          // 3+ steps apart

  // Core questions are weighted 2x compared to premium
  CORE_QUESTION_WEIGHT_MULTIPLIER: 2,
  PREMIUM_QUESTION_WEIGHT_MULTIPLIER: 1,

  // Bonus percentages
  INTENTION_TAG_MATCH_BONUS: 10,  // +10% for matching intention tags
  SAME_CITY_BONUS: 5,             // +5% for same city

  // Redis cache TTL for computed scores (24 hours)
  SCORE_CACHE_TTL_SECONDS: 86400,
} as const;
