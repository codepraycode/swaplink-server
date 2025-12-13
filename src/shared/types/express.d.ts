import { TokenPayload } from './auth.types';

declare global {
    namespace Express {
        interface Request {
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

export {};
