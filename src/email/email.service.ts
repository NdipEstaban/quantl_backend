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

  async sendPasswordResetEmail(to: string, code: string, firstName: string): Promise<void> {
    const appName = this.configService.get("APP_NAME");
    const supportEmail = this.configService.get("SUPPORT_EMAIL");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; }
          .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .code { font-size: 32px; letter-spacing: 5px; background-color: #ffffff; padding: 15px; text-align: center; border-radius: 6px; border: 2px dashed #10b981; margin: 20px 0; font-weight: bold; color: #111827; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          .expiry { color: #ef4444; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${appName} - Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>You requested a password reset for your trading journal account.</p>
            <p>Use the following verification code to reset your password:</p>
            
            <div class="code">${code}</div>
            
            <p>This code will expire in <span class="expiry">15 minutes</span>.</p>
            <p>If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.</p>
            
            <p>Happy Trading,<br>The ${appName} Team</p>
          </div>
          <div class="footer">
            <p>Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
            <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.mailerService.sendMail({
      from: `"${appName}" <${this.configService.get("SMTP_FROM")}>`,
      to,
      subject: `Password Reset - ${appName}`,
      html,
      text: `
        Password Reset Request
        
        Hi ${firstName},
        
        You requested a password reset for your ${appName} account.
        
        Your verification code is: ${code}
        
        This code will expire in 15 minutes.
        
        If you didn't request this password reset, please ignore this email.
        
        Happy Trading,
        The ${appName} Team
      `,
    });
  }

  /**
   * Send password changed confirmation email
   */
  async sendPasswordChangedEmail(to: string, firstName: string): Promise<void> {
    const appName = this.configService.get("APP_NAME");
    const supportEmail = this.configService.get("SUPPORT_EMAIL");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; }
          .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-icon { color: #10b981; font-size: 48px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          .security-note { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${appName} - Password Updated</h1>
          </div>
          <div class="content">
            <div class="success-icon">✓</div>
            
            <p>Hi ${firstName},</p>
            <p>Your password has been successfully updated.</p>
            
            <div class="security-note">
              <strong>Security Note:</strong> If you did not make this change, please contact our support team immediately.
            </div>
            
            <p>For security reasons, all existing sessions have been logged out. You'll need to sign in again with your new password.</p>
            
            <p>Happy Trading,<br>The ${appName} Team</p>
          </div>
          <div class="footer">
            <p>Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
            <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.mailerService.sendMail({
      from: `"${appName}" <${this.configService.get("SMTP_FROM")}>`,
      to,
      subject: `Password Updated - ${appName}`,
      html,
      text: `
        Password Updated
        
        Hi ${firstName},
        
        Your password has been successfully updated.
        
        Security Note: If you did not make this change, please contact our support team immediately.
        
        For security reasons, all existing sessions have been logged out. You'll need to sign in again with your new password.
        
        Happy Trading,
        The ${appName} Team
      `,
    });
  }
}
