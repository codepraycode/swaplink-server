import { JwtPayload } from 'jsonwebtoken';
import { User, UserRole } from '../database';

// Standard payload interface for Access/Refresh tokens
export interface TokenPayload extends JwtPayload {
    userId: User['id'];
    email?: User['email'];
    role: UserRole;
}

// Payload for Password Reset
export interface ResetTokenPayload extends JwtPayload {
    email: User['email'];
    type: 'reset';
}
