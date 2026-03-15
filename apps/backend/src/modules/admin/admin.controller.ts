import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService, DashboardStats, PaginatedResult } from './admin.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UserFilterDto,
  ModerateUserDto,
  ReviewReportDto,
  AnnouncementDto,
  ReportFilterDto,
  PaymentFilterDto,
  AnalyticsFilterDto,
} from './dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ──────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard overview stats' })
  async getDashboard(): Promise<DashboardStats> {
    return this.adminService.getDashboardStats();
  }

  // ─── Users ──────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List users with filters and pagination' })
  async getUsers(@Query() filters: UserFilterDto): Promise<PaginatedResult<unknown>> {
    return this.adminService.getUsers(filters);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get full user detail' })
  async getUserDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Moderate a user (ban/warn/verify/unban)' })
  async moderateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateUserDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.adminService.moderateUser(id, dto, adminId);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Soft delete a user' })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.adminService.softDeleteUser(id, adminId);
  }

  // ─── Reports ────────────────────────────────────────────────

  @Get('reports')
  @ApiOperation({ summary: 'List reports with filters and pagination' })
  async getReports(@Query() filters: ReportFilterDto): Promise<PaginatedResult<unknown>> {
    return this.adminService.getReports(filters);
  }

  @Patch('reports/:id')
  @ApiOperation({ summary: 'Review a report (approve/reject with action)' })
  async reviewReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewReportDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.adminService.reviewReport(id, dto, adminId);
  }

  // ─── Analytics ──────────────────────────────────────────────

  @Get('analytics')
  @ApiOperation({ summary: 'Get extended analytics (DAU/MAU, retention, revenue)' })
  async getAnalytics(@Query() filters: AnalyticsFilterDto) {
    return this.adminService.getAnalytics(filters);
  }

  // ─── Payments ───────────────────────────────────────────────

  @Get('payments')
  @ApiOperation({ summary: 'List payment/transaction history' })
  async getPayments(@Query() filters: PaymentFilterDto): Promise<PaginatedResult<unknown>> {
    return this.adminService.getPayments(filters);
  }

  // ─── Announcements ─────────────────────────────────────────

  @Post('announcements')
  @ApiOperation({ summary: 'Send system announcement to users' })
  async sendAnnouncement(
    @Body() dto: AnnouncementDto,
    @CurrentUser('sub') adminId: string,
  ) {
    return this.adminService.sendAnnouncement(dto, adminId);
  }
}
