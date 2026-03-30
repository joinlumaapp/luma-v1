import { API_ROUTES } from '@luma/shared';
import type { CallHistoryItem, CallHistoryResponse } from '@luma/shared';
import api, { buildUrl } from './api';

export const callHistoryService = {
  getCallHistory: async (
    cursor?: string,
    limit = 20,
  ): Promise<CallHistoryResponse> => {
    const params: Record<string, string | number> = { limit };
    if (cursor) params.cursor = cursor;

    const response = await api.get<CallHistoryResponse>(
      API_ROUTES.CALL_HISTORY.GET_ALL,
      { params },
    );
    return response.data;
  },

  getCallById: async (callId: string): Promise<CallHistoryItem> => {
    const response = await api.get<CallHistoryItem>(
      buildUrl(API_ROUTES.CALL_HISTORY.GET_ONE, { callId }),
    );
    return response.data;
  },

  deleteCall: async (callId: string): Promise<void> => {
    await api.delete(
      buildUrl(API_ROUTES.CALL_HISTORY.DELETE, { callId }),
    );
  },
};
