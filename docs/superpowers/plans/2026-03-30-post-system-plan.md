# Post (Gonderi) System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent post system (Gonderi) to LUMA — users create permanent posts (photo/video/text), posts appear in the feed below story rings, likes trigger push notifications, like count is public, liker list is premium-only, and user's own posts display in profile.

**Architecture:** New `Post` + `PostLike` Prisma models, new `PostsModule` (NestJS), API endpoints for CRUD + like + liker list. Frontend removes topic categories from feed, connects to real API, and wires profile "Gonderilerim" tab to `GET /posts/my`.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React Native, Zustand, expo-image-picker

---

## File Structure

### Backend (create)
- `apps/backend/src/modules/posts/posts.module.ts` — NestJS module
- `apps/backend/src/modules/posts/posts.controller.ts` — REST controller
- `apps/backend/src/modules/posts/posts.service.ts` — Business logic
- `apps/backend/src/modules/posts/dto/create-post.dto.ts` — Input validation

### Backend (modify)
- `apps/backend/src/prisma/schema.prisma` — Add Post + PostLike models
- `apps/backend/src/app.module.ts` — Register PostsModule
- `packages/shared/src/constants/api.ts` — Add POSTS routes
- `packages/shared/src/types/index.ts` — Export post types

### Frontend (create)
- `packages/shared/src/types/post.ts` — Shared post types

### Frontend (modify)
- `apps/mobile/src/services/socialFeedService.ts` — Remove topics, connect to real API
- `apps/mobile/src/stores/socialFeedStore.ts` — Update store actions
- `apps/mobile/src/components/feed/FeedCard.tsx` — Remove topic references
- `apps/mobile/src/screens/discovery/SocialFeedScreen.tsx` — Remove topic UI, connect API
- `apps/mobile/src/screens/profile/ProfileScreen.tsx` — Wire Gonderilerim to real API

---

### Task 1: Prisma Schema — Post + PostLike models

**Files:**
- Modify: `apps/backend/src/prisma/schema.prisma`

- [ ] **Step 1: Add Post model to schema**

Add after the Story section in schema.prisma:

```prisma
// ============================================================
// SUBSYSTEM: Posts (Permanent user posts — Gonderi)
// Persistent posts displayed in feed and on user profile
// ============================================================

model Post {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  postType  String    @map("post_type") @db.VarChar(10) // photo, video, text
  content   String    @db.Text
  photoUrls String[]  @map("photo_urls")
  videoUrl  String?   @map("video_url")
  likeCount Int       @default(0) @map("like_count")
  deletedAt DateTime? @map("deleted_at")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  likes PostLike[]

  @@index([userId, createdAt])
  @@index([createdAt])
  @@map("posts")
}

model PostLike {
  id        String   @id @default(uuid()) @db.Uuid
  postId    String   @map("post_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([postId, userId])
  @@index([postId])
  @@index([userId])
  @@map("post_likes")
}
```

- [ ] **Step 2: Add relations to User model**

In the User model, add:

```prisma
  posts              Post[]
  postLikes          PostLike[]
```

- [ ] **Step 3: Generate Prisma client**

Run: `cd apps/backend && npx prisma generate`
Expected: Prisma Client generated successfully

- [ ] **Step 4: Create migration**

Run: `cd apps/backend && npx prisma migrate dev --name add_posts_system`
Expected: Migration created and applied

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/prisma/schema.prisma apps/backend/src/prisma/migrations/
git commit -m "feat: add Post and PostLike models to Prisma schema"
```

---

### Task 2: Shared Types + API Routes

**Files:**
- Create: `packages/shared/src/types/post.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/constants/api.ts`

- [ ] **Step 1: Create shared post types**

```typescript
// packages/shared/src/types/post.ts
// LUMA V1 — Post (Gonderi) Types

