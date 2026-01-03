// dto/register-user.dto.ts
import { IsString, MinLength, MaxLength, IsEmail } from "class-validator";

export class VerifyEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  @MaxLength(10)
  verificationCode: string;
}
