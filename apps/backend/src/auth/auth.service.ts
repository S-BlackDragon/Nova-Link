import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import validate from 'deep-email-validator';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) { }

  async validateEmail(email: string) {
    // Check email format first with regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, reason: 'Invalid email format' };
    }

    // Check if email already exists in database
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return { valid: false, reason: 'Email already registered' };
    }

    // List of known valid email providers (common ones)
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

    // If it's a known provider, accept immediately
    if (knownProviders.includes(domain)) {
      return { valid: true, reason: 'Email is valid' };
    }

    // For unknown domains, validate with deep-email-validator
    try {
      const emailValidation = await validate({
        email,
        validateRegex: true,
        validateMx: true,
        validateTypo: true,
        validateDisposable: true,
        validateSMTP: false,
      });

      if (!emailValidation.valid) {
        const reason = emailValidation.reason || 'Invalid email address';
        // Translate common error reasons
        const reasonTranslations: Record<string, string> = {
          'mx': 'Email domain does not exist',
          'regex': 'Invalid email format',
          'disposable': 'Disposable emails are not allowed',
          'typo': 'Possible typo in email address',
        };
        return { valid: false, reason: reasonTranslations[reason] || reason };
      }

      return { valid: true, reason: 'Email is valid' };
    } catch (error) {
      // If validation fails for technical reasons, reject by default for security
      return { valid: false, reason: 'Could not verify email domain' };
    }
  }

  async register(createAuthDto: CreateAuthDto) {
    // 1. Validate if email is real/existing (no SMTP - it's slow and unreliable)
    const emailValidation = await validate({
      email: createAuthDto.email,
      validateRegex: true,
      validateMx: true,
      validateTypo: true,
      validateDisposable: true,
      validateSMTP: false, // SMTP is slow and often fails for valid emails
    });

    if (!emailValidation.valid) {
      const reason = emailValidation.reason || 'Invalid email address';
      throw new BadRequestException(`Email verification failed: ${reason}. Please use a real, active email.`);
    }

    // 2. Check for existing user
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createAuthDto.email },
          { username: createAuthDto.username },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('User already exists with this email or username');
    }

    // 3. Create user and send code
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
        isVerified: true, // TEMPORARY: Auto-verify users since email service is having issues
      },
    });

    await this.mailService.sendVerificationEmail(user.email, user.username, verificationCode);

    return {
      message: 'Registration successful. Please check your email for the verification code.',
      email: user.email,
    };
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Trim code to handle accidental whitespace copy-paste
    const cleanCode = code?.toString().trim();

    if (!user || user.verificationCode !== cleanCode) {
      console.log(`[AUTH] Verification failed for ${email}. Expected: ${user?.verificationCode}, Received: ${cleanCode}`);
      throw new BadRequestException('Invalid verification code. Please check for typos.');
    }

    if (user.verificationExpires && user.verificationExpires < new Date()) {
      throw new BadRequestException('Verification code expired');
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

  async login(loginDto: LoginDto, bypassPassword = false) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: loginDto.identifier },
          { username: loginDto.identifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    /* 
    // TEMPORARY: Disabled email verification requirement
    if (!user.isVerified) {
      throw new UnauthorizedException('Email not verified. Please verify your email first.');
    }
    */

    if (!bypassPassword) {
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const payload = { sub: user.id, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Security: Always return success message even if email not found
      return { message: 'If an account exists with this email, a verification code has been sent.' };
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetCode, // Store code in resetToken field
        resetExpires: expires,
      },
    });

    await this.mailService.sendPasswordResetEmail(user.email, user.username, resetCode);

    return { message: 'If an account exists with this email, a verification code has been sent.' };
  }

  async verifyResetCode(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const cleanCode = code?.toString().trim();

    if (!user || user.resetToken !== cleanCode || !user.resetExpires || user.resetExpires < new Date()) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    return { valid: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    // 1. Verify code again (security best practice)
    await this.verifyResetCode(email, code);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('User not found');

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

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    // If username is changing, check uniqueness
    if (updateProfileDto.username) {
      const existing = await this.prisma.user.findFirst({
        where: {
          username: updateProfileDto.username,
          NOT: { id: userId },
        },
      });
      if (existing) throw new ConflictException('Username already taken');
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

  async requestEmailChange(userId: string, dto: RequestEmailChangeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    // Check if new email is already in use
    const existing = await this.prisma.user.findUnique({ where: { email: dto.newEmail } });
    if (existing) throw new ConflictException('Email already in use');

    // Generate code and send to NEW email
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

  async confirmEmailChange(userId: string, dto: ConfirmEmailChangeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.verificationCode !== dto.code.trim()) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    if (user.verificationExpires && user.verificationExpires < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    // Double check email availability right before update
    const existing = await this.prisma.user.findUnique({ where: { email: dto.newEmail } });
    if (existing) throw new ConflictException('Email already in use');

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

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isPasswordValid) throw new BadRequestException('Current password incorrect');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
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
}
