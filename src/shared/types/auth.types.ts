import { JwtPayload } from 'jsonwebtoken';
import { User, UserRole } from '../database';

export interface TokenPayload extends JwtPayload {
    userId: User['id'];
    email?: User['email'];
    role: UserRole;
    iat?: number;
    exp?: number;
}

// Payload for Password Reset
export interface ResetTokenPayload extends JwtPayload {
    email: User['email'];
    type: 'reset';
}