export type PostType = 'photo' | 'video' | 'text';

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAge: number;
  userCity: string;
  userAvatarUrl: string;
  isVerified: boolean;
  verificationLevel: 'NONE' | 'VERIFIED' | 'PREMIUM';
  isFollowing: boolean;
  intentionTag: string;
  postType: PostType;
  content: string;
  photoUrls: string[];
  videoUrl: string | null;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface CreatePostRequest {
  postType: PostType;
  content: string;
  photoUrls: string[];
  videoUrl?: string | null;
}

export interface PostFeedResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PostLikeResponse {
  liked: boolean;
  likeCount: number;
}

export interface PostLiker {
  userId: string;
  userName: string;
  userAvatarUrl: string;
  likedAt: string;
}
```

- [ ] **Step 2: Export post types from index**

In `packages/shared/src/types/index.ts`, add:

```typescript
export * from './post';
```

- [ ] **Step 3: Add POSTS routes to api.ts**

In `packages/shared/src/constants/api.ts`, add after the STORIES block:

```typescript
  // Posts (Gonderi — permanent feed posts)
  POSTS: {
    LIST: '/posts',                  // GET — feed posts (paginated)
    CREATE: '/posts',                // POST — create post
    MY: '/posts/my',                 // GET — own posts for profile
    DELETE: '/posts/:postId',        // DELETE — soft delete own post
    LIKE: '/posts/:postId/like',     // POST — toggle like
    LIKERS: '/posts/:postId/likers', // GET — liker list (premium only)
  },
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/post.ts packages/shared/src/types/index.ts packages/shared/src/constants/api.ts
git commit -m "feat: add Post shared types and API routes"
```

---

### Task 3: Backend PostsModule — Service + Controller

**Files:**
- Create: `apps/backend/src/modules/posts/dto/create-post.dto.ts`
- Create: `apps/backend/src/modules/posts/posts.service.ts`
- Create: `apps/backend/src/modules/posts/posts.controller.ts`
- Create: `apps/backend/src/modules/posts/posts.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Create DTO**

```typescript
// apps/backend/src/modules/posts/dto/create-post.dto.ts
import { IsString, IsIn, IsArray, IsOptional, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsIn(['photo', 'video', 'text'])
  postType: string;

  @IsString()
  @MaxLength(2000)
  content: string;

  @IsArray()
  @IsString({ each: true })
  photoUrls: string[];

  @IsOptional()
  @IsString()
  videoUrl?: string | null;
}
```

- [ ] **Step 2: Create PostsService**

