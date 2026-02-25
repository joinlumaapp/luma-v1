// Compatibility API service — questions, answers, scores

import api from './api';

export interface QuestionOption {
  id: string;
  labelEn: string;
  labelTr: string;
  order: number;
}

export interface CompatibilityQuestion {
  id: string;
  questionNumber: number;
  category: string;
  textEn: string;
  textTr: string;
  text: string;
  weight: number;
  isPremium: boolean;
  options: QuestionOption[] | string[];
  answeredOptionId: string | null;
  isAnswered: boolean;
}

export interface GetQuestionsResponse {
  questions: CompatibilityQuestion[];
  answeredCount: number;
  totalCount: number;
  hasPremiumAccess: boolean;
}

export interface SubmitAnswerRequest {
  questionId: string;
  answerIndex: number;
}

export interface SubmitAnswerResponse {
  questionId: string;
  optionId: string;
  saved: boolean;
  answeredCount: number;
  totalCount: number;
}

export interface BulkAnswerItem {
  questionId: string;
  optionId: string;
}

export interface CompatibilityScore {
  userId: string;
  targetUserId: string;
  baseScore: number;
  deepScore: number | null;
  finalScore: number;
  level: 'NORMAL' | 'SUPER';
  isSuperCompatible: boolean;
  breakdown: Record<string, number>;
}

export interface MyAnswersResponse {
  answers: Array<{
    questionId: string;
    questionNumber: number;
    category: string;
    textEn: string;
    textTr: string;
    isPremium: boolean;
    selectedOption: {
      id: string;
      labelEn: string;
      labelTr: string;
    };
    answeredAt: string;
  }>;
  totalAnswered: number;
  totalQuestions: number;
}

export const compatibilityService = {
  // Get all compatibility questions (20 core + 25 premium)
  getQuestions: async (): Promise<GetQuestionsResponse> => {
    const response = await api.get<GetQuestionsResponse>('/compatibility/questions');
    return response.data;
  },

  // Submit an answer to a compatibility question
  submitAnswer: async (data: SubmitAnswerRequest): Promise<SubmitAnswerResponse> => {
    const response = await api.post<SubmitAnswerResponse>(
      '/compatibility/answers',
      data,
    );
    return response.data;
  },

  // Submit all answers in bulk (used during onboarding)
  submitAnswersBulk: async (answers: BulkAnswerItem[]): Promise<void> => {
    await api.post('/compatibility/answers/bulk', { answers });
  },

  // Legacy: submit answers as a Record<questionId, answerIndex> (onboarding compat)
  submitAnswers: async (answers: Record<string, number>): Promise<void> => {
    // Convert Record<questionId, answerIndex> format to the
    // SubmitAnswerDto format and send individually
    const entries = Object.entries(answers);
    for (const [questionId, answerIndex] of entries) {
      await api.post('/compatibility/answers', { questionId, answerIndex });
    }
  },

  // Get compatibility score with another user
  getScoreWithUser: async (targetUserId: string): Promise<CompatibilityScore> => {
    const response = await api.get<CompatibilityScore>(
      `/compatibility/score/${targetUserId}`,
    );
    return response.data;
  },

  // Get all my submitted answers
  getMyAnswers: async (): Promise<MyAnswersResponse> => {
    const response = await api.get<MyAnswersResponse>('/compatibility/my-answers');
    return response.data;
  },
};
