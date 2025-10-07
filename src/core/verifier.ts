import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { SigAuthOptions, SigAuthUser, VerifyError, VerifyOutcome, VerifyResult } from '../types';

export interface MinimalRequestLike {
    headers?: Record<string, string | string[] | undefined>;
    // Optional raw cookies string (e.g., from req.headers.cookie)
    cookieHeader?: string | null;
}

function readHeader(headers: MinimalRequestLike['headers'], name: string): string | undefined {
    if (!headers) return undefined;
    const value = headers[name.toLowerCase()] ?? headers[name];
    if (Array.isArray(value)) return value[0];
    return value as string | undefined;
}

function parseCookies(cookieHeader?: string | null): Record<string, string> {
    const out: Record<string, string> = {};
    if (!cookieHeader) return out;
    const parts = cookieHeader.split(/;\s*/);
    for (const part of parts) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        const k = decodeURIComponent(part.slice(0, idx).trim());
        const v = decodeURIComponent(part.slice(idx + 1));
        out[k] = v;
    }
    return out;
}

function extractBearer(value?: string): string | null {
    if (!value) return null;
    const m = /^Bearer\s+(.+)$/i.exec(value.trim());
    return m ? m[1] : value.trim();
}

export async function verifyRequestCore(req: MinimalRequestLike, opts: SigAuthOptions): Promise<VerifyOutcome> {
    try {
        const headerName = (opts.tokenHeader ?? 'authorization').toLowerCase();
        const cookieName = opts.tokenCookie ?? 'sigauth_token';

        let token: string | null = null;

        if (opts.getToken) {
            token = opts.getToken(req);
        }

        if (!token) {
            token =
                extractBearer(readHeader(req.headers, headerName)) || parseCookies(req.cookieHeader || readHeader(req.headers, 'cookie'))[cookieName] || null;
        }

        if (!token) {
            return { ok: false, status: 401, error: 'Missing token' } as VerifyError;
        }

        const issuer = opts.issuer.replace(/\/?$/, '/');
        const jwksUri = opts.jwksUri ?? new URL('.well-known/jwks.json', issuer).toString();
        const JWKS = createRemoteJWKSet(new URL(jwksUri));

        const { payload } = await jwtVerify(token, JWKS, {
            issuer: opts.issuer,
            audience: opts.audience,
            algorithms: opts.algorithms,
            clockTolerance: opts.leewaySeconds ?? 5,
        });

        const user: SigAuthUser = {
            sub: payload.sub!,
            email: payload.email as string | undefined,
            name: payload.name as string | undefined,
            roles: (payload['roles'] as string[] | undefined) ?? undefined,
            scope: payload.scope as string | undefined,
            payload,
        };

        return { ok: true, user, token } as VerifyResult;
    } catch (err: any) {
        const message = err?.message || 'Verification failed';
        const status = /expired/i.test(message) ? 401 : /audience|issuer|signature/i.test(message) ? 401 : 400;
        return { ok: false, status, error: message } as VerifyError;
    }
}
