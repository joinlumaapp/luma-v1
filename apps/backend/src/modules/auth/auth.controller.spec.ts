import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  VerifySmsDto,
  VerifySelfieDto,
  LoginDto,
  RefreshTokenDto,
} from './dto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    verifySms: jest.fn(),
    verifySelfie: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    deleteAccount: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /auth/register
  // ═══════════════════════════════════════════════════════════════

  describe('register()', () => {
    const registerDto: RegisterDto = {
      phone: '+905551234567',
      countryCode: 'TR',
    };

    it('should register a new user successfully', async () => {
      const expected = { message: 'Doğrulama kodu gönderildi', isNewUser: true };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expected);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('should send OTP to existing user without creating new account', async () => {
      const expected = { message: 'Doğrulama kodu gönderildi', isNewUser: false };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expected);
      expect(result.isNewUser).toBe(false);
    });

    it('should throw BadRequestException for deleted account', async () => {
      mockAuthService.register.mockRejectedValue(
        new BadRequestException('Bu hesap silinmiştir'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.register(registerDto)).rejects.toThrow(
        'Bu hesap silinmiştir',
      );
    });

    it('should delegate to authService.register with correct DTO', async () => {
      mockAuthService.register.mockResolvedValue({ message: 'OK' });

      await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith({
        phone: '+905551234567',
        countryCode: 'TR',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /auth/verify-sms
  // ═══════════════════════════════════════════════════════════════

  describe('verifySms()', () => {
    const verifySmsDto: VerifySmsDto = {
      phone: '+905551234567',
      code: '123456',
    };

    it('should verify SMS successfully and return tokens', async () => {
      const expected = {
        verified: true,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 'user-uuid-1',
          phone: '+905551234567',
          isVerified: true,
          isNew: false,
          packageTier: 'FREE',
        },
      };
      mockAuthService.verifySms.mockResolvedValue(expected);

      const result = await controller.verifySms(verifySmsDto);

      expect(result.verified).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe('user-uuid-1');
    });

    it('should throw BadRequestException for wrong OTP code', async () => {
      mockAuthService.verifySms.mockRejectedValue(
        new BadRequestException('Geçersiz doğrulama kodu'),
      );

      await expect(controller.verifySms(verifySmsDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired OTP', async () => {
      mockAuthService.verifySms.mockRejectedValue(
        new BadRequestException('Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.'),
      );

      await expect(controller.verifySms(verifySmsDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when user does not exist', async () => {
      mockAuthService.verifySms.mockRejectedValue(
        new BadRequestException('Kullanıcı bulunamadı'),
      );

      await expect(controller.verifySms(verifySmsDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delegate to authService.verifySms with correct DTO', async () => {
      mockAuthService.verifySms.mockResolvedValue({ verified: true });

      await controller.verifySms(verifySmsDto);

      expect(mockAuthService.verifySms).toHaveBeenCalledWith(verifySmsDto);
      expect(mockAuthService.verifySms).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /auth/verify-selfie
  // ═══════════════════════════════════════════════════════════════

  describe('verifySelfie()', () => {
    const selfieDto: VerifySelfieDto = { selfieImage: 'base64-encoded-selfie' };
    const userId = 'user-uuid-1';

    it('should verify selfie successfully', async () => {
      const expected = { verified: true, status: 'Kimlik doğrulandı' };
      mockAuthService.verifySelfie.mockResolvedValue(expected);

      const result = await controller.verifySelfie(userId, selfieDto);

      expect(result.verified).toBe(true);
      expect(result.status).toBeDefined();
    });

    it('should return already-verified for previously verified user', async () => {
      const expected = { verified: true, status: 'Zaten doğrulanmış' };
      mockAuthService.verifySelfie.mockResolvedValue(expected);

      const result = await controller.verifySelfie(userId, selfieDto);

      expect(result.verified).toBe(true);
      expect(result.status).toContain('doğrulanmış');
    });

    it('should return failed verification result', async () => {
      const expected = { verified: false, status: 'Doğrulama başarısız, tekrar deneyin' };
      mockAuthService.verifySelfie.mockResolvedValue(expected);

      const result = await controller.verifySelfie(userId, selfieDto);

      expect(result.verified).toBe(false);
    });

    it('should delegate to authService.verifySelfie with userId and DTO', async () => {
      mockAuthService.verifySelfie.mockResolvedValue({ verified: true, status: 'OK' });

      await controller.verifySelfie(userId, selfieDto);

      expect(mockAuthService.verifySelfie).toHaveBeenCalledWith(userId, selfieDto);
    });

    it('should throw BadRequestException when user does not exist', async () => {
      mockAuthService.verifySelfie.mockRejectedValue(
        new BadRequestException('Kullanıcı bulunamadı'),
      );

      await expect(controller.verifySelfie(userId, selfieDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /auth/login
  // ═══════════════════════════════════════════════════════════════

  describe('login()', () => {
    const loginDto: LoginDto = {
      phone: '+905551234567',
      code: '123456',
    };

    it('should login existing user successfully and return tokens', async () => {
      const expected = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: { id: 'user-uuid-1', isNewUser: false },
      };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(loginDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.isNewUser).toBe(false);
    });

    it('should indicate isNewUser=true when user has no profile', async () => {
      const expected = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: { id: 'user-uuid-1', isNewUser: true },
      };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(loginDto);

      expect(result.user.isNewUser).toBe(true);
    });

    it('should throw BadRequestException when user not found', async () => {
      mockAuthService.login.mockRejectedValue(
        new BadRequestException('Bu telefon numarasına kayıtlı kullanıcı bulunamadı'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException for inactive or deleted account', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Hesap devre dışı veya silinmiş'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delegate to authService.login with correct DTO', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'tok',
        refreshToken: 'ref',
        user: { id: 'id', isNewUser: false },
      });

      await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /auth/logout
  // ═══════════════════════════════════════════════════════════════

  describe('logout()', () => {
    const userId = 'user-uuid-1';

    it('should logout successfully', async () => {
      const expected = { message: 'Başarıyla çıkış yapıldı' };
      mockAuthService.logout.mockResolvedValue(expected);

      const result = await controller.logout(userId);

      expect(result.message).toBe('Başarıyla çıkış yapıldı');
    });

    it('should delegate to authService.logout with userId', async () => {
      mockAuthService.logout.mockResolvedValue({ message: 'OK' });

      await controller.logout(userId);

      expect(mockAuthService.logout).toHaveBeenCalledWith(userId);
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /auth/refresh-token
  // ═══════════════════════════════════════════════════════════════

  describe('refreshToken()', () => {
    const refreshDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should refresh tokens successfully', async () => {
      const expected = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockAuthService.refreshToken.mockResolvedValue(expected);

      const result = await controller.refreshToken(refreshDto);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Geçersiz veya süresi dolmuş refresh token'),
      );

      await expect(controller.refreshToken(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for revoked refresh token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Refresh token geçersiz veya iptal edilmiş'),
      );

      await expect(controller.refreshToken(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delegate to authService.refreshToken with correct DTO', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });

      await controller.refreshToken(refreshDto);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshDto);
      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE /auth/delete-account
  // ═══════════════════════════════════════════════════════════════

  describe('deleteAccount()', () => {
    const userId = 'user-uuid-1';

    it('should delete account successfully', async () => {
      const expected = {
        message: 'Hesabınız silme işlemine alındı. 30 gün içinde tüm verileriniz kalıcı olarak silinecektir.',
      };
      mockAuthService.deleteAccount.mockResolvedValue(expected);

      const result = await controller.deleteAccount(userId);

      expect(result.message).toBeDefined();
      expect(result.message).toContain('silme');
    });

    it('should throw BadRequestException when user does not exist', async () => {
      mockAuthService.deleteAccount.mockRejectedValue(
        new BadRequestException('Kullanıcı bulunamadı'),
      );

      await expect(controller.deleteAccount(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delegate to authService.deleteAccount with userId', async () => {
      mockAuthService.deleteAccount.mockResolvedValue({ message: 'OK' });

      await controller.deleteAccount(userId);

      expect(mockAuthService.deleteAccount).toHaveBeenCalledWith(userId);
      expect(mockAuthService.deleteAccount).toHaveBeenCalledTimes(1);
    });
  });
});
