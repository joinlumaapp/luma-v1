import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Delete,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  VerifySmsDto,
  VerifySelfieDto,
  LoginDto,
  RefreshTokenDto,
} from './dto';
import {
  CurrentUser,
  Public,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Register new user or request OTP for existing user',
    description: 'Creates a new user account (if phone is new) and sends a 6-digit SMS verification code. For existing users, sends a fresh OTP for login.',
  })
  @ApiResponse({ status: 201, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone or deleted account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-sms')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify phone number with SMS code',
    description: 'Verifies the 6-digit OTP code. On success, marks phone as verified and returns JWT access + refresh tokens.',
  })
  @ApiResponse({ status: 200, description: 'Phone verified, tokens issued' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifySms(@Body() dto: VerifySmsDto) {
    return this.authService.verifySms(dto);
  }

  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @Post('verify-selfie')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify identity with selfie photo',
    description: 'Compares selfie against profile photos for identity verification. Awards verified badge on success.',
  })
  @ApiResponse({ status: 200, description: 'Verification result returned' })
  @ApiResponse({ status: 400, description: 'Selfie too large or user not found' })
  async verifySelfie(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifySelfieDto,
  ) {
    return this.authService.verifySelfie(userId, dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with phone + SMS code',
    description: 'Verifies OTP for an existing user and returns JWT access + refresh tokens. Call /register first to receive the OTP.',
  })
  @ApiResponse({ status: 200, description: 'Login successful, tokens issued' })
  @ApiResponse({ status: 400, description: 'Invalid code or user not found' })
  @ApiResponse({ status: 401, description: 'Account disabled or deleted' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout and invalidate all sessions',
    description: 'Revokes all active sessions for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser('sub') userId: string, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    return this.authService.logout(userId, token);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh attempts per minute
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchanges a valid refresh token for a new access + refresh token pair. Old refresh token is revoked (rotation).',
  })
  @ApiResponse({ status: 200, description: 'New token pair issued' })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Delete('delete-account')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft-delete user account (GDPR compliant)',
    description: 'Anonymizes personal data, cancels subscriptions, removes from discovery pool. Data permanently deleted after 30 days.',
  })
  @ApiResponse({ status: 200, description: 'Account deletion scheduled' })
  async deleteAccount(@CurrentUser('sub') userId: string) {
    return this.authService.deleteAccount(userId);
  }

  @Get('export-data')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Export user data (GDPR data portability)',
    description: 'Returns all personal data associated with the account in JSON format per GDPR Article 20.',
  })
  @ApiResponse({ status: 200, description: 'User data exported' })
  async exportData(@CurrentUser('sub') userId: string) {
    return this.authService.exportUserData(userId);
  }
}
