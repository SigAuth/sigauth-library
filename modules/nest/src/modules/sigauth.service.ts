import { Inject, Injectable } from '@nestjs/common';
import { SigAuthOptions, SigauthVerifier } from '@sigauth/core';
import { CookieOptions, Response } from 'express';

@Injectable()
export class SigAuthService {
    private readonly sigauth: SigauthVerifier;

    constructor(@Inject('SIGAUTH_OPTIONS') private readonly options: SigAuthOptions) {
        this.sigauth = new SigauthVerifier(options);
    }

    async exchangeCode(code: string, redirectUri: string, res: Response) {
        const result = await this.sigauth.resolveAuthCode(code, redirectUri);
        if (result.ok) {
            res.cookie('accessToken', result.accessToken, {
                httpOnly: true,
                secure: this.options.secureCookies ?? true,
                sameSite: 'lax',
                path: '/',
            });

            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: this.options.secureCookies ?? true,
                sameSite: 'lax',
                path: '/',
            });
            return res.redirect(redirectUri || '/');
        } else {
            return res.status(401).json({ error: 'Failed to resolve auth code' });
        }
    }

    getVerifier(): SigauthVerifier {
        return this.sigauth;
    }
}
