import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
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
            avatarUrl: string | null;
        };
    }>;
    login(loginDto: LoginDto, bypassPassword?: boolean): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
            email: string;
            avatarUrl: string | null;
        };
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    verifyResetCode(email: string, code: string): Promise<{
        valid: boolean;
    }>;
    resetPassword(email: string, code: string, newPassword: string): Promise<{
        message: string;
    }>;
    updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<{
        id: string;
        username: string;
        email: string;
        avatarUrl: string | null;
    }>;
    requestEmailChange(userId: string, dto: RequestEmailChangeDto): Promise<{
        message: string;
    }>;
    confirmEmailChange(userId: string, dto: ConfirmEmailChangeDto): Promise<{
        id: string;
        username: string;
        email: string;
    }>;
    updatePassword(userId: string, dto: UpdatePasswordDto): Promise<{
        message: string;
    }>;
    updateAvatar(userId: string, avatarUrl: string): Promise<{
        id: string;
        username: string;
        email: string;
        avatarUrl: string | null;
    }>;
}
