import { IsString, IsOptional, MinLength, MaxLength, IsUrl } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(4)
    @MaxLength(25)
    username?: string;

    @IsOptional()
    @IsUrl()
    avatarUrl?: string;
}
