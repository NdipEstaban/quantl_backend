// strategies/google.strategy.ts - FIXED VERSION
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { AuthService } from "../auth.service";
import { AuthProviders } from "@prisma/client";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, name, emails, photos, provider } = profile;

      const email = emails?.[0]?.value || `${id}@google.com`;
      const firstName = name?.givenName || "";
      const lastName = name?.familyName || "";
      const imageUrl = photos?.[0]?.value;

      const result = await this.authService.handleOAuthLogin(
        AuthProviders.GOOGLE,
        id,
        email,
        firstName,
        lastName,
        imageUrl,
      );

      done(null, {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        providerAccountId: id,
        provider,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      done(error);
    }
  }
}
