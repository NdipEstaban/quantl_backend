import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { join } from "path";
import { EmailService } from "./email.service";

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        // Transport settings
        transport: {
          host: config.get("EMAIL_HOST"),
          port: config.get("EMAIL_PORT"),
          secure: config.get("EMAIL_SECURE") === "true",
          auth: {
            user: config.get("EMAIL_USER"),
            pass: config.get("EMAIL_PASSWORD"),
          },
        },
        defaults: {
          from: `"${config.get("EMAIL_FROM_NAME")}" <${config.get("EMAIL_FROM_ADDRESS")}>`,
        },
        // Template settings
        template: {
          dir: join(__dirname, "templates"), // Points to the dist/email/templates folder
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
