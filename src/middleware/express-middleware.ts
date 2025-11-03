import { Request, Response } from 'express';
import { validateSigAuthRequest } from '../core/verifier';
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
    return async function (req: Request, res: Response, next: Function) {
        const outcome = await validateSigAuthRequest(
            {
                headers: req.headers as Record<string, string | string[] | undefined>,
                cookieHeader: req.headers['cookie'] as string | undefined,
            },
            opts,
        );

        // req.sigauth = outcome;
        // if (outcome.ok) {
        //   req.user = outcome.user;
        //   req.token = outcome.token;
        //   return next();
        // }
        // res.status(outcome.status).json({ error: outcome.error });
        return next();
    };
}
