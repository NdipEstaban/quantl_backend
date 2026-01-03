// strategies/facebook.strategy.ts - FIXED VERSION
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-facebook";
import { AuthService } from "../auth.service";
import { AuthProviders } from "@prisma/client";

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, "facebook") {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.FACEBOOK_APP_ID || "", // FIX: Provide default value
      clientSecret: process.env.FACEBOOK_APP_SECRET || "", // FIX: Provide default value
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || "http://localhost:3000/auth/facebook/callback",
      scope: ["email"],
      profileFields: ["id", "emails", "name", "photos"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    try {
      const { id, name, emails, photos, provider } = profile;

      // FIX: Handle potentially undefined values
      const email = emails?.[0]?.value || `${id}@facebook.com`;
      const firstName = name?.givenName || "";
      const lastName = name?.familyName || "";
      const imageUrl = photos?.[0]?.value;

      // FIX: Use handleOAuthLogin instead (update to match your AuthService method)
      const result = await this.authService.handleOAuthLogin(
        AuthProviders.FACEBOOK,
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
      done(error, null);
    }
  }
}
