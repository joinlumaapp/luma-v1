import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { calculateAge } from "../utils/date.utils";

/**
 * Guard that verifies the authenticated user is at least 18 years old.
 * Requires JwtAuthGuard to run first so that request.user is populated.
 *
 * Usage: @UseGuards(AgeVerificationGuard) on discovery, chat, match endpoints.
 *
 * Returns 403 if:
 *  - The user has no profile or birthDate set
 *  - The user is under 18 years old
 */
@Injectable()
export class AgeVerificationGuard implements CanActivate {
  private readonly logger = new Logger(AgeVerificationGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.sub) {
      throw new ForbiddenException(
        "Kimlik dogrulamasi gereklidir. Erisim reddedildi.",
      );
    }

    const userId: string = user.sub;

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { birthDate: true },
    });

    if (!profile || !profile.birthDate) {
      this.logger.warn(
        `Age verification failed for user ${userId}: no birthDate set`,
      );
      throw new ForbiddenException(
        "Dogum tarihi bilgisi eksik. Lutfen profilinizi tamamlayin.",
      );
    }

    const age = calculateAge(profile.birthDate);

    if (age < 18) {
      this.logger.warn(
        `Underage access attempt blocked for user ${userId} (age: ${age})`,
      );
      throw new ForbiddenException(
        "Bu ozelligi kullanmak icin 18 yasindan buyuk olmalisiniz.",
      );
    }

    return true;
  }

}
