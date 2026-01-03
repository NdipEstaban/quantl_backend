// auth.service.ts - FIXED VERSION
import {
  Inject,
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
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

  async validateEmailUser(email: string, password: string): Promise<{ id: string; email: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.password) {
      throw new UnauthorizedException("Please use OAuth login for this account");
    }

    const isPasswordMatch = await compare(password, user.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Update last login
    await this.userService.updateUser({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { id: user.id, email: user.email };
  }

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
    await this.cacheService.set(`verificationCode:${registerDto.email}`, verificationCode);
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
    const verificationCode = await this.cacheService.get(`verificationCode:${verifyEmailDto.email}`);
    const user = await this.userService.findByEmail(verifyEmailDto.email);
    if (verificationCode && user) {
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
    } else {
      throw NotFoundException;
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
        user: fullUser,
        ...tokens,
      };
    } else {
      throw NotFoundException;
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

  private async generateAndStoreTokens(userId: string, userEmail: string) {
    const { accessToken, refreshToken } = await this.generateTokens(userId, userEmail);
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.userService.updateHashedRefreshToken(userId, hashedRefreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async generateTokens(userId: string, userEmail: string) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
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

  async refreshToken(userId: string, currentRefreshToken: string) {
    // Validate current refresh token
    await this.validateRefreshToken(userId, currentRefreshToken);

    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Generate new tokens
    const tokens = await this.generateAndStoreTokens(userId, user.email);

    return {
      user: this.mapToCurrentUser(user),
      ...tokens,
    };
  }

  async validateRefreshToken(userId: string, refreshToken: string): Promise<{ id: string }> {
    const user = await this.userService.findOne(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const refreshTokenMatches = await argon2.verify(user.hashedRefreshToken, refreshToken);
    if (!refreshTokenMatches) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return { id: userId };
  }

  async logOut(userId: string, ipAddress?: string, userAgent?: string) {
    await this.userService.updateHashedRefreshToken(userId, null);

    // Create audit log
    await this.userService.createAuditLog(userId, AuditLogAction.LOGOUT, ipAddress, userAgent);
  }

  async validateJwtUser(userId: string): Promise<CurrentUser> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return this.mapToCurrentUser(user);
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
