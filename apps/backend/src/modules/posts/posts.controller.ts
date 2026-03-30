// Posts controller — Feed post endpoints for LUMA
// Handles CRUD, like toggle, and liker list

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  CurrentUser,
  JwtPayload,
} from "../../common/decorators/current-user.decorator";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";

@Controller("posts")
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /** GET /posts — Get paginated feed posts (cursor-based) */
  @Get()
  async getFeedPosts(
    @CurrentUser("sub") userId: string,
    @Query("cursor") cursor?: string,
  ) {
    return this.postsService.getFeedPosts(userId, cursor);
  }

  /** GET /posts/my — Get current user's own posts */
  @Get("my")
  async getMyPosts(@CurrentUser("sub") userId: string) {
    return this.postsService.getMyPosts(userId);
  }

  /** POST /posts — Create a new post */
  @Post()
  async createPost(
    @CurrentUser("sub") userId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.createPost(userId, dto);
  }

  /** DELETE /posts/:postId — Soft-delete own post */
  @Delete(":postId")
  async deletePost(
    @CurrentUser("sub") userId: string,
    @Param("postId") postId: string,
  ) {
    await this.postsService.deletePost(userId, postId);
    return { success: true };
  }

  /** POST /posts/:postId/like — Toggle like on a post */
  @Post(":postId/like")
  async toggleLike(
    @CurrentUser("sub") userId: string,
    @Param("postId") postId: string,
  ) {
    return this.postsService.toggleLike(userId, postId);
  }

  /** GET /posts/:postId/likers — Get users who liked a post (premium only) */
  @Get(":postId/likers")
  async getLikers(
    @CurrentUser() user: JwtPayload,
    @Param("postId") postId: string,
  ) {
    if (user.packageTier === "free") {
      throw new ForbiddenException("Bu ozellik premium uyelere ozeldir");
    }
    return this.postsService.getLikers(postId);
  }
}
