export class BaseService {
    context: string = 'UNKNOWN';

    constructor(context: string) {
        this.context = context;
    }
}
