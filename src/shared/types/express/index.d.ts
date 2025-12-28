import { TokenPayload } from '../auth.types';

export {};

declare global {
    namespace Express {
        export interface Request {
            rawBody?: Buffer;

            // Custom User Property
            user?: TokenPayload;

            // Custom Headers/Metadata
            deviceId?: string;
            appVersion?: string;
            requestId?: string;
        }
    }
}
