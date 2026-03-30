export interface CompatibilityQuestion {
    id: string;
    questionNumber: number;
    category: QuestionCategory;
    text: string;
    textTr: string;
    options: QuestionOption[];
    weight: number;
    isPremium: boolean;
    order: number;
}
export interface QuestionOption {
    id: string;
    label: string;
    labelTr: string;
    value: number;
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
    baseScore: number;
    deepScore: number | null;
    finalScore: number;
    level: CompatibilityLevel;
    calculatedAt: Date;
}
export declare enum CompatibilityLevel {
    NORMAL = "NORMAL",
    SUPER = "SUPER"
}
export declare enum CompatibilityLevelLabel {
    YUKSEK_UYUM = "Y\u00FCksek Uyum",// 80%+
    IYI_UYUM = "\u0130yi Uyum",// 60-79%
    ORTA_UYUM = "Orta Uyum",// 40-59%
    DUSUK_UYUM = "D\u00FC\u015F\u00FCk Uyum"
}
export interface CompatibilityResult {
    userId: string;
    targetUserId: string;
    score: number;
    level: CompatibilityLevel;
    levelLabel: CompatibilityLevelLabel;
    baseScore: number;
    deepScore: number | null;
    categoryScores: CategoryScore[];
    topReasons: string[];
    bonuses: CompatibilityBonuses;
    commonQuestions: number;
    isSuperCompatible: boolean;
}
export interface CategoryScore {
    category: QuestionCategory;
    categoryLabel: string;
    score: number;
    matchedQuestions: number;
    totalQuestions: number;
}
export interface CompatibilityBonuses {
    intentionTagMatch: number;
    sameCityBonus: number;
    totalBonus: number;
}
export declare enum QuestionCategory {
    COMMUNICATION = "COMMUNICATION",// Q1-Q3
    LIFE_GOALS = "LIFE_GOALS",// Q4-Q6
    VALUES = "VALUES",// Q7-Q9
    LIFESTYLE = "LIFESTYLE",// Q10-Q12
    EMOTIONAL_INTELLIGENCE = "EMOTIONAL_INTELLIGENCE",// Q13-Q15
    RELATIONSHIP_EXPECTATIONS = "RELATIONSHIP_EXPECTATIONS",// Q16-Q18
    SOCIAL_COMPATIBILITY = "SOCIAL_COMPATIBILITY",// Q19-Q20
    ATTACHMENT_STYLE = "ATTACHMENT_STYLE",// Q21-Q24
    LOVE_LANGUAGE = "LOVE_LANGUAGE",// Q25-Q27
    CONFLICT_STYLE = "CONFLICT_STYLE",// Q28-Q30
    FUTURE_VISION = "FUTURE_VISION",// Q31-Q34
    INTELLECTUAL = "INTELLECTUAL",// Q35-Q37
    INTIMACY = "INTIMACY",// Q38-Q40
    GROWTH_MINDSET = "GROWTH_MINDSET",// Q41-Q43
    CORE_FEARS = "CORE_FEARS"
}
export declare const MIN_DISPLAY_SCORE = 47;
export declare const MAX_DISPLAY_SCORE = 97;
export declare const SUPER_COMPATIBILITY_THRESHOLD: {
    readonly minimumDeepScore: 90;
    readonly minimumDimensionScore: 60;
    readonly requiredHighDimensions: 3;
    readonly highDimensionThreshold: 90;
};
export declare const SCORING_CONSTANTS: {
    readonly EXACT_MATCH_POINTS: 100;
    readonly ADJACENT_MATCH_POINTS: 70;
    readonly TWO_STEP_MATCH_POINTS: 40;
    readonly FAR_MATCH_POINTS: 10;
    readonly CORE_QUESTION_WEIGHT_MULTIPLIER: 2;
    readonly PREMIUM_QUESTION_WEIGHT_MULTIPLIER: 1;
    readonly INTENTION_TAG_MATCH_BONUS: 10;
    readonly SAME_CITY_BONUS: 5;
    readonly SCORE_CACHE_TTL_SECONDS: 86400;
};
//# sourceMappingURL=compatibility.d.ts.map