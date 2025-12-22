import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsNotEmpty()
    @IsString()
    identifier: string; // Can be email or username

    @IsString()
    @MinLength(6)
    password: string;
}
