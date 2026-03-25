// Local compatibility calculator — mirrors backend algorithm
// Used for mock data and offline mode
// In production, scores come from backend via compatibilityService.getScoreWithUser()

// ── Scoring constants (must match backend) ──────────────────
const EXACT_MATCH_POINTS = 100;
const ADJACENT_MATCH_POINTS = 70;
const TWO_STEP_MATCH_POINTS = 40;
const FAR_MATCH_POINTS = 10;
const SCORE_MIN = 47;
const SCORE_MAX = 97;

// ── Mock onboarding answers per user (simulates 20 core questions) ──
// Each answer is an index 0-4 representing the selected option
// These simulate realistic answer patterns for different personality types

const MOCK_USER_ANSWERS: Record<string, number[]> = {
  // Current user (dev)
  'dev-user-001': [2, 3, 1, 4, 2, 0, 3, 1, 2, 4, 3, 1, 0, 2, 3, 4, 1, 2, 3, 0],
  // Bot users — each has a distinct answer pattern
  'bot-001': [2, 2, 1, 3, 2, 1, 3, 2, 2, 3, 3, 1, 1, 2, 3, 3, 1, 2, 3, 1], // Elif — similar to dev
  'bot-002': [3, 4, 2, 4, 3, 0, 4, 1, 3, 4, 4, 2, 0, 3, 4, 4, 2, 3, 4, 0], // Zeynep — ambitious
  'bot-003': [1, 1, 0, 2, 1, 2, 2, 3, 1, 2, 1, 0, 2, 1, 2, 2, 3, 1, 1, 2], // Selin — reserved
  'bot-004': [4, 3, 3, 1, 4, 1, 0, 4, 4, 1, 2, 3, 3, 4, 1, 0, 4, 3, 2, 3], // Ayse — adventurous
  'bot-005': [2, 2, 2, 3, 2, 1, 3, 2, 2, 3, 3, 2, 1, 2, 3, 3, 2, 2, 3, 1], // Defne — balanced
  'bot-006': [3, 3, 1, 4, 3, 0, 3, 1, 3, 4, 3, 1, 0, 3, 3, 4, 1, 3, 3, 0], // Merve — focused
  'bot-007': [1, 2, 2, 2, 1, 3, 2, 3, 1, 2, 2, 2, 3, 1, 2, 2, 3, 1, 2, 2], // Buse — social
  'bot-008': [0, 1, 0, 1, 0, 4, 1, 4, 0, 1, 0, 0, 4, 0, 1, 1, 4, 0, 0, 4], // Cansu — very different
  'bot-009': [3, 3, 2, 3, 3, 0, 3, 1, 3, 3, 3, 2, 0, 3, 3, 3, 1, 3, 3, 0], // Ipek — driven
  'bot-010': [2, 1, 1, 3, 2, 2, 3, 2, 2, 3, 2, 1, 1, 2, 3, 3, 2, 2, 2, 1], // Ebru — grounded
  'bot-011': [4, 4, 3, 0, 4, 0, 1, 4, 4, 0, 4, 3, 0, 4, 0, 1, 4, 4, 4, 0], // Naz — creative
  'bot-012': [1, 2, 1, 3, 1, 2, 3, 2, 1, 3, 2, 1, 2, 1, 3, 3, 2, 1, 2, 2], // Gizem — thoughtful
};

// Question weights (core Q1-Q20, weight 1.0-1.5)
const QUESTION_WEIGHTS: number[] = [
  1.5, 1.3, 1.4, 1.2, 1.5, // Q1-Q5: Communication, Life Goals
  1.1, 1.3, 1.0, 1.2, 1.4, // Q6-Q10: Values, Lifestyle
  1.3, 1.1, 1.0, 1.2, 1.5, // Q11-Q15: Emotional Intelligence
  1.4, 1.0, 1.2, 1.3, 1.1, // Q16-Q20: Relationship Expectations
];

// ── Score cache ──────────────────────────────────────────────
const scoreCache = new Map<string, number>();

function getCacheKey(userA: string, userB: string): string {
  return [userA, userB].sort().join('::');
}

// ── Calculate step-distance score for a single question ──────
function questionScore(answerA: number, answerB: number): number {
  const distance = Math.abs(answerA - answerB);
  switch (distance) {
    case 0: return EXACT_MATCH_POINTS;
    case 1: return ADJACENT_MATCH_POINTS;
    case 2: return TWO_STEP_MATCH_POINTS;
    default: return FAR_MATCH_POINTS;
  }
}

// ── Main calculation ─────────────────────────────────────────
export function calculateCompatibility(userAId: string, userBId: string): number {
  // Check cache first
  const cacheKey = getCacheKey(userAId, userBId);
  const cached = scoreCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const answersA = MOCK_USER_ANSWERS[userAId];
  const answersB = MOCK_USER_ANSWERS[userBId];

  // If either user has no answers, return a seeded pseudo-random score
  if (!answersA || !answersB) {
    const seed = hashPair(userAId, userBId);
    const fallback = SCORE_MIN + (seed % (SCORE_MAX - SCORE_MIN));
    scoreCache.set(cacheKey, fallback);
    return fallback;
  }

  // Calculate weighted score across all 20 questions
  let weightedPoints = 0;
  let maxWeightedPoints = 0;

  const questionCount = Math.min(answersA.length, answersB.length, QUESTION_WEIGHTS.length);

  for (let i = 0; i < questionCount; i++) {
    const weight = QUESTION_WEIGHTS[i];
    const points = questionScore(answersA[i], answersB[i]);
    weightedPoints += points * weight;
    maxWeightedPoints += EXACT_MATCH_POINTS * weight;
  }

  // Raw percentage
  let rawScore = maxWeightedPoints > 0
    ? (weightedPoints / maxWeightedPoints) * 100
    : 50;

  // Clamp to display range (47-97)
  const finalScore = Math.round(Math.max(SCORE_MIN, Math.min(SCORE_MAX, rawScore)));

  scoreCache.set(cacheKey, finalScore);
  return finalScore;
}

// ── Get score for a specific user pair ───────────────────────
export function getCompatibilityScore(currentUserId: string, targetUserId: string): number {
  return calculateCompatibility(currentUserId, targetUserId);
}

// ── Deterministic hash for unknown users ─────────────────────
function hashPair(a: string, b: string): number {
  const str = [a, b].sort().join('');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ── Clear cache (call when user answers change) ──────────────
export function clearCompatibilityCache(): void {
  scoreCache.clear();
}
