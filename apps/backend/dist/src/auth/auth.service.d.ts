import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    private mailService;
    constructor(prisma: PrismaService, jwtService: JwtService, mailService: MailService);
    validateEmail(email: string): Promise<{
        valid: boolean;
        reason: string;
    }>;
    register(createAuthDto: CreateAuthDto): Promise<{
        message: string;
        email: string;
    }>;
    verifyEmail(email: string, code: string): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
            email: string;
        };
    }>;
    login(loginDto: LoginDto, bypassPassword?: boolean): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
            email: string;
        };
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
}
