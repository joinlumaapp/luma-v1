import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Role values accepted by the AdminGuard.
 * 'admin' has full access; 'moderator' has access to moderation endpoints.
 */
type AdminRole = "admin" | "moderator";

/**
 * Guard that restricts access to admin/moderator users only.
 *
 * Admin identification strategy:
 * - Reads ADMIN_USER_IDS from environment (comma-separated UUIDs)
 * - Reads MODERATOR_USER_IDS from environment (comma-separated UUIDs)
 * - Checks the authenticated user's ID against these lists
 *
 * Usage: @UseGuards(AdminGuard) on controller or individual routes.
 * Requires JwtAuthGuard to run first (user must be authenticated).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);
  private adminIds: Set<string>;
  private moderatorIds: Set<string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const adminRaw = this.configService.get<string>("ADMIN_USER_IDS", "");
    const modRaw = this.configService.get<string>("MODERATOR_USER_IDS", "");

    this.adminIds = new Set(
      adminRaw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    );
    this.moderatorIds = new Set(
      modRaw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    );

    this.logger.log(
      `AdminGuard initialized: ${this.adminIds.size} admins, ${this.moderatorIds.size} moderators`,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.sub) {
      throw new ForbiddenException(
        "Yetkilendirme basarisiz. Erisim reddedildi.",
      );
    }

    const userId: string = user.sub;
    const role = this.resolveRole(userId);

    if (!role) {
      this.logger.warn(`Unauthorized admin access attempt by user ${userId}`);
      throw new ForbiddenException("Bu alana erisim yetkiniz bulunmamaktadir.");
    }

    // Verify user is still active in the database
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new ForbiddenException("Hesabiniz aktif degil. Erisim reddedildi.");
    }

    // Attach admin role to request for downstream use
    request.adminRole = role;

    return true;
  }

  /**
   * Resolve the admin role for a given user ID.
   * Returns null if the user is not an admin or moderator.
   */
  private resolveRole(userId: string): AdminRole | null {
    if (this.adminIds.has(userId)) {
      return "admin";
    }
    if (this.moderatorIds.has(userId)) {
      return "moderator";
    }
    return null;
  }
}
