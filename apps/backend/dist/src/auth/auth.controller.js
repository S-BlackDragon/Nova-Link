"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const create_auth_dto_1 = require("./dto/create-auth.dto");
const login_dto_1 = require("./dto/login.dto");
const verify_email_dto_1 = require("./dto/verify-email.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const request_email_change_dto_1 = require("./dto/request-email-change.dto");
const confirm_email_change_dto_1 = require("./dto/confirm-email-change.dto");
const update_password_dto_1 = require("./dto/update-password.dto");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const storage_service_1 = require("../storage/storage.service");
let AuthController = class AuthController {
    authService;
    storageService;
    constructor(authService, storageService) {
        this.authService = authService;
        this.storageService = storageService;
    }
    validateEmail(email) {
        return this.authService.validateEmail(email);
    }
    register(createAuthDto) {
        return this.authService.register(createAuthDto);
    }
    verify(verifyDto) {
        return this.authService.verifyEmail(verifyDto.email, verifyDto.code);
    }
    login(loginDto) {
        return this.authService.login(loginDto);
    }
    forgotPassword(forgotPasswordDto) {
        return this.authService.forgotPassword(forgotPasswordDto.email);
    }
    verifyResetCode(verifyDto) {
        return this.authService.verifyResetCode(verifyDto.email, verifyDto.code);
    }
    resetPassword(resetDto) {
        return this.authService.resetPassword(resetDto.email, resetDto.code, resetDto.newPassword);
    }
    getProfile(req) {
        return req.user;
    }
    updateProfile(req, updateProfileDto) {
        return this.authService.updateProfile(req.user.id, updateProfileDto);
    }
    requestEmailChange(req, dto) {
        return this.authService.requestEmailChange(req.user.id, dto);
    }
    confirmEmailChange(req, dto) {
        return this.authService.confirmEmailChange(req.user.id, dto);
    }
    updatePassword(req, dto) {
        return this.authService.updatePassword(req.user.id, dto);
    }
    async getAvatarUploadUrl(req, contentType) {
        if (!contentType || !contentType.startsWith('image/')) {
            throw new common_1.BadRequestException('Valid image content type is required');
        }
        return this.storageService.getPresignedUploadUrl(req.user.id, contentType);
    }
    async confirmAvatarUpload(req, body) {
        if (!body.publicUrl) {
            throw new common_1.BadRequestException('publicUrl is required');
        }
        return this.authService.updateAvatar(req.user.id, body.publicUrl);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('validate-email'),
    __param(0, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "validateEmail", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_auth_dto_1.CreateAuthDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_email_dto_1.VerifyEmailDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('verify-reset-code'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "verifyResetCode", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('profile'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('profile'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('request-email-change'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, request_email_change_dto_1.RequestEmailChangeDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "requestEmailChange", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('confirm-email-change'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, confirm_email_change_dto_1.ConfirmEmailChangeDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "confirmEmailChange", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('update-password'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_password_dto_1.UpdatePasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "updatePassword", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('avatar-upload-url'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('contentType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getAvatarUploadUrl", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('avatar-confirm'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "confirmAvatarUpload", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        storage_service_1.StorageService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map