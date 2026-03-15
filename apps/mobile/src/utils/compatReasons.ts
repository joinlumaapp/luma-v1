// Generates human-readable Turkish compatibility reasons based on actual
// shared signals between the current user and a target profile.
// Prioritizes strongest overlapping signals first.

import type { DiscoveryProfile } from '../stores/discoveryStore';
import type { ProfileData } from '../stores/profileStore';
import { INTEREST_OPTIONS } from '../constants/config';

// Interest label lookup
const INTEREST_LABEL: Record<string, string> = {};
for (const opt of INTEREST_OPTIONS) {
  INTEREST_LABEL[opt.id] = opt.label;
}

// Intention label map
const INTENTION_LABELS: Record<string, string> = {
  SERIOUS_RELATIONSHIP: 'ciddi bir ilişki',
  EXPLORING: 'yeni keşifler',
  NOT_SURE: 'açık fikirli bir tanışma',
};

// Smoking preference labels (Turkish)
const SMOKING_MATCH_LABELS: Record<string, string> = {
  'İçmez': 'sigarasız bir yaşam',
  'Sosyal içici': 'sosyal içicilik',
};

// Children preference labels
const CHILDREN_MATCH_LABELS: Record<string, string> = {
  'İstiyor': 'gelecekte çocuk sahibi olmak',
  'İstemiyor': 'çocuksuz bir yaşam tercihi',
  'Belki ileride': 'esnek bir gelecek planı',
};

interface CompatReason {
  text: string;
  strength: number; // 0-100, higher = more important
}

/**
 * Generate 2-4 compatibility reasons between the current user and a target profile.
 * Returns Turkish-language reasons sorted by signal strength.
 *
 * @param target  The other user's discovery profile
 * @param user    The current user's profile data (optional — if null, uses target-only signals)
 * @param maxReasons  Maximum number of reasons to return (default 4)
 */
export const generateCompatReasons = (
  target: DiscoveryProfile,
  user: ProfileData | null,
  maxReasons: number = 4,
): string[] => {
  const candidates: CompatReason[] = [];

  // 1. Intention tag match (very strong signal)
  if (user && user.intentionTag && target.intentionTag) {
    if (user.intentionTag === target.intentionTag) {
      const label = INTENTION_LABELS[target.intentionTag] ?? target.intentionTag;
      candidates.push({
        text: `İkiniz de ${label} arıyorsunuz`,
        strength: 95,
      });
    }
  }

  // 2. Shared interest tags (strong signal)
  if (user && user.interestTags?.length > 0 && target.interestTags?.length) {
    const userSet = new Set(user.interestTags);
    const shared = target.interestTags.filter((t) => userSet.has(t));

    if (shared.length >= 3) {
      const labels = shared.slice(0, 3).map((t) => INTEREST_LABEL[t] ?? t);
      candidates.push({
        text: `${labels.join(', ')} gibi ortak ilgi alanlarınız var`,
        strength: 90,
      });
    } else if (shared.length === 2) {
      const labels = shared.map((t) => INTEREST_LABEL[t] ?? t);
      candidates.push({
        text: `${labels[0]} ve ${labels[1]} ortak ilgi alanlarınız`,
        strength: 85,
      });
    } else if (shared.length === 1) {
      const label = INTEREST_LABEL[shared[0]] ?? shared[0];
      candidates.push({
        text: `İkiniz de ${label} ile ilgileniyorsunuz`,
        strength: 75,
      });
    }
  }

  // 3. Strong compatibility categories from backend (strong signal)
  if (target.strongCategories && target.strongCategories.length > 0) {
    const top = target.strongCategories[0];
    candidates.push({
      text: `${top} alanında güçlü uyumunuz var`,
      strength: 88,
    });

    if (target.strongCategories.length >= 2) {
      candidates.push({
        text: `${target.strongCategories[1]} konusunda benzer yaklaşımınız var`,
        strength: 78,
      });
    }
  }

  // 4. Smoking match (moderate signal)
  if (user && user.smoking && target.smoking && user.smoking === target.smoking) {
    const label = SMOKING_MATCH_LABELS[target.smoking];
    if (label) {
      candidates.push({
        text: `İkiniz de ${label} tercih ediyorsunuz`,
        strength: 65,
      });
    }
  }

  // 5. Children preference match (moderate signal)
  if (user && user.children && target.children && user.children === target.children) {
    const label = CHILDREN_MATCH_LABELS[target.children];
    if (label) {
      candidates.push({
        text: `Gelecek planlarınız uyumlu: ${label}`,
        strength: 70,
      });
    }
  }

  // 6. Sports / active lifestyle match (moderate signal)
  if (user && user.sports && target.sports) {
    const userSports = user.sports.toLowerCase();
    const targetSports = target.sports.toLowerCase();
    // Check for any overlapping sport keyword
    const userWords = userSports.split(/[,\s]+/).filter(Boolean);
    const targetWords = targetSports.split(/[,\s]+/).filter(Boolean);
    const sharedSport = userWords.find((w) => targetWords.includes(w));
    if (sharedSport) {
      candidates.push({
        text: 'Aktif yaşam tarzınız benzer',
        strength: 60,
      });
    }
  }

  // 7. Same city (moderate signal)
  if (user && user.city && target.city && user.city === target.city) {
    candidates.push({
      text: `İkiniz de ${target.city} şehrinde yaşıyorsunuz`,
      strength: 55,
    });
  }

  // 8. Proximity (light signal)
  if (target.distanceKm != null && target.distanceKm <= 5) {
    candidates.push({
      text: 'Birbirinize oldukça yakınsınız',
      strength: 50,
    });
  }

  // 9. Backend compat explanation as fallback (if we have few signals)
  if (target.compatExplanation && candidates.length < 2) {
    candidates.push({
      text: target.compatExplanation,
      strength: 60,
    });
  }

  // 10. High overall compatibility score fallback
  if (target.compatibilityPercent >= 85 && candidates.length < 2) {
    candidates.push({
      text: 'Genel uyum analiziniz oldukça güçlü',
      strength: 45,
    });
  }

  // Sort by strength (highest first), deduplicate, and return top N
  candidates.sort((a, b) => b.strength - a.strength);

  const seen = new Set<string>();
  const results: string[] = [];
  for (const c of candidates) {
    if (!seen.has(c.text) && results.length < maxReasons) {
      seen.add(c.text);
      results.push(c.text);
    }
  }

  return results;
};

/**
 * Compact version for discovery cards — returns max 3 shorter reasons.
 */
export const generateCompactReasons = (
  target: DiscoveryProfile,
  user: ProfileData | null,
): string[] => generateCompatReasons(target, user, 3);

/**
 * Expanded version for profile detail — returns max 4 reasons.
 */
export const generateExpandedReasons = (
  target: DiscoveryProfile,
  user: ProfileData | null,
): string[] => generateCompatReasons(target, user, 4);
