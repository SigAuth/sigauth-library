import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SigAuthOptions } from '@sigauth/core';
import { Observable } from 'rxjs';
import { ALLOW_ANONYMOUS_KEY } from '../common/util.decorators.js';
import { AuthService } from './auth.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authService: AuthService,
        @Inject('SIGAUTH_OPTIONS') private readonly options: SigAuthOptions,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const allowAnonymous = this.reflector.getAllAndOverride<boolean>(ALLOW_ANONYMOUS_KEY, [context.getHandler(), context.getClass()]);
        if (allowAnonymous) return true;

        // auth logic
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();
        const refresh = await this.authService.getVerifier().refreshOnDemand(req);
        if (refresh.ok) {
            res.cookie('accessToken', refresh.accessToken, {
                httpOnly: true,
                secure: this.options.secureCookies ?? true,
                sameSite: 'lax',
                path: '/',
            });
            res.cookie('refreshToken', refresh.refreshToken, {
                httpOnly: true,
                secure: this.options.secureCookies ?? true,
                sameSite: 'lax',
                path: '/',
            });
        }
        if (refresh.failed) {
            res.cookie('accessToken', '', { maxAge: 0, path: '/' });
            res.cookie('refreshToken', '', { maxAge: 0, path: '/' });
        }

        const outcome = await this.authService.getVerifier().validateRequest(req, req.url);
        if (!outcome.ok) {
            res.cookie('accessToken', '', { maxAge: 0, path: '/' });
            res.cookie('refreshToken', '', { maxAge: 0, path: '/' });
            if (outcome.status == 307) {
                res.redirect(outcome.error);
                return false;
            }
        }

        if (outcome.ok) {
            // make user accessible
            req.user = outcome.user;
            req.sigauth = this.authService.getVerifier();
            return true;
        }
        return false;
    }
}