```typescript
// apps/backend/src/modules/posts/posts.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  private readonly PAGE_SIZE = 20;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Get feed posts (paginated, newest first) */
  async getFeedPosts(userId: string, cursor?: string) {
    const posts = await this.prisma.post.findMany({
      where: { deletedAt: null },
      take: this.PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                birthDate: true,
                city: true,
                intentionTag: true,
              },
            },
            photos: {
              where: { isPrimary: true },
              select: { url: true },
              take: 1,
            },
            selfieVerified: true,
            packageTier: true,
          },
        },
        likes: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
      },
    });

    // Check follow status for each post user
    const postUserIds = [...new Set(posts.map((p) => p.userId))];
    const follows = await this.prisma.userFollow.findMany({
      where: { followerId: userId, followingId: { in: postUserIds } },
      select: { followingId: true },
    });
    const followedSet = new Set(follows.map((f) => f.followingId));

    const hasMore = posts.length > this.PAGE_SIZE;
    const sliced = hasMore ? posts.slice(0, this.PAGE_SIZE) : posts;
    const nextCursor = hasMore ? sliced[sliced.length - 1].id : null;

    return {
      posts: sliced.map((post) => this.mapPostToResponse(post, followedSet, userId)),
      nextCursor,
      hasMore,
    };
  }

  /** Get current user's own posts for profile */
  async getMyPosts(userId: string) {
    const posts = await this.prisma.post.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                birthDate: true,
                city: true,
                intentionTag: true,
              },
            },
            photos: {
              where: { isPrimary: true },
              select: { url: true },
              take: 1,
            },
            selfieVerified: true,
            packageTier: true,
          },
        },
        likes: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
      },
    });

    return posts.map((post) => this.mapPostToResponse(post, new Set(), userId));
  }

  /** Create a new post */
  async createPost(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        userId,
        postType: dto.postType,
        content: dto.content,
        photoUrls: dto.photoUrls,
        videoUrl: dto.videoUrl ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                birthDate: true,
                city: true,
                intentionTag: true,
              },
            },
            photos: {
              where: { isPrimary: true },
              select: { url: true },
              take: 1,
            },
            selfieVerified: true,
            packageTier: true,
          },
        },
      },
    });

    this.logger.log(`User ${userId} created post ${post.id}`);
    return this.mapPostToResponse({ ...post, likes: [] }, new Set(), userId);
  }

  /** Soft-delete own post */
  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Gonderi bulunamadi');
    if (post.userId !== userId) throw new ForbiddenException('Bu gonderiyi silme yetkiniz yok');

    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`User ${userId} deleted post ${postId}`);
  }

  /** Toggle like on a post */
  async toggleLike(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException('Gonderi bulunamadi');

    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.postLike.delete({ where: { id: existing.id } }),
        this.prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      const updated = await this.prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } });
      return { liked: false, likeCount: updated?.likeCount ?? 0 };
    }

    await this.prisma.$transaction([
      this.prisma.postLike.create({ data: { postId, userId } }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    // Notify post owner (fire-and-forget, don't self-notify)
    if (post.userId !== userId) {
      const likerProfile = await this.prisma.userProfile.findUnique({
        where: { userId },
        select: { firstName: true },
      });
      this.notificationsService
        .notifyPostLike(post.userId, likerProfile?.firstName ?? 'Birisi', postId)
        .catch(() => {});
    }

    const updated = await this.prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } });
    return { liked: true, likeCount: updated?.likeCount ?? 0 };
  }

  /** Get likers list — premium only (Gold/Pro/Reserved) */
  async getLikers(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw new NotFoundException('Gonderi bulunamadi');

    const likes = await this.prisma.postLike.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
            photos: {
              where: { isPrimary: true },
              select: { url: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return likes.map((like) => ({
      userId: like.user.id,
      userName: like.user.profile?.firstName ?? 'Kullanici',
      userAvatarUrl: like.user.photos?.[0]?.url ?? '',
      likedAt: like.createdAt.toISOString(),
    }));
  }

  // ── Private helpers ──────────────────────────────────────────

  private mapPostToResponse(
    post: {
      id: string;
      userId: string;
      postType: string;
      content: string;
      photoUrls: string[];
      videoUrl: string | null;
      likeCount: number;
      createdAt: Date;
      user: {
        id: string;
        profile: {
          firstName: string | null;
          birthDate: Date | null;
          city: string | null;
          intentionTag: string | null;
        } | null;
        photos: { url: string }[];
        selfieVerified: boolean;
        packageTier: string;
      };
      likes: { id: string }[];
    },
    followedSet: Set<string>,
    currentUserId: string,
  ) {
    const profile = post.user.profile;
    const age = profile?.birthDate
      ? Math.floor((Date.now() - new Date(profile.birthDate).getTime()) / 31_557_600_000)
      : 0;
    const verificationLevel = post.user.packageTier !== 'FREE'
      ? 'PREMIUM'
      : post.user.selfieVerified
        ? 'VERIFIED'
        : 'NONE';

    return {
      id: post.id,
      userId: post.userId,
      userName: profile?.firstName ?? 'Kullanici',
      userAge: age,
      userCity: profile?.city ?? '',
      userAvatarUrl: post.user.photos?.[0]?.url ?? '',
      isVerified: post.user.selfieVerified,
      verificationLevel,
      isFollowing: followedSet.has(post.userId),
      intentionTag: profile?.intentionTag ?? 'EXPLORING',
      postType: post.postType as 'photo' | 'video' | 'text',
      content: post.content,
      photoUrls: post.photoUrls,
      videoUrl: post.videoUrl,
      likeCount: post.likeCount,
      isLiked: post.likes.length > 0,
      createdAt: post.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 3: Create PostsController**

```typescript
// apps/backend/src/modules/posts/posts.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async getFeedPosts(
    @Req() req: { user: { id: string } },
    @Query('cursor') cursor?: string,
  ) {
    return this.postsService.getFeedPosts(req.user.id, cursor);
  }

  @Get('my')
  async getMyPosts(@Req() req: { user: { id: string } }) {
    return this.postsService.getMyPosts(req.user.id);
  }

  @Post()
  async createPost(
    @Req() req: { user: { id: string } },
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.createPost(req.user.id, dto);
  }

  @Delete(':postId')
  async deletePost(
    @Req() req: { user: { id: string } },
    @Param('postId') postId: string,
  ) {
    await this.postsService.deletePost(req.user.id, postId);
    return { success: true };
  }

  @Post(':postId/like')
  async toggleLike(
    @Req() req: { user: { id: string } },
    @Param('postId') postId: string,
  ) {
    return this.postsService.toggleLike(req.user.id, postId);
  }

  @Get(':postId/likers')
  async getLikers(
    @Req() req: { user: { id: string; packageTier: string } },
    @Param('postId') postId: string,
  ) {
    if (req.user.packageTier === 'FREE') {
      throw new ForbiddenException('Bu ozellik premium uyelere ozeldir');
    }
    return this.postsService.getLikers(postId);
  }
}
```

- [ ] **Step 4: Create PostsModule**

```typescript
// apps/backend/src/modules/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
```

- [ ] **Step 5: Register PostsModule in AppModule**

In `apps/backend/src/app.module.ts`, add:

```typescript
import { PostsModule } from './modules/posts/posts.module';
```

And add `PostsModule` to the `imports` array.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/posts/ apps/backend/src/app.module.ts
git commit -m "feat: add PostsModule with CRUD, like, and liker endpoints"
```

