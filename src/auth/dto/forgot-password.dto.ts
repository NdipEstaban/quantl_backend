// auth/dto/forgot-password.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
  registerDecorator,
  Validate,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

// auth/dto/verify-reset-code.dto.ts
export class VerifyResetCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  code: string;
}

// auth/dto/reset-password.dto.ts
export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  @Validate(IsSameAs, ["newPassword"])
  confirmPassword: string;
}

// Custom validator for matching passwords
export function IsSameAs(property: string, validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "IsSameAs",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value === relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${propertyName} must match ${relatedPropertyName}`;
        },
      },
    });
  };
}
