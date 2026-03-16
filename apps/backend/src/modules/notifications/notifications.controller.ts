import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { RegisterDeviceDto, MarkReadDto, UpdatePreferencesDto } from "./dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: "Get all notifications for current user (paginated)",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  async getNotifications(
    @CurrentUser("sub") userId: string,
    @Query("page") page?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    return this.notificationsService.getNotifications(userId, pageNum);
  }

  @Get("badge-count")
  @ApiOperation({ summary: "Get unread notification badge count" })
  async getBadgeCount(@CurrentUser("sub") userId: string) {
    const count = await this.notificationsService.getBadgeCount(userId);
    return { unreadCount: count };
  }

  @Patch("read")
  @ApiOperation({ summary: "Mark specific notifications as read" })
  async markRead(@CurrentUser("sub") userId: string, @Body() dto: MarkReadDto) {
    return this.notificationsService.markRead(userId, dto);
  }

  @Post("mark-all-read")
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllRead(@CurrentUser("sub") userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Post("devices")
  @ApiOperation({ summary: "Register device for push notifications" })
  async registerDevice(
    @CurrentUser("sub") userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.notificationsService.registerDevice(userId, dto);
  }

  @Delete("devices")
  @ApiOperation({ summary: "Unregister device on logout" })
  async unregisterDevice(
    @CurrentUser("sub") userId: string,
    @Body("pushToken") pushToken: string,
  ) {
    return this.notificationsService.unregisterDevice(userId, pushToken);
  }

  @Get("preferences")
  @ApiOperation({ summary: "Get notification preferences" })
  async getPreferences(@CurrentUser("sub") userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Patch("preferences")
  @ApiOperation({ summary: "Update notification preferences" })
  async updatePreferences(
    @CurrentUser("sub") userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(userId, dto);
  }
}
