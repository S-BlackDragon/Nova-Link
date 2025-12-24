"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const deep_email_validator_1 = __importDefault(require("deep-email-validator"));
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    mailService;
    constructor(prisma, jwtService, mailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }
    async validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, reason: 'Invalid email format' };
        }
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return { valid: false, reason: 'Email already registered' };
        }
        const knownProviders = [
            'gmail.com', 'googlemail.com',
            'yahoo.com', 'yahoo.es', 'yahoo.com.mx',
            'outlook.com', 'outlook.es', 'hotmail.com', 'hotmail.es', 'live.com', 'msn.com',
            'icloud.com', 'me.com', 'mac.com',
            'protonmail.com', 'proton.me',
            'aol.com',
            'zoho.com',
            'mail.com',
            'gmx.com', 'gmx.net',
            'yandex.com', 'yandex.ru',
        ];
        const domain = email.split('@')[1]?.toLowerCase();
        if (knownProviders.includes(domain)) {
            return { valid: true, reason: 'Email is valid' };
        }
        try {
            const emailValidation = await (0, deep_email_validator_1.default)({
                email,
                validateRegex: true,
                validateMx: true,
                validateTypo: true,
                validateDisposable: true,
                validateSMTP: false,
            });
            if (!emailValidation.valid) {
                const reason = emailValidation.reason || 'Invalid email address';
                const reasonTranslations = {
                    'mx': 'Email domain does not exist',
                    'regex': 'Invalid email format',
                    'disposable': 'Disposable emails are not allowed',
                    'typo': 'Possible typo in email address',
                };
                return { valid: false, reason: reasonTranslations[reason] || reason };
            }
            return { valid: true, reason: 'Email is valid' };
        }
        catch (error) {
            return { valid: false, reason: 'Could not verify email domain' };
        }
    }
    async register(createAuthDto) {
        const emailValidation = await (0, deep_email_validator_1.default)({
            email: createAuthDto.email,
            validateRegex: true,
            validateMx: true,
            validateTypo: true,
            validateDisposable: true,
            validateSMTP: false,
        });
        if (!emailValidation.valid) {
            const reason = emailValidation.reason || 'Invalid email address';
            throw new common_1.BadRequestException(`Email verification failed: ${reason}. Please use a real, active email.`);
        }
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: createAuthDto.email },
                    { username: createAuthDto.username },
                ],
            },
        });
        if (existingUser) {
            throw new common_1.ConflictException('User already exists with this email or username');
        }
        const hashedPassword = await bcrypt.hash(createAuthDto.password, 12);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);
        const user = await this.prisma.user.create({
            data: {
                username: createAuthDto.username,
                email: createAuthDto.email,
                passwordHash: hashedPassword,
                verificationCode,
                verificationExpires: expires,
                isVerified: true,
            },
        });
        await this.mailService.sendVerificationEmail(user.email, user.username, verificationCode);
        return {
            message: 'Registration successful. Please check your email for the verification code.',
            email: user.email,
        };
    }
    async verifyEmail(email, code) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        const cleanCode = code?.toString().trim();
        if (!user || user.verificationCode !== cleanCode) {
            console.log(`[AUTH] Verification failed for ${email}. Expected: ${user?.verificationCode}, Received: ${cleanCode}`);
            throw new common_1.BadRequestException('Invalid verification code. Please check for typos.');
        }
        if (user.verificationExpires && user.verificationExpires < new Date()) {
            throw new common_1.BadRequestException('Verification code expired');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationCode: null,
                verificationExpires: null,
            },
        });
        return this.login({ identifier: email, password: '' }, true);
    }
    async login(loginDto, bypassPassword = false) {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: loginDto.identifier },
                    { username: loginDto.identifier },
                ],
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!bypassPassword) {
            const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
            if (!isPasswordValid) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
        }
        const payload = { sub: user.id, username: user.username };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
        };
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return { message: 'If an account exists with this email, a verification code has been sent.' };
        }
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: resetCode,
                resetExpires: expires,
            },
        });
        await this.mailService.sendPasswordResetEmail(user.email, user.username, resetCode);
        return { message: 'If an account exists with this email, a verification code has been sent.' };
    }
    async verifyResetCode(email, code) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        const cleanCode = code?.toString().trim();
        if (!user || user.resetToken !== cleanCode || !user.resetExpires || user.resetExpires < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired verification code');
        }
        return { valid: true };
    }
    async resetPassword(email, code, newPassword) {
        await this.verifyResetCode(email, code);
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                resetToken: null,
                resetExpires: null,
            },
        });
        return { message: 'Password reset successful. You can now login with your new password.' };
    }
    async updateProfile(userId, updateProfileDto) {
        if (updateProfileDto.username) {
            const existing = await this.prisma.user.findFirst({
                where: {
                    username: updateProfileDto.username,
                    NOT: { id: userId },
                },
            });
            if (existing)
                throw new common_1.ConflictException('Username already taken');
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: updateProfileDto,
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
            },
        });
    }
    async requestEmailChange(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const existing = await this.prisma.user.findUnique({ where: { email: dto.newEmail } });
        if (existing)
            throw new common_1.ConflictException('Email already in use');
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                verificationCode,
                verificationExpires: expires,
            },
        });
        await this.mailService.sendVerificationEmail(dto.newEmail, user.username, verificationCode);
        return { message: 'Verification code sent to your new email address.' };
    }
    async confirmEmailChange(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.verificationCode !== dto.code.trim()) {
            throw new common_1.BadRequestException('Invalid or expired verification code');
        }
        if (user.verificationExpires && user.verificationExpires < new Date()) {
            throw new common_1.BadRequestException('Verification code expired');
        }
        const existing = await this.prisma.user.findUnique({ where: { email: dto.newEmail } });
        if (existing)
            throw new common_1.ConflictException('Email already in use');
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                email: dto.newEmail,
                verificationCode: null,
                verificationExpires: null,
            },
            select: {
                id: true,
                username: true,
                email: true,
            },
        });
    }
    async updatePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
        if (!isPasswordValid)
            throw new common_1.BadRequestException('Current password incorrect');
        const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword },
        });
        return { message: 'Password updated successfully' };
    }
    async updateAvatar(userId, avatarUrl) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
            },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map