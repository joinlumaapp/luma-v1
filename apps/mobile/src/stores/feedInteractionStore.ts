// Feed interaction tracker — counts per-user interactions (like, flirt, message, follow)
// Triggers flirt prompt when threshold reached (3 interactions with same person)

import { create } from 'zustand';

const INTERACTION_THRESHOLD = 3;

interface FeedInteractionState {
  /** userId -> total interaction count */
  interactionCounts: Record<string, number>;
  /** userId that just crossed the threshold (triggers popup) */
  promptUserId: string | null;
  /** Set of userIds already prompted (don't re-trigger) */
  dismissedUserIds: Set<string>;

  /** Record an interaction and return whether threshold was crossed */
  recordInteraction: (userId: string) => void;
  /** Dismiss the current prompt */
  dismissPrompt: () => void;
  /** Clear prompt after match action */
  clearPrompt: () => void;
}

export const useFeedInteractionStore = create<FeedInteractionState>((set, get) => ({
  interactionCounts: {},
  promptUserId: null,
  dismissedUserIds: new Set(),

  recordInteraction: (userId: string) => {
    const { interactionCounts, dismissedUserIds } = get();
    const prev = interactionCounts[userId] ?? 0;
    const next = prev + 1;

    const newCounts = { ...interactionCounts, [userId]: next };

    // Trigger prompt if threshold crossed and not already dismissed for this user
    if (next >= INTERACTION_THRESHOLD && !dismissedUserIds.has(userId)) {
      set({
        interactionCounts: newCounts,
        promptUserId: userId,
      });
    } else {
      set({ interactionCounts: newCounts });
    }
  },

  dismissPrompt: () => {
    const { promptUserId, dismissedUserIds } = get();
    if (promptUserId) {
      const next = new Set(dismissedUserIds);
      next.add(promptUserId);
      set({ promptUserId: null, dismissedUserIds: next });
    } else {
      set({ promptUserId: null });
    }
  },

  clearPrompt: () => {
    const { promptUserId, dismissedUserIds } = get();
    if (promptUserId) {
      const next = new Set(dismissedUserIds);
      next.add(promptUserId);
      set({ promptUserId: null, dismissedUserIds: next });
    }
  },
}));
