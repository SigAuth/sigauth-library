import { importJWK, JWTPayload, jwtVerify } from 'jose';
import type { JSONSerializable, SigAuthOptions, SigAuthUser, VerifyOutcome } from '../types';
import { PermissionBuilder } from './permission.builder';
import { ok } from 'assert';

export interface MinimalRequestLike {
    headers?: Record<string, string | string[] | undefined>;
    // Optional raw cookies string (e.g., from req.headers.cookie)
    cookieHeader?: string | null;
}

export class SigauthVerifier {
    private opts: SigAuthOptions;
    private user: SigAuthUser | null = null;

    // ---------- Refresh Token Handling
    private decodedAccessToken: JWTPayload | null = null;
    private refreshToken: string | null = null;
    private accessToken: string | null = null;
    private accessTokenExpires: number | null = null;

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

    private async initTokens(cookieHeader?: string | null): Promise<{ ok: boolean; status?: number; error?: string }> {
        if (!this.decodedAccessToken) {
            const cookies = this.parseCookies(cookieHeader);
            if (!cookies['accessToken'] || !cookies['refreshToken']) return { ok: false, status: 401, error: 'Missing tokens' };

            const jwksRes = await this.request('GET', `${this.opts.issuer}/.well-known/jwks.json`);
            const jwks = await jwksRes.json();
            const jwk = jwks.keys.find((k: any) => k.kid === 'sigauth');
            if (!jwk) return { ok: false, status: 401, error: 'JWK not found for token' };

            const publicKey = await importJWK(jwk, 'RS256');

            try {
                const { payload } = await jwtVerify(cookies['accessToken'], publicKey, {
                    audience: 'Express App',
                    issuer: this.opts.issuer,
                });
                this.refreshToken = cookies['refreshToken'];
                this.accessToken = cookies['accessToken'];
                this.decodedAccessToken = payload;
                this.accessTokenExpires = payload.exp as number;
            } catch (err) {
                console.error('Invalid access token signature:', err);
                return { ok: false, status: 401, error: 'Invalid access token' };
            }
        }
        return { ok: true };
    }

    async refreshOnDemand(
        req: MinimalRequestLike,
    ): Promise<{ ok: boolean; failed?: boolean; accessToken?: string; refreshToken?: string }> {
        if (!(await this.initTokens(req.cookieHeader)).ok) return { ok: false, failed: true };

        if (this.accessTokenExpires! - Date.now() / 1000 > 120) return { ok: false }; // skip if more than 2 minutes left

        const res = await this.request(
            'GET',
            `${this.opts.issuer}/api/auth/oidc/refresh?refreshToken=${this.refreshToken}&app-token=${this.opts.appToken}`,
        );

        const data = await res.json();
        if (!res.ok) {
            console.error('Error refreshing token: ', data);
            this.decodedAccessToken = null;
            await this.initTokens(`accessToken=; refreshToken=`);
            return { ok: false, failed: true };
        } else {
            // create cookie Header to parse new tokens
            this.decodedAccessToken = null;
            await this.initTokens(`accessToken=${data.accessToken}; refreshToken=${data.refreshToken}`);
            return { ok: true, ...data };
        }
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

        console.log('Access Token payload:', this.decodedAccessToken);
        return { ok: true, refreshToken: data.refreshToken, accessToken: data.accessToken };
    }

    async validateRequest(req: MinimalRequestLike): Promise<VerifyOutcome> {
        await this.initTokens(req.cookieHeader);

        if (!this.decodedAccessToken || !this.refreshToken) {
            return { ok: false, status: 307, error: `${this.opts.issuer}/auth/oidc?appId=${this.opts.appId}` };
        }

        if (!this.decodedAccessToken) {
            return { ok: false, status: 401, error: 'Invalid access token' };
        }

        this.user = {
            sub: this.decodedAccessToken.sub as string,
            email: this.decodedAccessToken.email as string | undefined,
            name: this.decodedAccessToken.name as string | undefined,
            roles: this.decodedAccessToken.roles as string[] | undefined,
        };

        return { ok: true, user: this.user };
    }

    async hasPermission(permissionBuilder: PermissionBuilder): Promise<boolean>;
    async hasPermission(permission: string): Promise<boolean>;
    async hasPermission(arg: PermissionBuilder | string): Promise<boolean> {
        if (arg instanceof PermissionBuilder) {
            return this.hasPermission(arg.build());
        }

        // arg ist always string
        const res = await this.request(
            'GET',
            `${this.opts.issuer}/api/auth/oidc/has-permission?permission=${arg}&appId=${this.opts.appId}&appToken=${this.opts.appToken}&accessToken=${this.accessToken}`,
        );
        const data = await res.text();
        return res.ok;
    }
}
