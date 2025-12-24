import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { StorageService } from '../storage/storage.service';
export declare class AuthController {
    private readonly authService;
    private readonly storageService;
    constructor(authService: AuthService, storageService: StorageService);
    validateEmail(email: string): Promise<{
        valid: boolean;
        reason: string;
    }>;
    register(createAuthDto: CreateAuthDto): Promise<{
        message: string;
        email: string;
    }>;
    verify(verifyDto: VerifyEmailDto): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
            email: string;
            avatarUrl: string | null;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
            email: string;
            avatarUrl: string | null;
        };
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    verifyResetCode(verifyDto: {
        email: string;
        code: string;
    }): Promise<{
        valid: boolean;
    }>;
    resetPassword(resetDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    getProfile(req: any): any;
    updateProfile(req: any, updateProfileDto: UpdateProfileDto): Promise<{
        id: string;
        username: string;
        email: string;
        avatarUrl: string | null;
    }>;
    requestEmailChange(req: any, dto: RequestEmailChangeDto): Promise<{
        message: string;
    }>;
    confirmEmailChange(req: any, dto: ConfirmEmailChangeDto): Promise<{
        id: string;
        username: string;
        email: string;
    }>;
    updatePassword(req: any, dto: UpdatePasswordDto): Promise<{
        message: string;
    }>;
    getAvatarUploadUrl(req: any, contentType: string): Promise<{
        uploadUrl: string;
        key: string;
        publicUrl: string;
    }>;
    confirmAvatarUpload(req: any, body: {
        publicUrl: string;
    }): Promise<{
        id: string;
        username: string;
        email: string;
        avatarUrl: string | null;
    }>;
}
