import { isDevEnv, isProdEnv } from '../config/env';

export class BaseService {
    context: string = 'UNKNOWN';
    // shouldThrow = isProdEnv || isDevEnv;

    constructor(context: string) {
        this.context = context;
    }
}
