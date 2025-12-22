import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
    @IsString()
    token: string;

    @IsString()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password is too weak. Must contain at least one uppercase letter, one lowercase letter, and one number or special character.',
    })
    newPassword: string;
}
