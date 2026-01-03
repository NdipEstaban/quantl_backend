import { REFRESH_JWT_EXPIRES_IN } from "@/common/jwt-constants";
import { registerAs } from "@nestjs/config";
import { JwtModuleOptions, JwtSignOptions } from "@nestjs/jwt";

export default registerAs(
  "refresh-jwt",
  (): JwtSignOptions => ({
    secret: process.env.REFRESH_JWT_SECRET,

    expiresIn: REFRESH_JWT_EXPIRES_IN,
  }),
);
