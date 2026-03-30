"use strict";
// LUMA V1 — Compatibility System Types
// Subsystems 5, 6, 7
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCORING_CONSTANTS = exports.SUPER_COMPATIBILITY_THRESHOLD = exports.MAX_DISPLAY_SCORE = exports.MIN_DISPLAY_SCORE = exports.QuestionCategory = exports.CompatibilityLevelLabel = exports.CompatibilityLevel = void 0;
// Subsystem 7: Compatibility Levels — LOCKED: 2 Levels
var CompatibilityLevel;
(function (CompatibilityLevel) {
    CompatibilityLevel["NORMAL"] = "NORMAL";
    CompatibilityLevel["SUPER"] = "SUPER";
})(CompatibilityLevel || (exports.CompatibilityLevel = CompatibilityLevel = {}));
// Extended compatibility level labels for UI display (Turkish)
var CompatibilityLevelLabel;
(function (CompatibilityLevelLabel) {
    CompatibilityLevelLabel["YUKSEK_UYUM"] = "Y\u00FCksek Uyum";
    CompatibilityLevelLabel["IYI_UYUM"] = "\u0130yi Uyum";
    CompatibilityLevelLabel["ORTA_UYUM"] = "Orta Uyum";
    CompatibilityLevelLabel["DUSUK_UYUM"] = "D\u00FC\u015F\u00FCk Uyum";
})(CompatibilityLevelLabel || (exports.CompatibilityLevelLabel = CompatibilityLevelLabel = {}));
// Question categories mapping to psychological dimensions
var QuestionCategory;
(function (QuestionCategory) {
    // Core Questions (Q1-Q20)
    QuestionCategory["COMMUNICATION"] = "COMMUNICATION";
    QuestionCategory["LIFE_GOALS"] = "LIFE_GOALS";
    QuestionCategory["VALUES"] = "VALUES";
    QuestionCategory["LIFESTYLE"] = "LIFESTYLE";
    QuestionCategory["EMOTIONAL_INTELLIGENCE"] = "EMOTIONAL_INTELLIGENCE";
    QuestionCategory["RELATIONSHIP_EXPECTATIONS"] = "RELATIONSHIP_EXPECTATIONS";
    QuestionCategory["SOCIAL_COMPATIBILITY"] = "SOCIAL_COMPATIBILITY";
    // Premium Questions (Q21-Q45)
    QuestionCategory["ATTACHMENT_STYLE"] = "ATTACHMENT_STYLE";
    QuestionCategory["LOVE_LANGUAGE"] = "LOVE_LANGUAGE";
    QuestionCategory["CONFLICT_STYLE"] = "CONFLICT_STYLE";
    QuestionCategory["FUTURE_VISION"] = "FUTURE_VISION";
    QuestionCategory["INTELLECTUAL"] = "INTELLECTUAL";
    QuestionCategory["INTIMACY"] = "INTIMACY";
    QuestionCategory["GROWTH_MINDSET"] = "GROWTH_MINDSET";
    QuestionCategory["CORE_FEARS"] = "CORE_FEARS";
})(QuestionCategory || (exports.QuestionCategory = QuestionCategory = {}));
// Score display bounds — LOCKED per product spec
exports.MIN_DISPLAY_SCORE = 47;
exports.MAX_DISPLAY_SCORE = 97;
// Super Compatibility threshold criteria
exports.SUPER_COMPATIBILITY_THRESHOLD = {
    minimumDeepScore: 90,
    minimumDimensionScore: 60,
    requiredHighDimensions: 3,
    highDimensionThreshold: 90,
};
// Scoring constants for the compatibility algorithm
exports.SCORING_CONSTANTS = {
    // Points awarded based on answer proximity (option order distance)
    EXACT_MATCH_POINTS: 100,
    ADJACENT_MATCH_POINTS: 70, // 1 step apart
    TWO_STEP_MATCH_POINTS: 40, // 2 steps apart
    FAR_MATCH_POINTS: 10, // 3+ steps apart
    // Core questions are weighted 2x compared to premium
    CORE_QUESTION_WEIGHT_MULTIPLIER: 2,
    PREMIUM_QUESTION_WEIGHT_MULTIPLIER: 1,
    // Bonus percentages
    INTENTION_TAG_MATCH_BONUS: 10, // +10% for matching intention tags
    SAME_CITY_BONUS: 5, // +5% for same city
    // Redis cache TTL for computed scores (24 hours)
    SCORE_CACHE_TTL_SECONDS: 86400,
};
//# sourceMappingURL=compatibility.js.map