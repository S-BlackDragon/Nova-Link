import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateAuthDto {
    @IsString()
    @MinLength(4, { message: 'Username must be at least 4 characters' })
    @MaxLength(25, { message: 'Username must be at most 25 characters' })
    username: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password is too weak. Must contain at least one uppercase letter, one lowercase letter, and one number or special character.',
    })
    password: string;
}
