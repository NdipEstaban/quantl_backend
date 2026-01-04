/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// user.service.ts - Extended version
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma.service";
import { AuditLog, AuditLogAction, AuthProviders, Prisma, User } from "@prisma/client";
import { CacheService } from "@/cache/cache.service";

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async user(userWhereUniqueInput: Prisma.UserWhereUniqueInput): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = `user:${email}`;

    return this.cacheService.wrap(
      cacheKey,
      () =>
        this.prisma.user.findUnique({
          where: { email },
          include: { accounts: true },
        }),
      5 * 60 * 1000, //5mins
    );
  }

  async findOne(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`;

    return this.cacheService.wrap(
      cacheKey,
      () =>
        this.prisma.user.findUnique({
          where: { id },
          include: { accounts: true },
        }),
      5 * 60 * 1000, //5mins
    );
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return await this.prisma.user.create({
      data,
    });
  }

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return await this.prisma.user.update({
      data,
      where,
    });
  }

  async updateHashedRefreshToken(userId: string, hashedRefreshToken: string | null): Promise<User> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  async findOrCreateOAuthUser(
    provider: AuthProviders,
    providerAccountId: string,
    email: string,
    firstName: string,
    lastName: string,
    imageUrl?: string,
  ): Promise<User> {
    // Try to find existing account
    let cacheKey = `user:oauth:${provider}:${providerAccountId}`;

    const existingAccount = await this.cacheService.wrap(
      cacheKey,
      () =>
        this.prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider,
              providerAccountId,
            },
          },
          include: { user: true },
        }),
      5 * 60 * 1000, //5mins
    );

    if (existingAccount) {
      // Update last login
      await this.prisma.user.update({
        where: { id: existingAccount.userId },
        data: { lastLoginAt: new Date() },
      });
      return existingAccount.user;
    }

    // Try to find user by email
    cacheKey = `user:${email}`;

    const existingUser = await this.cacheService.wrap(
      cacheKey,
      () => this.findByEmail(email),
      5 * 60 * 1000, //5mins
    );

    if (existingUser) {
      // Link new OAuth account to existing user
      await this.prisma.account.create({
        data: {
          userId: existingUser.id,
          type: "oauth",
          provider,
          providerAccountId,
        },
      });
      return existingUser;
    }

    // Create new user with OAuth account
    return this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        imageUrl,
        emailVerified: new Date(),
        lastLoginAt: new Date(),
        accounts: {
          create: {
            type: "oauth",
            provider,
            providerAccountId,
          },
        },
      },
    });
  }

  async createEmailUser(
    email: string,
    hashedPassword: string,
    firstName: string,
    lastName: string,
  ): Promise<User> {
    return await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        lastLoginAt: new Date(),
        accounts: {
          create: {
            type: "credentials",
            provider: AuthProviders.GOOGLE, // Using GOOGLE enum for credentials, consider adding CREDENTIALS
            providerAccountId: email,
          },
        },
      },
    });
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });
  }

  /**
   * Invalidate all refresh tokens for user
   */
  async invalidateAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(
    userId: string,
    action: AuditLogAction,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: metadata || {},
      },
    });
  }
}
