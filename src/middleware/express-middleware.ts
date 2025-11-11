import { Request, Response } from 'express';
import { SigauthVerifier } from '../core/verifier';
import type { SigAuthOptions, VerifyOutcome, VerifyResult } from '../types';

declare global {
    namespace Express {
        interface Request {
            sigauth?: VerifyOutcome;
            user?: VerifyResult['user'];
            token?: string;
        }
    }
}

export function sigAuthExpress(opts: SigAuthOptions) {
    const verifier = new SigauthVerifier(opts);
    const map: Map<string, string> = new Map();

    return async function (req: Request, res: Response, next: Function) {
        if (req.url.startsWith('/sigauth/oidc/auth')) {
            const code = req.query.code as string | undefined;
            const result = await verifier.resolveAuthCode(code || '');
            const mappedUrl = map.get(req.ip!);
            map.delete(req.ip!);

            if (result.ok) {
                res.cookie('accessToken', result.accessToken, { httpOnly: true, secure: true, sameSite: 'lax' });
                res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: true, sameSite: 'lax' });
                res.redirect(mappedUrl || '/');
            } else {
                res.status(401).json({ error: 'Failed to resolve auth code' });
            }
            return;
        }

        const outcome = await verifier.validateRequest({
            headers: req.headers as Record<string, string | string[] | undefined>,
            cookieHeader: req.headers['cookie'] as string | undefined,
        });

        if (!outcome.ok) {
            if (outcome.status === 307) {
                map.set(req.ip!, req.url);
                return res.redirect(outcome.error);
            }
        }

        req.sigauth = outcome;
        if (outcome.ok) {
            req.user = outcome.user;
            return next();
        }
        res.status(outcome.status).json({ error: outcome.error });
    };
}
