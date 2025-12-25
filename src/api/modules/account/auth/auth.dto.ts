import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';

// For the "One Device" session management we discussed
export class BaseAuthDto {
    @IsString()
    @IsNotEmpty()
    deviceId!: string;
}

export class RegisterStep1Dto extends BaseAuthDto {
    @IsString()
    @IsNotEmpty()
    firstName!: string;

    @IsString()
    @IsNotEmpty()
    lastName!: string;

    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @MinLength(8, { message: 'Password is too short (min 8 characters)' })
    password!: string;
}

export class RegisterStep2Dto extends BaseAuthDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsString()
    @IsNotEmpty()
    phone!: string;
}

export class VerifyOtpDto extends BaseAuthDto {
    @IsString()
    @IsNotEmpty()
    identifier!: string; // email or phone

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    otp!: string;

    @IsEnum(['EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'PASSWORD_RESET'])
    purpose!: string;
}

export class LoginDto extends BaseAuthDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;
}

export class SetupTransactionPinDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(4)
    pin!: string;

    @IsString()
    @IsNotEmpty()
    confirmPin!: string;
}
