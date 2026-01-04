// auth.controller.ts - FIXED WITH TYPE SAFETY
import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
  Ip,
  Headers,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { RefreshAuthGuard } from "./guards/refresh-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "./decorators/public.decorator";
import { RegisterUserDto } from "./dto/register-user.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { FacebookAuthGuard } from "./guards/facebook-auth.guard";
import { AuthProviders } from "@prisma/client";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { InvalidateCache } from "@/cache/cache.decorator";

// Define custom request interface
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
    providerAccountId?: string;
    [key: string]: any;
  };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  async register(
    @Body() registerDto: RegisterUserDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.authService.register(registerDto, ipAddress, userAgent);
  }

  @Public()
  @Post("verify-email")
  @InvalidateCache(["users", "user:*"]) // Invalidates all user-related cache
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.authService.verifyEmail(verifyEmailDto, ipAddress, userAgent);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post("login")
  async login(
    @Req() req: AuthenticatedRequest, // Use custom type
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.authService.login(
      { email: req.user.email!, password: "" }, // Password validated by guard
      ipAddress,
      userAgent,
    );
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @Post("refresh")
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: AuthenticatedRequest) {
    return this.authService.refreshToken(req.user.id, refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async signOut(
    @Req() req: AuthenticatedRequest,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    await this.authService.logOut(req.user.id, ipAddress, userAgent);
    return { message: "Logged out successfully" };
  }

  // Google OAuth
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get("google")
  googleLogin() {
    return { message: "Redirecting to Google..." };
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get("google/callback")
  async googleCallback(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    const result = await this.authService.handleOAuthLogin(
      AuthProviders.GOOGLE,
      req.user.providerAccountId || req.user.id,
      req.user.email || "",
      req.user.firstName || "",
      req.user.lastName || "",
      req.user.imageUrl,
      ipAddress,
      userAgent,
    );

    res.redirect(
      `http://localhost:3000/auth/callback?` +
        `access_token=${result.accessToken}` +
        `&refresh_token=${result.refreshToken}` +
        `&user=${encodeURIComponent(JSON.stringify(result.user))}`,
    );
  }

  // Facebook OAuth
  @Public()
  @UseGuards(FacebookAuthGuard)
  @Get("facebook")
  facebookLogin() {
    return { message: "Redirecting to Facebook..." };
  }

  @Public()
  @UseGuards(FacebookAuthGuard)
  @Get("facebook/callback")
  async facebookCallback(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
  ) {
    const result = await this.authService.handleOAuthLogin(
      AuthProviders.FACEBOOK,
      req.user.providerAccountId || req.user.id,
      req.user.email || "",
      req.user.firstName || "",
      req.user.lastName || "",
      req.user.imageUrl,
      ipAddress,
      userAgent,
    );

    res.redirect(
      `http://localhost:3000/auth/callback?` +
        `access_token=${result.accessToken}` +
        `&refresh_token=${result.refreshToken}` +
        `&user=${encodeURIComponent(JSON.stringify(result.user))}`,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  getProfile(@Req() req: AuthenticatedRequest) {
    return req.user;
  }

  @Public()
  @Post("forgot-password")
  async forgotPassword(@Body() forgotPasswordDto: { email: string }) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post("verify-reset-code")
  async verifyResetCode(@Body() verifyCodeDto: { email: string; code: string }) {
    return this.authService.verifyResetCode(verifyCodeDto.email, verifyCodeDto.code);
  }

  @Public()
  @Post("reset-password")
  async resetPassword(@Body() resetPasswordDto: { email: string; code: string; newPassword: string }) {
    return this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.code,
      resetPasswordDto.newPassword,
    );
  }
}
