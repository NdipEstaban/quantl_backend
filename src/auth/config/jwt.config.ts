import { JWT_EXPIRES_IN } from "@/common/jwt-constants";
import { registerAs } from "@nestjs/config";
import { JwtModuleOptions } from "@nestjs/jwt";

export default registerAs(
  "jwt",
  (): JwtModuleOptions => ({
    secret: process.env.JWT_SECRET,
    signOptions: {
      expiresIn: JWT_EXPIRES_IN,
    },
  }),
);
