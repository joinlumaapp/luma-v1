import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('StoriesController', () => {
  let controller: StoriesController;

  const mockStoriesService = {
    getStories: jest.fn(),
    createStory: jest.fn(),
    deleteStory: jest.fn(),
    markAsViewed: jest.fn(),
    getViewers: jest.fn(),
    replyToStory: jest.fn(),
    toggleLike: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoriesController],
      providers: [
        { provide: StoriesService, useValue: mockStoriesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StoriesController>(StoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ===============================================================
  // GET /stories
  // ===============================================================

  describe('getStories()', () => {
    it('should return grouped stories for the user', async () => {
      const expected = [
        {
          userId: 'u2',
          userName: 'Ahmet',
          userAvatarUrl: 'https://cdn.luma.app/avatar.jpg',
          stories: [{ id: 's1' }],
          hasUnseenStories: true,
          latestStoryAt: '2025-06-01T00:00:00.000Z',
        },
      ];
      mockStoriesService.getStories.mockResolvedValue(expected);

      const req = { user: { userId: 'u1' } };
      const result = await controller.getStories(req);

      expect(result).toHaveLength(1);
      expect(result[0].hasUnseenStories).toBe(true);
      expect(mockStoriesService.getStories).toHaveBeenCalledWith('u1');
    });

    it('should return empty array when no stories exist', async () => {
      mockStoriesService.getStories.mockResolvedValue([]);

      const req = { user: { userId: 'u1' } };
      const result = await controller.getStories(req);

      expect(result).toEqual([]);
    });
  });

  // ===============================================================
  // POST /stories
  // ===============================================================

  describe('createStory()', () => {
    it('should create a story with file upload', async () => {
      const expected = {
        id: 's1',
        userId: 'u1',
        mediaUrl: 'https://cdn.luma.app/stories/test.jpg',
        mediaType: 'image',
      };
      mockStoriesService.createStory.mockResolvedValue(expected);

      const req = { user: { userId: 'u1' } };
      const file = {
        fieldname: 'media',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from(''),
      };
      const dto = { mediaType: 'image', overlays: [] };

      const result = await controller.createStory(req, file as any, dto as any);

      expect(result.id).toBe('s1');
      expect(mockStoriesService.createStory).toHaveBeenCalledWith('u1', file, dto);
    });
  });

  // ===============================================================
  // DELETE /stories/:id
  // ===============================================================

  describe('deleteStory()', () => {
    it('should delete own story', async () => {
      mockStoriesService.deleteStory.mockResolvedValue(undefined);

      const req = { user: { userId: 'u1' } };
      await controller.deleteStory(req, 's1');

      expect(mockStoriesService.deleteStory).toHaveBeenCalledWith('u1', 's1');
    });

    it('should propagate NotFoundException', async () => {
      mockStoriesService.deleteStory.mockRejectedValue(
        new NotFoundException('Hikaye bulunamadi'),
      );

      const req = { user: { userId: 'u1' } };
      await expect(controller.deleteStory(req, 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate ForbiddenException for non-owner', async () => {
      mockStoriesService.deleteStory.mockRejectedValue(
        new ForbiddenException('Bu hikayeyi silme yetkiniz yok'),
      );

      const req = { user: { userId: 'u2' } };
      await expect(controller.deleteStory(req, 's1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===============================================================
  // POST /stories/:id/view
  // ===============================================================

  describe('markAsViewed()', () => {
    it('should mark story as viewed', async () => {
      mockStoriesService.markAsViewed.mockResolvedValue(undefined);

      const req = { user: { userId: 'u1' } };
      await controller.markAsViewed(req, 's1');

      expect(mockStoriesService.markAsViewed).toHaveBeenCalledWith('u1', 's1');
    });
  });

  // ===============================================================
  // GET /stories/:id/viewers
  // ===============================================================

  describe('getViewers()', () => {
    it('should return viewers list', async () => {
      const expected = [
        {
          userId: 'u2',
          userName: 'Ahmet',
          userAvatarUrl: 'https://cdn.luma.app/avatar.jpg',
          viewedAt: '2025-06-01T00:00:00.000Z',
        },
      ];
      mockStoriesService.getViewers.mockResolvedValue(expected);

      const req = { user: { userId: 'u1' } };
      const result = await controller.getViewers(req, 's1');

      expect(result).toHaveLength(1);
      expect(mockStoriesService.getViewers).toHaveBeenCalledWith('u1', 's1');
    });

    it('should propagate ForbiddenException for non-owner', async () => {
      mockStoriesService.getViewers.mockRejectedValue(
        new ForbiddenException('Goruntuleme bilgisine erisim yetkiniz yok'),
      );

      const req = { user: { userId: 'u2' } };
      await expect(controller.getViewers(req, 's1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===============================================================
  // POST /stories/:id/reply
  // ===============================================================

  describe('replyToStory()', () => {
    it('should reply to story successfully', async () => {
      const expected = { success: true, message: 'Yanitiniz gonderildi' };
      mockStoriesService.replyToStory.mockResolvedValue(expected);

      const req = { user: { userId: 'u1' } };
      const result = await controller.replyToStory(req, 's1', {
        message: 'Harika hikaye!',
      });

      expect(result.success).toBe(true);
      expect(mockStoriesService.replyToStory).toHaveBeenCalledWith(
        'u1',
        's1',
        'Harika hikaye!',
      );
    });

    it('should propagate NotFoundException', async () => {
      mockStoriesService.replyToStory.mockRejectedValue(
        new NotFoundException('Hikaye bulunamadi'),
      );

      const req = { user: { userId: 'u1' } };
      await expect(
        controller.replyToStory(req, 'bad-id', { message: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===============================================================
  // POST /stories/:id/like
  // ===============================================================

  describe('toggleLike()', () => {
    it('should like a story', async () => {
      const expected = { liked: true, likeCount: 5 };
      mockStoriesService.toggleLike.mockResolvedValue(expected);

      const req = { user: { userId: 'u1' } };
      const result = await controller.toggleLike(req, 's1');

      expect(result.liked).toBe(true);
      expect(result.likeCount).toBe(5);
      expect(mockStoriesService.toggleLike).toHaveBeenCalledWith('u1', 's1');
    });

    it('should unlike a story', async () => {
      const expected = { liked: false, likeCount: 4 };
      mockStoriesService.toggleLike.mockResolvedValue(expected);

      const req = { user: { userId: 'u1' } };
      const result = await controller.toggleLike(req, 's1');

      expect(result.liked).toBe(false);
      expect(result.likeCount).toBe(4);
    });
  });
});
