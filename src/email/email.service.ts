import { Injectable, Logger } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationEmail(email: string, code: string, name?: string): Promise<boolean> {
    const appName = this.configService.get("APP_NAME") || "Our App";
    const recipientName = name || "User";

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: "Verify Your Email Address",
        template: "verification", // Name of the file without extension
        context: {
          name: recipientName,
          code,
          appName,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
    const appName = this.configService.get("APP_NAME") || "Our App";
    const recipientName = name || "User";

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: "Welcome to Our App!",
        template: "welcome",
        context: {
          name: recipientName,
          appName,
        },
      });

      this.logger.log(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      return false;
    }
  }
}
