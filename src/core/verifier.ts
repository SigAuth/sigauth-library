import { decodeJwt, importJWK, jwtVerify } from 'jose';
import type { JSONSerializable, SigAuthOptions, SigAuthUser, VerifyOutcome } from '../types';

export interface MinimalRequestLike {
    headers?: Record<string, string | string[] | undefined>;
    // Optional raw cookies string (e.g., from req.headers.cookie)
    cookieHeader?: string | null;
}

export class SigauthVerifier {
    opts: SigAuthOptions;

    constructor(opts: SigAuthOptions) {
        this.opts = opts;
    }

    private async request(method: 'POST' | 'GET', url: string, jsonBody?: JSONSerializable): Promise<Response> {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // ensure cookies are sent with request
            body: JSON.stringify(jsonBody),
        });
        if (!res.ok) console.error('Request failed: ', res.status);
        return res;
    }

    private parseCookies(cookieHeader?: string | null): Record<string, string> {
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

    async resolveAuthCode(code: string): Promise<{ ok: boolean; refreshToken: string; accessToken: string }> {
        const res = await this.request('GET', `${this.opts.issuer}/api/auth/oidc/exchange?code=${code}&app-token=${this.opts.appToken}`);
        const data = await res.json();

        if (!res.ok) {
            console.error('Error resolving auth code: ', data);
            return { ok: false, refreshToken: '', accessToken: '' };
        }

        // JWKS laden
        const jwksRes = await this.request('GET', `${this.opts.issuer}/.well-known/jwks.json`);
        const jwks = await jwksRes.json();
        const jwk = jwks.keys.find((k: any) => k.kid === 'sigauth');
        if (!jwk) throw new Error('JWK with kid "sigauth" not found');

        const publicKey = await importJWK(jwk, 'RS256');

        // Access Token prüfen
        try {
            const { payload } = await jwtVerify(data.accessToken, publicKey, { audience: 'Express App', issuer: this.opts.issuer });
            console.log('Access Token payload:', payload);
        } catch (err) {
            console.error('Invalid Access Token signature:', err);
            return { ok: false, refreshToken: '', accessToken: '' };
        }

        return { ok: true, refreshToken: data.refreshToken, accessToken: data.accessToken };
    }

    async validateRequest(req: MinimalRequestLike): Promise<VerifyOutcome> {
        const cookies = this.parseCookies(req.cookieHeader);

        if (!cookies['accessToken'] || !cookies['refreshToken']) {
            return { ok: false, status: 307, error: `${this.opts.issuer}/auth/oidc?appId=${this.opts.appId}` };
        }

        const decoded = decodeJwt(cookies['accessToken']) as any;

        const jwksRes = await this.request('GET', `${this.opts.issuer}/.well-known/jwks.json`);
        const jwks = await jwksRes.json();
        const jwk = jwks.keys.find((k: any) => k.kid === 'sigauth');
        if (!jwk) return { ok: false, status: 401, error: 'JWK not found for token' };

        const publicKey = await importJWK(jwk, 'RS256');

        try {
            const { payload } = await jwtVerify(cookies['accessToken'], publicKey, { audience: 'Express App', issuer: this.opts.issuer });
            const user: SigAuthUser = {
                sub: payload.sub as string,
                email: payload.email as string | undefined,
                name: payload.name as string | undefined,
                roles: payload.roles as string[] | undefined,
            };
            return { ok: true, user };
        } catch (err) {
            return { ok: false, status: 401, error: 'Invalid access token' };
        }
    }
}
