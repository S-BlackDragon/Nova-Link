import { Controller, Post, Body, Get, UseGuards, Request, Patch, Query, BadRequestException } from '@nestjs/common';
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
import { JwtAuthGuard } from './jwt-auth.guard';
import { StorageService } from '../storage/storage.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly storageService: StorageService,
  ) { }

  @Post('validate-email')
  validateEmail(@Body('email') email: string) {
    return this.authService.validateEmail(email);
  }

  @Post('register')
  register(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.register(createAuthDto);
  }

  @Post('verify')
  verify(@Body() verifyDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyDto.email, verifyDto.code);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('verify-reset-code')
  verifyResetCode(@Body() verifyDto: { email: string; code: string }) {
    return this.authService.verifyResetCode(verifyDto.email, verifyDto.code);
  }

  @Post('reset-password')
  resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetDto.email, resetDto.code, resetDto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Request() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  requestEmailChange(@Request() req: any, @Body() dto: RequestEmailChangeDto) {
    return this.authService.requestEmailChange(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('confirm-email-change')
  confirmEmailChange(@Request() req: any, @Body() dto: ConfirmEmailChangeDto) {
    return this.authService.confirmEmailChange(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update-password')
  updatePassword(@Request() req: any, @Body() dto: UpdatePasswordDto) {
    return this.authService.updatePassword(req.user.id, dto);
  }

  /**
   * Get pre-signed URL for direct avatar upload to MinIO
   * Client uploads directly to MinIO, then confirms with avatar-confirm
   */
  @UseGuards(JwtAuthGuard)
  @Get('avatar-upload-url')
  async getAvatarUploadUrl(
    @Request() req: any,
    @Query('contentType') contentType: string,
  ) {
    if (!contentType || !contentType.startsWith('image/')) {
      throw new BadRequestException('Valid image content type is required');
    }
    return this.storageService.getPresignedUploadUrl(req.user.id, contentType);
  }

  /**
   * Confirm avatar upload - saves the public URL to user profile
   */
  @UseGuards(JwtAuthGuard)
  @Patch('avatar-confirm')
  async confirmAvatarUpload(
    @Request() req: any,
    @Body() body: { publicUrl: string },
  ) {
    if (!body.publicUrl) {
      throw new BadRequestException('publicUrl is required');
    }
    return this.authService.updateAvatar(req.user.id, body.publicUrl);
  }
}
