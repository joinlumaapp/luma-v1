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
  options: QuestionOption[] | string[];
  answeredOptionId: string | null;
  isAnswered: boolean;
}

export interface GetQuestionsResponse {
  questions: CompatibilityQuestion[];
  answeredCount: number;
  totalCount: number;
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

export interface DetailedCompatibilityArea {
  category: string;
  labelTr: string;
  description: string;
}

export interface DetailedCompatibilityResponse {
  score: number;
  level: 'NORMAL' | 'SUPER';
  strongAreas: DetailedCompatibilityArea[];
  differences: DetailedCompatibilityArea[];
  conversationStarters: string[];
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

  // Submit answers as a Record<questionId, optionId> (onboarding compat)
  // Uses bulk endpoint to send all answers in a single request
  submitAnswers: async (answers: Record<string, string>): Promise<void> => {
    const bulkItems: BulkAnswerItem[] = Object.entries(answers).map(
      ([questionId, optionId]) => ({
        questionId,
        optionId,
      }),
    );
    await api.post('/compatibility/answers/bulk', { answers: bulkItems });
  },

  // Get compatibility score with another user
  getScoreWithUser: async (targetUserId: string): Promise<CompatibilityScore> => {
    const response = await api.get<CompatibilityScore>(
      `/compatibility/score/${targetUserId}`,
    );
    return response.data;
  },

  // Get detailed compatibility breakdown with a user
  getDetailedCompatibility: async (targetUserId: string): Promise<DetailedCompatibilityResponse> => {
    const response = await api.get<DetailedCompatibilityResponse>(
      `/compatibility/detailed/${targetUserId}`,
    );
    return response.data;
  },

  // Get all my submitted answers
  getMyAnswers: async (): Promise<MyAnswersResponse> => {
    const response = await api.get<MyAnswersResponse>('/compatibility/my-answers');
    return response.data;
  },
};
