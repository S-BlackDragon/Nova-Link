import { MailerService } from '@nestjs-modules/mailer';
export declare class MailService {
    private mailerService;
    constructor(mailerService: MailerService);
    sendVerificationEmail(email: string, username: string, code: string): Promise<void>;
    sendPasswordResetEmail(email: string, username: string, token: string): Promise<void>;
    private logCodeToConsole;
}
