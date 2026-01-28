import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsDateString,
    ValidateNested,
    IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
    @IsString()
    @IsNotEmpty()
    street!: string;

    @IsString()
    @IsNotEmpty()
    city!: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsNotEmpty()
    country!: string;

    @IsString()
    @IsNotEmpty()
    postalCode!: string;
}

export class GovernmentIdDto {
    @IsString()
    @IsNotEmpty()
    type!: string;

    @IsString()
    @IsNotEmpty()
    number!: string;
}

export class SubmitKycUnifiedDto {
    @IsString()
    @IsNotEmpty()
    firstName!: string;

    @IsString()
    @IsNotEmpty()
    lastName!: string;

    @IsDateString()
    @IsNotEmpty()
    dateOfBirth!: string;

    @IsObject()
    @ValidateNested()
    @Type(() => AddressDto)
    address!: AddressDto;

    @IsObject()
    @ValidateNested()
    @Type(() => GovernmentIdDto)
    governmentId!: GovernmentIdDto;
}
