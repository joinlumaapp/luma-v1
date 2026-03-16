/**
 * LUMA V1 — Chat Flow E2E Tests
 *
 * Tests the chat/messaging pipeline through HTTP layer using supertest.
 * Verifies: route registration, DTO validation, guard enforcement, response structure.
 *
 * Endpoints tested:
 *   GET   /api/v1/chat/conversations
 *   GET   /api/v1/chat/conversations/:matchId/messages
 *   POST  /api/v1/chat/conversations/:matchId/messages
 *   PATCH /api/v1/chat/conversations/:matchId/read
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ChatController } from '../src/modules/chat/chat.controller';
import { ChatService } from '../src/modules/chat/chat.service';
import { ChatGateway } from '../src/modules/chat/chat.gateway';
import {
  createTestApp,
  TEST_USER,
  cleanupTestData,
  createMockConversation,
  createMockMessage,
} from './helpers';

describe('Chat E2E — /api/v1/chat', () => {
  let app: INestApplication;
  let jwtToken: string;

  const MATCH_ID = 'match-uuid-1';
  const MESSAGE_ID = 'msg-uuid-1';

  const mockChatService = {
    getConversations: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
    reactToMessage: jest.fn(),
  };

  const mockChatGateway = {
    sendMessageToMatch: jest.fn(),
    emitTyping: jest.fn(),
  };

  beforeAll(async () => {
    const testApp = await createTestApp({
      controllers: [ChatController],
      serviceProviders: [
        { provide: ChatService, useValue: mockChatService },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    });
    app = testApp.app;
    jwtToken = testApp.jwtToken;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/chat/conversations
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /chat/conversations', () => {
    it('should return conversations list with valid JWT and 200 status', async () => {
      const mockConversations = {
        conversations: [
          {
            matchId: MATCH_ID,
            partner: {
              userId: 'partner-uuid-1',
              firstName: 'Ayse',
              photoUrl: 'https://cdn.luma.app/thumb.jpg',
            },
            lastMessage: {
              id: MESSAGE_ID,
              content: 'Merhaba!',
              senderId: 'partner-uuid-1',
              type: 'TEXT',
              status: 'SENT',
              mediaUrl: null,
              isRead: false,
              createdAt: '2026-02-24T12:00:00.000Z',
            },
            matchedAt: '2026-02-20T10:00:00.000Z',
          },
        ],
      };
      mockChatService.getConversations.mockResolvedValue(mockConversations);

      const response = await request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('conversations');
      expect(Array.isArray(response.body.conversations)).toBe(true);
      expect(response.body.conversations[0]).toHaveProperty('matchId');
      expect(response.body.conversations[0]).toHaveProperty('partner');
      expect(response.body.conversations[0]).toHaveProperty('lastMessage');
      expect(mockChatService.getConversations).toHaveBeenCalledWith(TEST_USER.id);
    });

    it('should return empty conversations array when no matches', async () => {
      mockChatService.getConversations.mockResolvedValue({ conversations: [] });

      const response = await request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.conversations).toEqual([]);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .expect(401);

      expect(mockChatService.getConversations).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/chat/conversations')
        .set('Authorization', 'Bearer bad-token')
        .expect(401);

      expect(mockChatService.getConversations).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /api/v1/chat/conversations/:matchId/messages
  // ═══════════════════════════════════════════════════════════════════

  describe('GET /chat/conversations/:matchId/messages', () => {
    it('should return messages with valid JWT and 200 status', async () => {
      const mockMessages = {
        messages: [
          {
            id: MESSAGE_ID,
            senderId: TEST_USER.id,
            content: 'Merhaba!',
            type: 'TEXT',
            status: 'SENT',
            mediaUrl: null,
            isRead: false,
            createdAt: '2026-02-24T12:00:00.000Z',
          },
        ],
        nextCursor: null,
        hasMore: false,
      };
      mockChatService.getMessages.mockResolvedValue(mockMessages);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('messages');
      expect(response.body).toHaveProperty('nextCursor');
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages[0]).toHaveProperty('id');
      expect(response.body.messages[0]).toHaveProperty('content');
      expect(response.body.messages[0]).toHaveProperty('senderId');
      expect(mockChatService.getMessages).toHaveBeenCalledWith(
        TEST_USER.id,
        MATCH_ID,
        undefined,
        50,
      );
    });

    it('should pass cursor and limit query parameters', async () => {
      mockChatService.getMessages.mockResolvedValue({
        messages: [],
        nextCursor: null,
        hasMore: false,
      });

      await request(app.getHttpServer())
        .get(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .query({ cursor: 'cursor-id-1', limit: '25' })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(mockChatService.getMessages).toHaveBeenCalledWith(
        TEST_USER.id,
        MATCH_ID,
        'cursor-id-1',
        25,
      );
    });

    it('should cap limit at 100', async () => {
      mockChatService.getMessages.mockResolvedValue({
        messages: [],
        nextCursor: null,
        hasMore: false,
      });

      await request(app.getHttpServer())
        .get(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .query({ limit: '500' })
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Controller caps at Math.min(parseInt('500'), 100) = 100
      expect(mockChatService.getMessages).toHaveBeenCalledWith(
        TEST_USER.id,
        MATCH_ID,
        undefined,
        100,
      );
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .expect(401);

      expect(mockChatService.getMessages).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /api/v1/chat/conversations/:matchId/messages
  // ═══════════════════════════════════════════════════════════════════

  describe('POST /chat/conversations/:matchId/messages', () => {
    it('should send text message with valid content and return 201', async () => {
      mockChatService.sendMessage.mockResolvedValue({
        id: MESSAGE_ID,
        senderId: TEST_USER.id,
        content: 'Merhaba, nasilsin?',
        type: 'TEXT',
        status: 'SENT',
        mediaUrl: null,
        isRead: false,
        createdAt: '2026-02-24T12:00:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ content: 'Merhaba, nasilsin?' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('content', 'Merhaba, nasilsin?');
      expect(response.body).toHaveProperty('senderId');
      expect(response.body).toHaveProperty('type', 'TEXT');
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        TEST_USER.id,
        MATCH_ID,
        expect.objectContaining({ content: 'Merhaba, nasilsin?' }),
      );
    });

    it('should send message with optional type=IMAGE and mediaUrl', async () => {
      mockChatService.sendMessage.mockResolvedValue({
        id: 'msg-2',
        senderId: TEST_USER.id,
        content: 'Bak bu guzel!',
        type: 'IMAGE',
        status: 'SENT',
        mediaUrl: 'https://cdn.luma.app/chat/image.jpg',
        isRead: false,
        createdAt: '2026-02-24T12:05:00.000Z',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          content: 'Bak bu guzel!',
          type: 'IMAGE',
          mediaUrl: 'https://cdn.luma.app/chat/image.jpg',
        })
        .expect(201);

      expect(response.body.type).toBe('IMAGE');
      expect(response.body.mediaUrl).toBeDefined();
    });

    it('should reject empty content with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ content: '' })
        .expect(400);

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('should reject missing content with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})
        .expect(400);

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('should reject content exceeding 1000 chars with 400', async () => {
      const longContent = 'A'.repeat(1001);

      await request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ content: longContent })
        .expect(400);

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('should reject invalid type value with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ content: 'Hello', type: 'VIDEO' })
        .expect(400);

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('should reject invalid mediaUrl format with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ content: 'Hello', mediaUrl: 'not-a-url' })
        .expect(400);

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .send({ content: 'Merhaba!' })
        .expect(401);

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });

    it('should reject extra/unknown fields (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${MATCH_ID}/messages`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ content: 'Hello', hackField: 'inject' })
        .expect(400);

      expect(mockChatService.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /api/v1/chat/conversations/:matchId/read
  // ═══════════════════════════════════════════════════════════════════

  describe('PATCH /chat/conversations/:matchId/read', () => {
    it('should mark messages as read with valid JWT and return 200', async () => {
      mockChatService.markAsRead.mockResolvedValue({
        markedAsRead: 5,
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/chat/conversations/${MATCH_ID}/read`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('markedAsRead', 5);
      expect(mockChatService.markAsRead).toHaveBeenCalledWith(
        TEST_USER.id,
        MATCH_ID,
      );
    });

    it('should return 0 when no unread messages', async () => {
      mockChatService.markAsRead.mockResolvedValue({ markedAsRead: 0 });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/chat/conversations/${MATCH_ID}/read`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.markedAsRead).toBe(0);
    });

    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/chat/conversations/${MATCH_ID}/read`)
        .expect(401);

      expect(mockChatService.markAsRead).not.toHaveBeenCalled();
    });
  });
});
