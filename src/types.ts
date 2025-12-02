import { JWTPayload } from 'jose';

export interface SigAuthOptions {
    // Expected issuer (e.g. https://auth.yourdomain.com)
    issuer: string;
    // Security token for the application provided by the issuer
    appToken: string;
    // appId of the application provided by the issuer
    appId: number;
    // Expected audience(s) in aud claim
    audience?: string | string[];
    // Optional explicit JWKS URI. Defaults to `${issuer}/.well-known/jwks.json`
    jwksUri?: string;
    // Authorization header name (defaults to Authorization)
    tokenHeader?: string;
    // Cookie name to look for if header is missing (defaults to sigauth_token)
    tokenCookie?: string;
    // Limit accepted algorithms (e.g. ['RS256'])
    algorithms?: Array<'RS256' | 'RS384' | 'RS512' | 'PS256' | 'PS384' | 'PS512' | 'ES256' | 'ES256K' | 'ES384' | 'ES512' | 'EdDSA'>;
    // Clock tolerance in seconds (default 5s)
    leewaySeconds?: number;
    // Custom token extractor; return the raw token string or null if none
    getToken?: (req: unknown) => string | null;
    // List of routes that require authentication
    authenticateRoutes: string[];
    // Automatic token refresh threshold in seconds (default 120s)
    refreshThresholdSeconds?: number;
}

export type JSONSerializable = string | number | boolean | null | { [key: string]: JSONSerializable } | JSONSerializable[];

export interface SigAuthUser extends JWTPayload {
    sub: string;
    email?: string;
    name?: string;
    roles?: string[];
}

export interface VerifyResult {
    ok: true;
    user: SigAuthUser;
}

export interface VerifyError {
    ok: false;
    status: number; // HTTP friendly code (e.g. 401, 403, 400)
    error: string;
}

export type VerifyOutcome = VerifyResult | VerifyError;
