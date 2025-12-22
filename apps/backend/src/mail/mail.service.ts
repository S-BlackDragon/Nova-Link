import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) { }

  async sendVerificationEmail(email: string, username: string, code: string) {
    // Check if Gmail is configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      this.logCodeToConsole(email, username, code, 'VERIFICATION');
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify your Nova Link Account',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #ec4899); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔗 Nova Link</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px;">
              <h2 style="color: #1e293b; margin-top: 0;">Welcome, ${username}! 👋</h2>
              <p style="color: #475569; font-size: 16px;">Thank you for registering. Use the code below to verify your email:</p>
              <div style="background: #1e293b; padding: 25px; font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; border-radius: 12px; color: #22c55e; margin: 25px 0;">
                ${code}
              </div>
              <p style="color: #64748b; font-size: 14px;">This code expires in <strong>1 hour</strong>.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you didn't create this account, you can safely ignore this email.</p>
            </div>
          </div>
        `,
      });
      console.log(`\n✅ Verification email sent to ${email}`);
    } catch (error: any) {
      console.error('Failed to send email via Gmail:', error.message);
      this.logCodeToConsole(email, username, code, 'VERIFICATION');
    }
  }

  async sendPasswordResetEmail(email: string, username: string, token: string) {

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      this.logCodeToConsole(email, username, token, 'RESET');
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset your Nova Link Password',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #ec4899); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔗 Nova Link</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px;">
              <h2 style="color: #1e293b; margin-top: 0;">Password Reset Request</h2>
              <p style="color: #475569; font-size: 16px;">Hello ${username}, use the code below to reset your password:</p>
              <div style="background: #1e293b; padding: 25px; font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; border-radius: 12px; color: #facc15; margin: 25px 0;">
                ${token}
              </div>
              <p style="color: #64748b; font-size: 14px;">This code expires in <strong>1 hour</strong>.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
            </div>
          </div>
        `,
      });
      console.log(`\n✅ Password reset email sent to ${email}`);
    } catch (error: any) {
      console.error('Failed to send reset email via Gmail:', error.message);
      this.logCodeToConsole(email, username, token, 'RESET');
    }
  }

  private logCodeToConsole(email: string, username: string, code: string, type: 'VERIFICATION' | 'RESET') {
    const emoji = type === 'VERIFICATION' ? '📧' : '🔑';
    const title = type === 'VERIFICATION' ? 'EMAIL VERIFICATION CODE' : 'PASSWORD RESET TOKEN';

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log(`║              ${emoji} ${title.padEnd(35)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Email: ${email.padEnd(51)}║`);
    console.log(`║  User:  ${username.padEnd(51)}║`);
    console.log('║                                                              ║');
    console.log(`║  🔑 CODE:  ${code.padEnd(47)}║`);
    console.log('║                                                              ║');
    console.log('║  ⚠️  Gmail not configured - add GMAIL_USER and              ║');
    console.log('║     GMAIL_APP_PASSWORD to .env file                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');
  }
}
