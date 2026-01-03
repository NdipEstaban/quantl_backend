// dto/register-user.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, Matches } from "class-validator";

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsString()
  /*@MinLength(8)
  @MaxLength(100)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })*/
  password: string;
}
