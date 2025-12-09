import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { SigAuthOptions } from '@sigauth/core';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(@Inject('SIGAUTH_OPTIONS') private readonly options: SigAuthOptions) {}

    use(req: any, res: any, next: (error?: any) => void) {
        console.log(this.options);
        next();
    }
}
