import { IsString, MinLength, Matches, IsEmail, Length } from 'class-validator';

export class ResetPasswordDto {
    @IsEmail()
    email: string;

    @IsString()
    @Length(6, 6)
    code: string;


    @IsString()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password is too weak. Must contain at least one uppercase letter, one lowercase letter, and one number or special character.',
    })
    newPassword: string;
}
