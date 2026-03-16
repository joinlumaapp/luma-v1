import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { SetMetadata } from "@nestjs/common";
import { IS_PUBLIC_KEY } from "../guards/jwt-auth.guard";

/**
 * Extracts the current authenticated user from the request object.
 * Usage: @CurrentUser() user: JwtPayload
 * Usage: @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

/**
 * Marks a route as public (no JWT required).
 * Usage: @Public()
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * JWT payload interface — represents the decoded access token.
 */
export interface JwtPayload {
  sub: string; // User ID
  phone: string; // Phone number
  isVerified: boolean; // Whether identity is verified
  packageTier: string; // 'free' | 'gold' | 'pro' | 'reserved'
  iat?: number; // Issued at
  exp?: number; // Expiration
}