---

### Task 4: Frontend — Remove Topics, Update Types

**Files:**
- Modify: `apps/mobile/src/services/socialFeedService.ts`
- Modify: `apps/mobile/src/components/feed/FeedCard.tsx`

- [ ] **Step 1: Remove topic types and constants from socialFeedService.ts**

Remove the `FeedTopic` type, `FeedTopicOption` interface, and `FEED_TOPICS` array entirely.

Remove the `topic` field from `FeedPost` interface.

Remove `topic` from `CreatePostRequest` interface.

Update `getFeed` signature to remove the `topic` parameter:
```typescript
getFeed: async (
  filter: FeedFilter,
  cursor: string | null,
): Promise<FeedResponse> => {
```

Remove topic filtering from mock data logic.

- [ ] **Step 2: Remove unused fields from FeedPost**

Remove these fields from the `FeedPost` interface (they were related to topics/features that no longer exist):
- `topic`
- `commentCount`
- `flirtCount`
- `profileClickCount`
- `watchTimeMs`
- `followerCount`
- `isNewCreator`
- `isSaved`
- `userProfession`
- `userVibes`
- `distance`
- `compatibilityScore`

The lean `FeedPost` interface should match the shared `Post` type.

- [ ] **Step 3: Remove QuestionCard from FeedCard.tsx**

