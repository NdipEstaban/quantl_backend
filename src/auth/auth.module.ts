// auth.module.ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserService } from "../user/user.service";
import { PrismaService } from "../prisma.service";
import { LocalStrategy } from "./strategies/local.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { ConfigModule } from "@nestjs/config";
import { RefreshTokenStrategy } from "./strategies/refresh.strategy";
import { FacebookStrategy } from "./strategies/facebook.strategy";
import refreshJwtConfig from "./config/refresh-jwt.config";
import jwtConfig from "./config/jwt.config";
import { EmailModule } from "@/email/email.module";

@Module({
  imports: [
    PassportModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ConfigModule.forFeature(refreshJwtConfig),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: "15m",
      },
    }),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    PrismaService,
    LocalStrategy,
    JwtStrategy,
    RefreshTokenStrategy,
    GoogleStrategy,
    FacebookStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
