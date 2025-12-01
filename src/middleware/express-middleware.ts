import { Request, Response } from 'express';
import { SigauthVerifier } from '../core/verifier';
import type { SigAuthOptions, VerifyResult } from '../types';

declare global {
    namespace Express {
        interface Request {
            sigauth: SigauthVerifier;
            user: VerifyResult['user'];
        }
    }
}

export function sigAuthExpress(opts: SigAuthOptions) {
    const verifier = new SigauthVerifier(opts);
    const waiting: Map<string, string> = new Map();

    return async function (req: Request, res: Response, next: Function) {
        if (req.url.startsWith('/sigauth/oidc/auth')) {
            const code = req.query.code as string | undefined;
            const result = await verifier.resolveAuthCode(code || '');
            const mappedUrl = waiting.get(req.ip!);
            waiting.delete(req.ip!);

            if (result.ok) {
                res.cookie('accessToken', result.accessToken, { httpOnly: true, secure: true, sameSite: 'lax' });
                res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: true, sameSite: 'lax' });
                console.log('Resolve successfull redirecitng to ' + (mappedUrl || '/'));
                res.redirect(mappedUrl || '/');
            } else {
                res.status(401).json({ error: 'Failed to resolve auth code' });
            }
            return;
        }

        if (
            !opts.authenticateRoutes.some(patteren => {
                const regex = new RegExp('^' + patteren.replace('*', '.*') + '$');
                return regex.test(req.path);
            })
        ) {
            return next();
        }

        const refresh = await verifier.refreshOnDemand(req);
        if (refresh.ok) {
            res.cookie('accessToken', refresh.accessToken, { httpOnly: true, secure: true, sameSite: 'lax' });
            res.cookie('refreshToken', refresh.refreshToken, { httpOnly: true, secure: true, sameSite: 'lax' });
        }
        if (refresh.failed) {
            res.cookie('accessToken', '', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0 });
            res.cookie('refreshToken', '', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0 });
        }

        const outcome = await verifier.validateRequest({
            headers: req.headers as Record<string, string | string[] | undefined>,
            cookieHeader: req.headers['cookie'] as string | undefined,
        });

        if (!outcome.ok) {
            res.cookie('accessToken', '', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0 });
            res.cookie('refreshToken', '', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0 });
            if (outcome.status === 307) {
                waiting.set(req.ip!, req.url);
                return res.redirect(outcome.error);
            }
        }

        req.sigauth = verifier;
        if (outcome.ok) {
            req.user = outcome.user;
            return next();
        }
        res.status(outcome.status).json({ error: outcome.error });
    };
}
