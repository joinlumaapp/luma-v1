// Chat persistence layer — AsyncStorage-backed message storage
// Ensures messages survive app restarts, navigation, and API failures

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from './chatService';

const MESSAGES_KEY_PREFIX = '@luma_chat_messages_';
const CONVERSATIONS_META_KEY = '@luma_chat_conversations_meta';

// In-memory cache for fast reads — hydrated from AsyncStorage on init
const messageCache: Record<string, ChatMessage[]> = {};
let metaCache: Record<string, { lastMessage: string; lastMessageAt: string; senderId: string }> = {};
let hydrated = false;

// ─── Hydration ─────────────────────────────────────────────

export const hydrateChatStorage = async (): Promise<void> => {
  if (hydrated) return;
  try {
    // Load conversation meta
    const metaRaw = await AsyncStorage.getItem(CONVERSATIONS_META_KEY);
    if (metaRaw) {
      metaCache = JSON.parse(metaRaw);
    }

    // Load all message threads
    const allKeys = await AsyncStorage.getAllKeys();
    const chatKeys = allKeys.filter((k) => k.startsWith(MESSAGES_KEY_PREFIX));
    if (chatKeys.length > 0) {
      const entries = await AsyncStorage.multiGet(chatKeys);
      for (const [key, value] of entries) {
        if (value) {
          const matchId = key.replace(MESSAGES_KEY_PREFIX, '');
          messageCache[matchId] = JSON.parse(value);
        }
      }
    }
    hydrated = true;
  } catch {
    hydrated = true; // Mark hydrated even on error to avoid retry loops
  }
};

// ─── Messages ──────────────────────────────────────────────

export const getPersistedMessages = (matchId: string): ChatMessage[] => {
  return messageCache[matchId] ?? [];
};

export const persistMessage = async (matchId: string, message: ChatMessage): Promise<void> => {
  if (!messageCache[matchId]) {
    messageCache[matchId] = [];
  }

  // Deduplicate by id
  const idx = messageCache[matchId].findIndex((m) => m.id === message.id);
  if (idx >= 0) {
    messageCache[matchId][idx] = message;
  } else {
    messageCache[matchId].push(message);
  }

  // Sort by createdAt to maintain order
  messageCache[matchId].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Update meta
  const lastMsg = messageCache[matchId][messageCache[matchId].length - 1];
  if (lastMsg) {
    metaCache[matchId] = {
      lastMessage: lastMsg.content,
      lastMessageAt: lastMsg.createdAt,
      senderId: lastMsg.senderId,
    };
  }

  // Async write — fire and forget with error handling
  try {
    await AsyncStorage.setItem(
      MESSAGES_KEY_PREFIX + matchId,
      JSON.stringify(messageCache[matchId])
    );
    await AsyncStorage.setItem(CONVERSATIONS_META_KEY, JSON.stringify(metaCache));
  } catch {
    // Storage write failed — messages still exist in memory cache
  }
};

export const persistMessages = async (matchId: string, messages: ChatMessage[]): Promise<void> => {
  messageCache[matchId] = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Update meta from last message
  const lastMsg = messageCache[matchId][messageCache[matchId].length - 1];
  if (lastMsg) {
    metaCache[matchId] = {
      lastMessage: lastMsg.content,
      lastMessageAt: lastMsg.createdAt,
      senderId: lastMsg.senderId,
    };
  }

  try {
    await AsyncStorage.setItem(
      MESSAGES_KEY_PREFIX + matchId,
      JSON.stringify(messageCache[matchId])
    );
    await AsyncStorage.setItem(CONVERSATIONS_META_KEY, JSON.stringify(metaCache));
  } catch {
    // Storage write failed
  }
};

export const replaceMessageById = async (
  matchId: string,
  oldId: string,
  newMessage: ChatMessage
): Promise<void> => {
  if (!messageCache[matchId]) return;

  const idx = messageCache[matchId].findIndex((m) => m.id === oldId);
  if (idx >= 0) {
    messageCache[matchId][idx] = newMessage;
  } else {
    // Old message not found — just add the new one
    messageCache[matchId].push(newMessage);
  }

  // Update meta
  const lastMsg = messageCache[matchId][messageCache[matchId].length - 1];
  if (lastMsg) {
    metaCache[matchId] = {
      lastMessage: lastMsg.content,
      lastMessageAt: lastMsg.createdAt,
      senderId: lastMsg.senderId,
    };
  }

  try {
    await AsyncStorage.setItem(
      MESSAGES_KEY_PREFIX + matchId,
      JSON.stringify(messageCache[matchId])
    );
    await AsyncStorage.setItem(CONVERSATIONS_META_KEY, JSON.stringify(metaCache));
  } catch {
    // Storage write failed
  }
};

// ─── Conversation Meta ─────────────────────────────────────

export const getConversationMeta = (matchId: string): { lastMessage: string; lastMessageAt: string; senderId: string } | null => {
  return metaCache[matchId] ?? null;
};

export const getAllConversationMeta = (): Record<string, { lastMessage: string; lastMessageAt: string; senderId: string }> => {
  return { ...metaCache };
};

// ─── Cleanup ───────────────────────────────────────────────

export const clearConversation = async (matchId: string): Promise<void> => {
  delete messageCache[matchId];
  delete metaCache[matchId];
  try {
    await AsyncStorage.removeItem(MESSAGES_KEY_PREFIX + matchId);
    await AsyncStorage.setItem(CONVERSATIONS_META_KEY, JSON.stringify(metaCache));
  } catch {
    // Cleanup failed
  }
};