In `FeedCard.tsx`, remove the `QuestionCard` component and `questionStyles`. Remove the `isQuestion` check from the render — post content should always use `TextContent` or `MediaSection`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/services/socialFeedService.ts apps/mobile/src/components/feed/FeedCard.tsx
git commit -m "feat: remove topic categories from feed, simplify FeedPost type"
```

---

### Task 5: Frontend — Connect Feed to Real API

**Files:**
- Modify: `apps/mobile/src/services/socialFeedService.ts`
- Modify: `apps/mobile/src/stores/socialFeedStore.ts`
- Modify: `apps/mobile/src/screens/discovery/SocialFeedScreen.tsx`

- [ ] **Step 1: Update socialFeedService API calls**

Update `getFeed` to use the new `POSTS` API route:
```typescript
getFeed: async (
  filter: FeedFilter,
  cursor: string | null,
): Promise<FeedResponse> => {
  try {
    const response = await api.get<FeedResponse>('/posts', {
      params: { filter, cursor },
    });
    return response.data;
  } catch (error) {
    // Keep mock fallback for dev
    return devMockOrThrow(error, {
      posts: MOCK_POSTS,
      nextCursor: null,
      hasMore: false,
    }, 'socialFeedService.getFeed');
  }
},
```

Update `createPost` to POST to `/posts`:
```typescript
createPost: async (data: CreatePostRequest): Promise<FeedPost> => {
  try {
    const response = await api.post<FeedPost>('/posts', data);
    return response.data;
  } catch (error) {
    // mock fallback...
  }
},
```

Update `toggleLike` to POST to `/posts/:postId/like`:
```typescript
toggleLike: async (postId: string): Promise<{ liked: boolean; likeCount: number }> => {
  try {
    const response = await api.post<{ liked: boolean; likeCount: number }>(
      `/posts/${postId}/like`,
    );
    return response.data;
  } catch (error) {
    return devMockOrThrow(error, { liked: true, likeCount: 0 }, 'socialFeedService.toggleLike');
  }
},
```

- [ ] **Step 2: Update socialFeedStore**

Update store's `fetchFeed` action to pass only filter + cursor (no topic).

- [ ] **Step 3: Remove topic UI from SocialFeedScreen**

Remove the topic filter chips from CreatePostModal. The `selectedTopic` variable and any topic-related UI should be removed. Keep the filter tabs (Populer / Takip) and the StoryBar at top.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/services/socialFeedService.ts apps/mobile/src/stores/socialFeedStore.ts apps/mobile/src/screens/discovery/SocialFeedScreen.tsx
git commit -m "feat: connect feed to real posts API, remove topic UI"
```

---

### Task 6: Frontend — Profile Gonderilerim Section

**Files:**
- Modify: `apps/mobile/src/screens/profile/ProfileScreen.tsx`

- [ ] **Step 1: Update fetchMyPosts to use real API**

Replace the current `fetchMyPosts` implementation:

```typescript
const fetchMyPosts = useCallback(async () => {
  try {
    const response = await api.get('/posts/my');
    setMyPosts(response.data);
  } catch {
    // Silently fail — fallback to mock
    try {
      const feedResponse = await socialFeedService.getFeed('ONERILEN', null);
      const userId = user?.id;
      if (userId) {
        setMyPosts(feedResponse.posts.filter((p: FeedPost) => p.userId === userId).slice(0, 5));
      }
    } catch {
      // Silently fail
    }
  }
}, [user?.id]);
```

- [ ] **Step 2: Add import for api service**

Add at the top of ProfileScreen.tsx:

```typescript
import api from '../../services/api';
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/profile/ProfileScreen.tsx
git commit -m "feat: wire profile Gonderilerim to real posts API"
```

---

### Task 7: Remove Mock Data from socialFeedService

**Files:**
- Modify: `apps/mobile/src/services/socialFeedService.ts`

- [ ] **Step 1: Clean mock posts**

Update mock posts to remove `topic` field and the removed fields. Keep a small set (3-4 posts) for dev fallback only.

- [ ] **Step 2: Update mock post data to match new type**

Each mock post should only contain the fields in the lean `FeedPost`/`Post` type: id, userId, userName, userAge, userCity, userAvatarUrl, isVerified, verificationLevel, isFollowing, intentionTag, postType, content, photoUrls, videoUrl, likeCount, isLiked, createdAt.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/services/socialFeedService.ts
git commit -m "refactor: clean up mock data to match new Post type"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Backend build check**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Shared package build check**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Check for any remaining topic references**

Search for `FeedTopic`, `FEED_TOPICS`, `BURC`, `SORU_CEVAP`, `ASK_IPUCU` across the mobile app and remove any remaining references.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup — remove remaining topic references"
```
