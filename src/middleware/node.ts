import { verifyRequestCore } from '../core/verifier';
import type { SigAuthOptions, VerifyOutcome } from '../types';

// Accepts a minimal request-like shape. Works with Node http.IncomingMessage, Fetch Request, or custom.
export async function verifyRequest(req: any, opts: SigAuthOptions): Promise<VerifyOutcome> {
    // Attempt to normalize from common request shapes
    const headers: Record<string, string | string[] | undefined> = {};
    const rawHeaders = req?.headers || (typeof req?.headers?.get === 'function' ? Object.fromEntries(req.headers as any) : undefined);
    if (rawHeaders) {
        for (const [k, v] of Object.entries(rawHeaders)) headers[k.toLowerCase()] = v as any;
    }
    const cookieHeader = headers['cookie'] as string | undefined;
    return verifyRequestCore({ headers, cookieHeader }, opts);
}

// Small wrapper to guard a handler function
export function withSigAuth<T extends (...args: any[]) => any>(handler: T, opts: SigAuthOptions) {
    return async function (req: any, res?: any, ...rest: any[]) {
        const outcome = await verifyRequest(req, opts);
        if (outcome.ok) {
            // Attach to req if possible
            try {
                req.user = outcome.user;
                req.token = outcome.token;
                req.sigauth = outcome;
            } catch {}
            return handler(req, res, ...rest);
        }
        if (res && typeof res.status === 'function') {
            return res.status(outcome.status).json({ error: outcome.error });
        }
        const err = new Error(outcome.error);
        (err as any).status = outcome.status;
        throw err;
    } as T;
}
