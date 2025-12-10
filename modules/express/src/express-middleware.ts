import { Request, Response } from 'express';
import { SigAuthHandlerResponse, SigAuthOptions, SigAuthUser, SigauthVerifier } from '@sigauth/core';

declare global {
    namespace Express {
        interface Request {
            sigauth: SigauthVerifier;
            user: SigAuthUser;
        }
    }
}

export function sigauthExpress(opts: SigAuthOptions) {
    const verifier = new SigauthVerifier(opts);

    return async function (req: Request, res: Response, next: Function): Promise<SigAuthHandlerResponse> {
        if (req.url.startsWith('/sigauth/oidc/auth')) {
            const code = req.query.code as string | undefined;
            const redirectUri = req.query.redirectUri as string | undefined;
            const result = await verifier.resolveAuthCode(code || '', redirectUri || '');

            if (result.ok) {
                res.cookie('accessToken', result.accessToken, {
                    httpOnly: true,
                    secure: opts.secureCookies ?? true,
                    sameSite: 'lax',
                    path: '/',
                });
                res.cookie('refreshToken', result.refreshToken, {
                    httpOnly: true,
                    secure: opts.secureCookies ?? true,
                    sameSite: 'lax',
                    path: '/',
                });
                res.redirect(redirectUri || '/');
            } else {
                res.status(401).json({ error: 'Failed to resolve auth code' });
            }
            return { closed: true, user: null, sigauth: verifier };
        }

        if (
            !opts.authenticateRoutes?.some(patteren => {
                const regex = new RegExp('^' + patteren.replace('*', '.*') + '$');
                return regex.test(req.path);
            })
        ) {
            next();
            return { closed: false, user: null, sigauth: verifier };
        }

        const refresh = await verifier.refreshOnDemand(req);
        if (refresh.ok) {
            res.cookie('accessToken', refresh.accessToken, {
                httpOnly: true,
                secure: opts.secureCookies ?? true,
                sameSite: 'lax',
                path: '/',
            });
            res.cookie('refreshToken', refresh.refreshToken, {
                httpOnly: true,
                secure: opts.secureCookies ?? true,
                sameSite: 'lax',
                path: '/',
            });
        }
        if (refresh.failed) {
            res.cookie('accessToken', '', { httpOnly: true, secure: opts.secureCookies ?? true, sameSite: 'lax', maxAge: 0, path: '/' });
            res.cookie('refreshToken', '', { httpOnly: true, secure: opts.secureCookies ?? true, sameSite: 'lax', maxAge: 0, path: '/' });
        }

        const outcome = await verifier.validateRequest(req, req.url);
        if (!outcome.ok) {
            res.cookie('accessToken', '', { httpOnly: true, secure: opts.secureCookies ?? true, sameSite: 'lax', maxAge: 0, path: '/' });
            res.cookie('refreshToken', '', { httpOnly: true, secure: opts.secureCookies ?? true, sameSite: 'lax', maxAge: 0, path: '/' });
            if (outcome.status === 307) {
                res.redirect(outcome.error);
                return { closed: true, user: null, sigauth: verifier };
            }
        }

        req.sigauth = verifier;
        if (outcome.ok) {
            req.user = outcome.user;
            next();
            return { closed: false, user: outcome.user, sigauth: verifier };
        }
        res.status(outcome.status).json({ error: outcome.error });
        return { closed: true, user: null, sigauth: verifier };
    };
}
