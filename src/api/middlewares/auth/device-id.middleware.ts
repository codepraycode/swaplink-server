import { Request, Response, NextFunction } from 'express';

export const deviceIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const deviceId = req.headers['x-device-id'] || req.headers['device-id'];

    if (deviceId) {
        req.body.deviceId = deviceId;
    }

    next();
};
