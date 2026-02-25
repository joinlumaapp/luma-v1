import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ReactionEmojiValue } from './dto/message-reaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('ChatController', () => {
  let controller: ChatController;

  const mockChatService = {
    getConversations: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
    reactToMessage: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: mockChatService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /chat/conversations
  // ═══════════════════════════════════════════════════════════════

  describe('getConversations()', () => {
    const userId = 'user-uuid-1';

    it('should return user conversations', async () => {
      const expected = {
        conversations: [
          {
            matchId: 'match-1',
            partner: { userId: 'partner-1', firstName: 'Ayse', photoUrl: null },
            lastMessage: {
              id: 'msg-1',
              content: 'Merhaba!',
              senderId: 'partner-1',
              isRead: false,
              createdAt: '2025-06-01T12:00:00Z',
            },
            matchedAt: '2025-05-15T10:00:00Z',
          },
        ],
      };
      mockChatService.getConversations.mockResolvedValue(expected);

      const result = await controller.getConversations(userId);

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].partner.firstName).toBe('Ayse');
    });

    it('should return empty conversations for user with no matches', async () => {
      mockChatService.getConversations.mockResolvedValue({ conversations: [] });

      const result = await controller.getConversations(userId);

      expect(result.conversations).toEqual([]);
    });

    it('should delegate to chatService.getConversations with userId', async () => {
      mockChatService.getConversations.mockResolvedValue({ conversations: [] });

      await controller.getConversations(userId);

      expect(mockChatService.getConversations).toHaveBeenCalledWith(userId);
      expect(mockChatService.getConversations).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /chat/conversations/:matchId/messages
  // ═══════════════════════════════════════════════════════════════

  describe('getMessages()', () => {
    const userId = 'user-uuid-1';
    const matchId = 'match-uuid-1';

    it('should return messages with pagination', async () => {
      const expected = {
        messages: [
          { id: 'msg-1', senderId: userId, content: 'Merhaba!', isRead: true, createdAt: '2025-06-01T12:00:00Z' },
        ],
        nextCursor: null,
        hasMore: false,
      };
      mockChatService.getMessages.mockResolvedValue(expected);

      const result = await controller.getMessages(userId, matchId);

      expect(result.messages).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('should pass cursor and limit to service', async () => {
      mockChatService.getMessages.mockResolvedValue({
        messages: [],
        nextCursor: null,
        hasMore: false,
      });

      await controller.getMessages(userId, matchId, 'cursor-id', '25');

      expect(mockChatService.getMessages).toHaveBeenCalledWith(
        userId,
        matchId,
        'cursor-id',
        25,
      );
    });

    it('should default limit to 50 when not provided', async () => {
      mockChatService.getMessages.mockResolvedValue({
        messages: [],
        nextCursor: null,
        hasMore: false,
      });

      await controller.getMessages(userId, matchId);

      expect(mockChatService.getMessages).toHaveBeenCalledWith(
        userId,
        matchId,
        undefined,
        50,
      );
    });

    it('should cap limit at 100', async () => {
      mockChatService.getMessages.mockResolvedValue({
        messages: [],
        nextCursor: null,
        hasMore: false,
      });

      await controller.getMessages(userId, matchId, undefined, '500');

      expect(mockChatService.getMessages).toHaveBeenCalledWith(
        userId,
        matchId,
        undefined,
        100,
      );
    });

    it('should throw NotFoundException when conversation does not exist', async () => {
      mockChatService.getMessages.mockRejectedValue(
        new NotFoundException('Konusma bulunamadi'),
      );

      await expect(controller.getMessages(userId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a participant', async () => {
      mockChatService.getMessages.mockRejectedValue(
        new ForbiddenException('Bu konusmaya erisim yetkiniz yok'),
      );

      await expect(controller.getMessages(userId, matchId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /chat/conversations/:matchId/messages
  // ═══════════════════════════════════════════════════════════════

  describe('sendMessage()', () => {
    const userId = 'user-uuid-1';
    const matchId = 'match-uuid-1';

    it('should send a message successfully', async () => {
      const dto = { content: 'Merhaba!' };
      const expected = {
        id: 'msg-new',
        senderId: userId,
        content: 'Merhaba!',
        isRead: false,
        createdAt: '2025-06-01T12:00:00Z',
      };
      mockChatService.sendMessage.mockResolvedValue(expected);

      const result = await controller.sendMessage(userId, matchId, dto);

      expect(result.id).toBe('msg-new');
      expect(result.content).toBe('Merhaba!');
      expect(result.isRead).toBe(false);
    });

    it('should throw ForbiddenException when match is inactive', async () => {
      const dto = { content: 'Test' };
      mockChatService.sendMessage.mockRejectedValue(
        new ForbiddenException('Bu eslesme artik aktif degil'),
      );

      await expect(controller.sendMessage(userId, matchId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delegate to chatService.sendMessage with userId, matchId and dto', async () => {
      const dto = { content: 'Selam!' };
      mockChatService.sendMessage.mockResolvedValue({ id: 'msg-1' });

      await controller.sendMessage(userId, matchId, dto);

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(userId, matchId, dto);
      expect(mockChatService.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PATCH /chat/conversations/:matchId/read
  // ═══════════════════════════════════════════════════════════════

  describe('markAsRead()', () => {
    const userId = 'user-uuid-1';
    const matchId = 'match-uuid-1';

    it('should mark messages as read successfully', async () => {
      mockChatService.markAsRead.mockResolvedValue({ markedAsRead: 5 });

      const result = await controller.markAsRead(userId, matchId);

      expect(result.markedAsRead).toBe(5);
    });

    it('should throw NotFoundException when conversation does not exist', async () => {
      mockChatService.markAsRead.mockRejectedValue(
        new NotFoundException('Konusma bulunamadi'),
      );

      await expect(controller.markAsRead(userId, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delegate to chatService.markAsRead with userId and matchId', async () => {
      mockChatService.markAsRead.mockResolvedValue({ markedAsRead: 0 });

      await controller.markAsRead(userId, matchId);

      expect(mockChatService.markAsRead).toHaveBeenCalledWith(userId, matchId);
      expect(mockChatService.markAsRead).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /chat/messages/:messageId/react
  // ═══════════════════════════════════════════════════════════════

  describe('reactToMessage()', () => {
    const userId = 'user-uuid-1';
    const messageId = 'msg-uuid-1';

    it('should add a reaction successfully', async () => {
      const dto = { emoji: ReactionEmojiValue.HEART };
      mockChatService.reactToMessage.mockResolvedValue({
        action: 'added',
        messageId,
        emoji: ReactionEmojiValue.HEART,
      });

      const result = await controller.reactToMessage(userId, messageId, dto);

      expect(result.action).toBe('added');
      expect(result.emoji).toBe(ReactionEmojiValue.HEART);
    });

    it('should toggle off an existing reaction', async () => {
      const dto = { emoji: ReactionEmojiValue.HEART };
      mockChatService.reactToMessage.mockResolvedValue({
        action: 'removed',
        messageId,
        emoji: ReactionEmojiValue.HEART,
      });

      const result = await controller.reactToMessage(userId, messageId, dto);

      expect(result.action).toBe('removed');
    });

    it('should throw NotFoundException when message does not exist', async () => {
      const dto = { emoji: ReactionEmojiValue.THUMBS_UP };
      mockChatService.reactToMessage.mockRejectedValue(
        new NotFoundException('Mesaj bulunamadi'),
      );

      await expect(controller.reactToMessage(userId, 'bad-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delegate to chatService.reactToMessage with userId, messageId and dto', async () => {
      const dto = { emoji: ReactionEmojiValue.LAUGH };
      mockChatService.reactToMessage.mockResolvedValue({ action: 'added', messageId, emoji: ReactionEmojiValue.LAUGH });

      await controller.reactToMessage(userId, messageId, dto);

      expect(mockChatService.reactToMessage).toHaveBeenCalledWith(userId, messageId, dto);
      expect(mockChatService.reactToMessage).toHaveBeenCalledTimes(1);
    });
  });
});
