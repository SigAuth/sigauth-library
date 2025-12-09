import { importJWK, JWTPayload, jwtVerify } from 'jose';
import { PermissionBuilder } from './permission.builder';
import { JSONSerializable, SigAuthOptions, SigAuthUser, VerifyOutcome } from '../types';
import { AppInfo } from '@sigauth/generics/json-types';

export interface MinimalRequestLike {
    headers?: Record<string, string | string[] | undefined>;
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

    private async initTokens(req: MinimalRequestLike): Promise<{ ok: boolean; status?: number; error?: string }> {
        if (!this.decodedAccessToken) {
            const raw = req.headers?.cookie;

            const cookieString = Array.isArray(raw) ? raw.join('; ') : raw || '';
            const cookies = this.parseCookies(cookieString);
            if (!cookies['accessToken'] || !cookies['refreshToken']) return { ok: true, status: 401, error: 'Missing tokens' };

            const jwksRes = await this.request('GET', `${this.opts.issuer}/.well-known/jwks.json`);
            const jwks = await jwksRes.json();
            const jwk = jwks.keys.find((k: any) => k.kid === 'sigauth');
            if (!jwk) return { ok: false, status: 401, error: 'JWK not found for token' };

            const publicKey = await importJWK(jwk, 'RS256');

            try {
                const { payload } = await jwtVerify(cookies['accessToken'], publicKey, {
                    audience: this.opts.audience,
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
        if (!(await this.initTokens(req)).ok) return { ok: false, failed: true };
        if (!this.accessToken || !this.refreshToken) return { ok: false, failed: false }; // no tokens available
        if (this.accessTokenExpires! - Date.now() / 1000 > (this.opts.refreshThresholdSeconds ?? 120)) return { ok: false }; // skip if more than 2 minutes left

        const res = await this.request(
            'GET',
            `${this.opts.issuer}/api/auth/oidc/refresh?refreshToken=${this.refreshToken}&app-token=${this.opts.appToken}`,
        );

        const data = await res.json();
        if (!res.ok) {
            console.error('Error refreshing token: ', data);
            this.decodedAccessToken = null;
            await this.initTokens({ headers: { cookie: `accessToken=; refreshToken=` } });
            return { ok: false, failed: true };
        } else {
            // create cookie Header to parse new tokens
            this.decodedAccessToken = null;
            await this.initTokens({ headers: { cookie: `accessToken=${data.accessToken}; refreshToken=${data.refreshToken}` } });
            return { ok: true, ...data };
        }
    }

    async resolveAuthCode(code: string, redirectUri: string): Promise<{ ok: boolean; refreshToken: string; accessToken: string }> {
        const res = await this.request(
            'GET',
            `${this.opts.issuer}/api/auth/oidc/exchange?code=${code}&app-token=${this.opts.appToken}&redirect-uri=${redirectUri}`,
        );
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
            await jwtVerify(data.accessToken, publicKey, { audience: this.opts.audience, issuer: this.opts.issuer });
        } catch (err: any) {
            console.error('Invalid Access Token signature:', err.message, err.payload);
            return { ok: false, refreshToken: '', accessToken: '' };
        }

        return { ok: true, refreshToken: data.refreshToken, accessToken: data.accessToken };
    }

    async validateRequest(req: MinimalRequestLike, redirectUri: string): Promise<VerifyOutcome> {
        await this.initTokens(req);

        if (!this.decodedAccessToken || !this.refreshToken) {
            return { ok: false, status: 307, error: `${this.opts.issuer}/auth/oidc?appId=${this.opts.appId}&redirectUri=${redirectUri}` };
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

    /**
     * This method only works within an authenticated context (i.e. after validateRequest has been called)
     *
     * @returns Whether the user has the specified permission
     */
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

    /**
     * This method only works within an authenticated context (i.e. after validateRequest has been called)
     *
     * @returns All assets, containers etc that the user is allowed to see
     */
    async getUserInfo() {
        if (!this.accessToken) {
            throw new Error('No access token available');
        }

        const res = await this.request(
            'GET',
            `${this.opts.issuer}/api/auth/oidc/user-info?accessToken=${this.accessToken}&appToken=${this.opts.appToken}`,
        );
        const data = await res.json();
        if (!res.ok) {
            console.error('Error fetching user info: ', data);
            return undefined;
        }

        return data;
    }

    /**
     *
     * @returns All assets, containers and accounts that are related to the app
     */
    async getAppInfo() {
        const res = await this.request('GET', `${this.opts.issuer}/api/app/info?appToken=${this.opts.appToken}`);
        const data = await res.json();
        if (!res.ok) {
            console.error('Error fetching app info: ', data);
            return undefined;
        }

        return data as AppInfo;
    }
}
