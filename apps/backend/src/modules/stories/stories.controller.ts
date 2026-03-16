// Stories controller — Instagram-quality story endpoints for LUMA
// Handles story CRUD, view tracking, replies, and likes

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { StoriesService } from "./stories.service";
import { CreateStoryDto, ReplyToStoryDto } from "./dto/create-story.dto";

/** Minimal file interface compatible with multer uploads */
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface AuthenticatedRequest {
  user: { userId: string };
}

@Controller("stories")
@UseGuards(JwtAuthGuard)
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  /** GET /stories — Fetch all active stories from matched/followed users */
  @Get()
  async getStories(@Req() req: AuthenticatedRequest) {
    return this.storiesService.getStories(req.user.userId);
  }

  /** POST /stories — Create a new story (multipart upload) */
  @Post()
  @UseInterceptors(FileInterceptor("media"))
  async createStory(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: UploadedFile,
    @Body() dto: CreateStoryDto,
  ) {
    return this.storiesService.createStory(req.user.userId, file, dto);
  }

  /** DELETE /stories/:id — Delete own story */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStory(
    @Req() req: AuthenticatedRequest,
    @Param("id") storyId: string,
  ) {
    await this.storiesService.deleteStory(req.user.userId, storyId);
  }

  /** POST /stories/:id/view — Mark a story as viewed */
  @Post(":id/view")
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsViewed(
    @Req() req: AuthenticatedRequest,
    @Param("id") storyId: string,
  ) {
    await this.storiesService.markAsViewed(req.user.userId, storyId);
  }

  /** GET /stories/:id/viewers — Get list of viewers for own story */
  @Get(":id/viewers")
  async getViewers(
    @Req() req: AuthenticatedRequest,
    @Param("id") storyId: string,
  ) {
    return this.storiesService.getViewers(req.user.userId, storyId);
  }

  /** POST /stories/:id/reply — Send a reply to a story (creates chat message) */
  @Post(":id/reply")
  async replyToStory(
    @Req() req: AuthenticatedRequest,
    @Param("id") storyId: string,
    @Body() dto: ReplyToStoryDto,
  ) {
    return this.storiesService.replyToStory(
      req.user.userId,
      storyId,
      dto.message,
    );
  }

  /** POST /stories/:id/like — Toggle like on a story */
  @Post(":id/like")
  async toggleLike(
    @Req() req: AuthenticatedRequest,
    @Param("id") storyId: string,
  ) {
    return this.storiesService.toggleLike(req.user.userId, storyId);
  }
}
