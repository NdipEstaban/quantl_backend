// auth.service.ts - FIXED VERSION
import {
  Inject,
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  HttpStatus,
  HttpException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcrypt";
import { ConfigType } from "@nestjs/config";
import * as argon2 from "argon2";
import refreshJwtConfig from "./config/refresh-jwt.config";
import { RegisterUserDto } from "./dto/register-user.dto";
import { UserService } from "@/user/user.service";
import { LoginUserDto } from "./dto/login-user.dto";
import { AuditLogAction, AuthProviders, User } from "@prisma/client";
import { randomInt } from "crypto";
import { EmailService } from "@/email/email.service";
import { CacheService } from "@/cache/cache.service";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import ErrorCodes from "@/common/error-codes";
import CacheKeys from "@/cache/cache-keys.constants";
import SENSITIVE_USER_INFORMATION from "@/common/sensitive-user-data";

export interface AuthJwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class AuthService {
  constructor(
    private emailService: EmailService,
    private userService: UserService,
    private jwtService: JwtService,
    @Inject(refreshJwtConfig.KEY)
    private refreshTokenConfig: ConfigType<typeof refreshJwtConfig>,
    private readonly cacheService: CacheService,
  ) {}

  async register(registerDto: RegisterUserDto, ipAddress?: string, userAgent?: string) {
    const existingUser = await this.userService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const hashedPassword = await hash(registerDto.password, 10);
    const user = await this.userService.createEmailUser(
      registerDto.email,
      hashedPassword,
      registerDto.firstName,
      registerDto.lastName,
    );

    //send verification email
    const verificationCode = randomInt(1000, 10000).toString();
    const ttl30mins = 30 * 60 * 1000;
    await this.cacheService.set(CacheKeys.verificationCode(user.id), verificationCode, ttl30mins);
    await this.cacheService.set(CacheKeys.verificationAttempts(user.id), 1, ttl30mins);
    await this.emailService.sendVerificationEmail(registerDto.email, verificationCode, registerDto.firstName);

    // Create audit log
    await this.userService.createAuditLog(user.id, AuditLogAction.REGISTER, ipAddress, userAgent, {
      method: "email",
    });

    return {
      user: this.mapToCurrentUser(user),
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto, ipAddress?: string, userAgent?: string) {
    const user = await this.userService.findByEmail(verifyEmailDto.email);
    if (user == null) {
      return;
    }
    const verificationCode = await this.cacheService.get(CacheKeys.verificationCode(user.id));

    if (
      verificationCode &&
      verificationCode === verifyEmailDto.verificationCode &&
      user &&
      user.emailVerified == null
    ) {
      await this.userService.updateUser({
        where: {
          email: verifyEmailDto.email,
        },
        data: {
          emailVerified: new Date().toISOString(),
        },
      });

      //generate jwt auth tokens
      const tokens = await this.generateAndStoreTokens(user.id, user.email);

      // Create audit log
      await this.userService.createAuditLog(user.id, AuditLogAction.EMAIL_VERIFY, ipAddress, userAgent, {
        method: "email",
      });

      return {
        tokens,
      };
    } else if (user && user.emailVerified == null) {
      let verificationAttempt = (await this.cacheService.get(
        CacheKeys.verificationAttempts(user.id),
      )) as number;
      if (!verificationAttempt || verificationAttempt <= 5) {
        const verificationCode = randomInt(1000, 10000).toString();
        verificationAttempt = verificationAttempt || 0;

        const ttl30mins = 30 * 60 * 1000;
        await this.cacheService.set(CacheKeys.verificationCode(user.id), verificationCode, ttl30mins);
        await this.cacheService.set(
          CacheKeys.verificationAttempts(user.id),
          verificationAttempt + 1,
          ttl30mins,
        );
        await this.emailService.sendVerificationEmail(user.email, verificationCode, user.firstName);
      } else {
        throw new HttpException(
          ErrorCodes.TOO_MANY_VERIFICATION_ATTEMPTS.toString(),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } else {
      throw new HttpException(ErrorCodes.TOO_MANY_VERIFICATION_ATTEMPTS.toString(), HttpStatus.NOT_FOUND);
    }
  }

  async login(loginDto: LoginUserDto, ipAddress?: string, userAgent?: string) {
    const user = await this.userService.findByEmail(loginDto.email);

    if (user) {
      // Create audit log using user ID
      await this.userService.createAuditLog(user.id, AuditLogAction.LOGIN, ipAddress, userAgent, {
        method: "email",
      });

      const tokens = await this.generateAndStoreTokens(user.id, user.email);

      // Get full user details
      const fullUser = await this.userService.findOne(user.id);
      return {
        user: { ...fullUser, ...SENSITIVE_USER_INFORMATION },
        ...tokens,
      };
    } else {
      throw new NotFoundException(ErrorCodes.NOT_FOUND);
    }
  }

  async handleOAuthLogin(
    provider: AuthProviders,
    providerAccountId: string,
    email: string,
    firstName: string,
    lastName: string,
    imageUrl?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.userService.findOrCreateOAuthUser(
      provider,
      providerAccountId,
      email,
      firstName,
      lastName,
      imageUrl,
    );

    const tokens = await this.generateAndStoreTokens(user.id, user.email);

    // Create audit log
    await this.userService.createAuditLog(user.id, AuditLogAction.LOGIN, ipAddress, userAgent, {
      method: provider.toLowerCase(),
      provider,
    });

    return {
      user: this.mapToCurrentUser(user),
      ...tokens,
    };
  }

  async refreshToken(userId: string, currentRefreshToken: string) {
    // Validate current refresh token
    await this.validateRefreshToken(userId, currentRefreshToken);

    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException(ErrorCodes.USER_NOT_FOUND);
    }

    // Generate new tokens
    const tokens = await this.generateAndStoreTokens(userId, user.email);

    return {
      user: this.mapToCurrentUser(user),
      ...tokens,
    };
  }

  private async validateRefreshToken(userId: string, refreshToken: string): Promise<{ id: string }> {
    const user = await this.userService.findOne(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException(ErrorCodes.UNAUTHORIZED);
    }

    const refreshTokenMatches = await argon2.verify(user.hashedRefreshToken, refreshToken);
    if (!refreshTokenMatches) {
      throw new UnauthorizedException(ErrorCodes.UNAUTHORIZED);
    }

    return { id: userId };
  }

  async logOut(userId: string, ipAddress?: string, userAgent?: string) {
    await this.userService.updateHashedRefreshToken(userId, null);

    // Create audit log
    await this.userService.createAuditLog(userId, AuditLogAction.LOGOUT, ipAddress, userAgent);
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string, ipAddress?: string, userAgent?: string) {
    // Check if user exists
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    }

    // Check rate limiting
    const currentAttempts = (await this.cacheService.get<number>(CacheKeys.passwordAttempts(user.id))) || 0;
    const maxAttempts = 5;

    if (currentAttempts >= maxAttempts) {
      throw new HttpException(ErrorCodes.TOO_MANY_PASSWORD_ATTEMPTS.toString(), HttpStatus.TOO_MANY_REQUESTS);
    }

    // Generate reset code
    const resetCode = randomInt(1000, 10000).toString();
    const ttl = 15 * 60 * 1000; // 15 minutes

    // Store in cache
    await this.cacheService.set(
      CacheKeys.passwordResetCode(user.id),
      {
        code: resetCode,
        attempts: 0,
        createdAt: new Date().toISOString(),
      },
      ttl,
    );

    // Increment attempt counter
    await this.cacheService.set(CacheKeys.passwordAttempts(user.id), currentAttempts + 1, 3600); // 1 hour TTL

    // Send email
    await this.emailService.sendPasswordResetEmail(email, resetCode, user.firstName);

    // Create audit log
    await this.userService.createAuditLog(
      user.id,
      AuditLogAction.PASSWORD_RESET_REQUEST,
      ipAddress,
      userAgent,
      {
        method: "email",
      },
    );
  }

  /**
   * Verify reset code
   */
  async verifyResetCode(email: string, code: string): Promise<{ isValid: boolean }> {
    const user = await this.userService.findByEmail(email);
    if (user == null) {
      throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    }
    const resetData = await this.cacheService.get<{
      code: string;
      attempts: number;
      createdAt: string;
    }>(CacheKeys.passwordResetCode(user.id));

    if (!resetData) {
      throw new BadRequestException(ErrorCodes.BAD_REQUEST);
    }

    // Check attempts
    const maxAttempts = 3;
    if (resetData.attempts >= maxAttempts) {
      await this.cacheService.del(CacheKeys.passwordResetCode(user.id));
      throw new BadRequestException(ErrorCodes.TOO_MANY_REQUESTS);
    }

    // Verify code
    if (resetData.code !== code) {
      // Increment failed attempts
      await this.cacheService.set(CacheKeys.passwordResetCode(user.id), {
        ...resetData,
        attempts: resetData.attempts + 1,
      });

      throw new BadRequestException(ErrorCodes.INVALID_RESET_CODE);
    }

    // Code is valid, mark as verified
    await this.cacheService.set(CacheKeys.verifiedResetCode(user.id, code), true, 5 * 60 * 1000); // 5 minutes for reset

    return { isValid: true };
  }

  /**
   * Reset password
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    // Verify the code first
    await this.verifyResetCode(email, code);

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException("Invalid reset request.");
    }

    // Check if code was verified
    const resetKey = CacheKeys.passwordResetCode(user.id);
    const verifiedKey = CacheKeys.verifiedResetCode(user.id, code);
    const isVerified = await this.cacheService.get<boolean>(verifiedKey);

    if (!isVerified) {
      throw new BadRequestException("Reset code not verified.");
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 10);

    // Update user password
    await this.userService.updateUser({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    // Clear all sessions (invalidate existing refresh tokens)
    await this.userService.updateHashedRefreshToken(user.id, null);

    // Clear cache
    await this.cacheService.del(resetKey);
    await this.cacheService.del(verifiedKey);

    // Clear rate limit counter
    await this.cacheService.del(CacheKeys.passwordAttempts(user.id));

    // Create audit log
    await this.userService.createAuditLog(user.id, AuditLogAction.PASSWORD_RESET, ipAddress, userAgent, {
      method: "email",
    });

    // Send confirmation email
    await this.emailService.sendPasswordChangedEmail(email, user.firstName);

    return { message: "Password has been reset successfully." };
  }

  async validateEmailUser(email: string, password: string): Promise<{ id: string; email: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException(ErrorCodes.UNAUTHORIZED);
    }

    if (!user.password) {
      throw new UnauthorizedException(ErrorCodes.UNAUTHORIZED);
    }

    const isPasswordMatch = await compare(password, user.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException(ErrorCodes.UNAUTHORIZED);
    }

    // Update last login
    await this.userService.updateUser({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { id: user.id, email: user.email };
  }

  private async validateJwtUser(userId: string): Promise<CurrentUser> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException(ErrorCodes.UNAUTHORIZED);
    }

    return this.mapToCurrentUser(user);
  }

  //----------------------------------------------------
  //---------------Private methods----------------------
  //----------------------------------------------------
  private async generateTokens(userId: string, userEmail: string) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException(ErrorCodes.NOT_FOUND);
    }

    const payload: AuthJwtPayload = {
      sub: userId,
      email: userEmail,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, this.refreshTokenConfig),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateAndStoreTokens(userId: string, userEmail: string) {
    const { accessToken, refreshToken } = await this.generateTokens(userId, userEmail);
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.userService.updateHashedRefreshToken(userId, hashedRefreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generate reset code (helper method)
   */
  private generateResetCode(): string {
    return randomInt(100000, 999999).toString();
  }

  private mapToCurrentUser(user: User): CurrentUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
