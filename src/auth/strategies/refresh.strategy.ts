// strategies/refresh-token.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { ExtractJwt } from "passport-jwt";
import { Request } from "express";
import { AuthService } from "../auth.service";

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, "refresh") {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
      ignoreExpiration: false,
      secretOrKey: process.env.REFRESH_JWT_SECRET || "your-refresh-secret",
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: any) {
    const refreshToken = req.body.refreshToken;
    return {
      id: payload.sub,
      email: payload.email,
      refreshToken,
    };
  }
}
