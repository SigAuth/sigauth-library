import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { SigAuthOptions, SigAuthUser, VerifyError, VerifyOutcome, VerifyResult } from '../types';

export interface MinimalRequestLike {
    headers?: Record<string, string | string[] | undefined>;
    // Optional raw cookies string (e.g., from req.headers.cookie)
    cookieHeader?: string | null;
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

export async function validateSigAuthRequest(req: MinimalRequestLike, opts: SigAuthOptions): Promise<VerifyOutcome> {
    const cookies = parseCookies(req.cookieHeader);
    console.log(req, opts, cookies);
    return { ok: true, user: {} as any, token: '' };
}
