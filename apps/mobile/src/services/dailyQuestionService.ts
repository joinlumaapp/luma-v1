// LUMA V1 -- Gunluk Soru API Servisi
// Gunluk uyumluluk sorusu icin tum API cagrilari

import api from './api';

// ─── Types ────────────────────────────────────────────────────

export interface DailyQuestionOption {
  id: string;
  labelTr: string;
  labelEn: string;
  order: number;
}

export interface DailyQuestion {
  questionId: string;
  questionNumber: number;
  textTr: string;
  textEn: string;
  category: string;
  options: DailyQuestionOption[];
  dayNumber: number;
  alreadyAnswered: boolean;
  answeredOptionId: string | null;
}

export interface DailyAnswerRequest {
  questionId: string;
  optionId: string;
}

export interface DailyAnswerResponse {
  saved: boolean;
  dayNumber: number;
}

export interface OptionBreakdown {
  optionId: string;
  labelTr: string;
  count: number;
  percent: number;
  isUserChoice: boolean;
}

export interface DailyInsight {
  questionId: string;
  totalResponses: number;
  matchResponses: number;
  sameAnswerPercent: number;
  optionBreakdown: OptionBreakdown[];
  soulMateInsight: string;
}

export interface DailyStreak {
  currentStreak: number;
  longestStreak: number;
  totalAnswered: number;
  lastAnsweredAt: string | null;
}

// Answer stats (global question stats, not match-specific)
export interface AnswerStatsOptionBreakdown {
  optionId: string;
  labelTr: string;
  count: number;
  percent: number;
}

export interface AnswerStatsUserAnswer {
  optionId: string;
  labelTr: string;
  percent: number;
  insightMessage: string;
}

export interface AnswerStatsResponse {
  questionId: string;
  totalAnswers: number;
  optionBreakdown: AnswerStatsOptionBreakdown[];
  mostPopularOption: {
    optionId: string;
    labelTr: string;
    percent: number;
  } | null;
  userAnswer: AnswerStatsUserAnswer | null;
}

// ─── Service ──────────────────────────────────────────────────

export const dailyQuestionService = {
  /**
   * Gunun sorusunu getir
   */
  getDailyQuestion: async (): Promise<DailyQuestion> => {
    const response = await api.get<DailyQuestion>('/compatibility/daily');
    return response.data;
  },

  /**
   * Gunun sorusunu yanitla
   */
  answerDailyQuestion: async (
    data: DailyAnswerRequest,
  ): Promise<DailyAnswerResponse> => {
    const response = await api.post<DailyAnswerResponse>(
      '/compatibility/daily',
      data,
    );
    return response.data;
  },

  /**
   * Yanitladiktan sonra istatistikleri getir
   */
  getDailyInsight: async (questionId: string): Promise<DailyInsight> => {
    const response = await api.get<DailyInsight>(
      '/compatibility/daily/insight',
      { params: { questionId } },
    );
    return response.data;
  },

  /**
   * Kullanicinin yanit serisini getir
   */
  getStreak: async (): Promise<DailyStreak> => {
    const response = await api.get<DailyStreak>('/compatibility/daily/streak');
    return response.data;
  },

  /**
   * Belirli bir soru icin global istatistikleri getir
   * (toplam yanitlayan, secenek dagilimi, en populer cevap)
   */
  getAnswerStats: async (questionId: string): Promise<AnswerStatsResponse> => {
    const response = await api.get<AnswerStatsResponse>(
      `/compatibility/daily/stats/${questionId}`,
    );
    return response.data;
  },
};
