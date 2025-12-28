import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class SubmitKycInfoDto {
    @IsString()
    @IsNotEmpty()
    address!: string;

    @IsString()
    @IsNotEmpty()
    city!: string;

    @IsString()
    @IsNotEmpty()
    state!: string;

    @IsString()
    @IsNotEmpty()
    country!: string;

    @IsString()
    @IsNotEmpty()
    postalCode!: string;

    @IsDateString()
    @IsNotEmpty()
    dob!: string;

    @IsString()
    @IsOptional()
    bvn?: string;

    @IsString()
    @IsOptional()
    nin?: string;
}
