// AI Coach store — Zustand store for AI coaching chat state

import { create } from 'zustand';
import {
  aiCoachService,
  type AICoachMessage,
  type AICoachScenario,
} from '../services/aiCoachService';

interface AICoachState {
  // State
  messages: AICoachMessage[];
  activeScenario: AICoachScenario | null;
  isAiTyping: boolean;
  matchContext: { matchId: string; matchName: string } | null;

  // Actions
  selectScenario: (scenario: AICoachScenario) => void;
  sendMessage: (content: string) => Promise<void>;
  setMatchContext: (matchId: string, matchName: string) => void;
  getMatchTip: () => Promise<void>;
  clearChat: () => void;
  reset: () => void;
}

export const useAICoachStore = create<AICoachState>((set, get) => ({
  // Initial state
  messages: [],
  activeScenario: null,
  isAiTyping: false,
  matchContext: null,

  // Actions
  selectScenario: (scenario) => {
    const greeting = aiCoachService.getGreeting(scenario);
    set({
      activeScenario: scenario,
      messages: [greeting],
      isAiTyping: false,
    });
  },

  sendMessage: async (content) => {
    const { activeScenario } = get();
    if (!activeScenario) return;

    // Add user message
    const userMessage: AICoachMessage = {
      id: `user-${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
      scenario: activeScenario,
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isAiTyping: true,
    }));

    try {
      // Get AI response (includes built-in delay)
      const aiResponse = await aiCoachService.sendMessage(content, activeScenario);
      set((state) => ({
        messages: [...state.messages, aiResponse],
        isAiTyping: false,
      }));
    } catch {
      set({ isAiTyping: false });
    }
  },

  setMatchContext: (matchId, matchName) => {
    set({ matchContext: { matchId, matchName } });
  },

  getMatchTip: async () => {
    const { matchContext } = get();
    if (!matchContext) return;

    set({ isAiTyping: true });

    try {
      const tip = await aiCoachService.getMatchCoachingTip(
        matchContext.matchId,
        matchContext.matchName,
      );
      set((state) => ({
        messages: [...state.messages, tip],
        isAiTyping: false,
      }));
    } catch {
      set({ isAiTyping: false });
    }
  },

  clearChat: () => {
    const { activeScenario } = get();
    if (activeScenario) {
      aiCoachService.resetScenario(activeScenario);
      const greeting = aiCoachService.getGreeting(activeScenario);
      set({ messages: [greeting], isAiTyping: false });
    }
  },

  reset: () => {
    set({
      messages: [],
      activeScenario: null,
      isAiTyping: false,
      matchContext: null,
    });
  },
}));
