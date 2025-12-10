import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { SigAuthUser, SigauthVerifier } from '@sigauth/core';

export const ALLOW_ANONYMOUS_KEY = 'sigauth:allow-anonymous';
export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS_KEY, true);

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.user) {
        throw new Error('User not found in request. This indicates that the AuthGuard is not applied.');
    }

    return request.user as SigAuthUser;
});

export const Verifier = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.sigauth) {
        throw new Error('SigAuth verifier not found in request. This indicates that the AuthGuard is not applied.');
    }

    return request.sigauth as SigauthVerifier;
});
