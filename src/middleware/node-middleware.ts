import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { SigauthVerifier } from '../core/verifier';
import type { SigAuthOptions, SigAuthUser, VerifyOutcome } from '../types';

// A minimal request/response shape to keep this usable with custom servers as well
export interface NodeRequest extends IncomingMessage {
    user?: SigAuthUser;
    sigauth?: SigauthVerifier;
}

export interface NodeResponse extends ServerResponse {
    setHeader(name: string, value: number | string | readonly string[]): this;
}

/**
 * Helper: set a cookie header (append-friendly).
 */
function setCookie(
    res: NodeResponse,
    name: string,
    value: string,
    opts: { httpOnly?: boolean; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none'; maxAge?: number } = {},
) {
    if (res.headersSent) return; // do not modify headers after they are sent

    const attributes: string[] = [`${name}=${encodeURIComponent(value)}`];
    if (opts.httpOnly) attributes.push('HttpOnly');
    if (opts.secure) attributes.push('Secure');
    if (opts.sameSite) attributes.push(`SameSite=${opts.sameSite}`);
    if (typeof opts.maxAge === 'number') attributes.push(`Max-Age=${opts.maxAge}`);

    const cookie = attributes.join('; ');
    const existing = res.getHeader('Set-Cookie');

    if (!existing) {
        res.setHeader('Set-Cookie', cookie);
    } else if (Array.isArray(existing)) {
        res.setHeader('Set-Cookie', [...existing, cookie]);
    } else {
        res.setHeader('Set-Cookie', [existing.toString(), cookie]);
    }
}

/**
 * Helper: send JSON response (simple, no streaming).
 */
function sendJson(res: NodeResponse, status: number, body: unknown) {
    if (res.writableEnded) return;
    const data = Buffer.from(JSON.stringify(body));
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Length', data.length);
    res.end(data);
}

/**
 * Helper: redirect response.
 */
function redirect(res: NodeResponse, location: string, status: number = 307) {
    if (res.writableEnded) return;
    res.statusCode = status;
    res.setHeader('Location', location);
    res.end();
}

/**
 * Parse query from URL (node `IncomingMessage.url`).
 */
function getUrlAndQuery(req: IncomingMessage) {
    const fullUrl = req.url || '/';
    // `req.url` is path + query only; need a base
    const url = new URL(fullUrl, 'http://localhost');
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
        query[k] = v;
    });
    return { url, query };
}

/**
 * Middleware to use Sigauth in a generic Node.js server.
 * @returns Middleware function which returns a Promise<boolean> indicating if middleware handled the response.
 */
export function sigauthNode(opts: SigAuthOptions) {
    const verifier = new SigauthVerifier(opts);
    const waiting: Map<string, string> = new Map();

    return async function (req: NodeRequest, res: NodeResponse): Promise<boolean> {
        const { url, query } = getUrlAndQuery(req);

        // OIDC callback endpoint
        if (url.pathname.startsWith('/sigauth/oidc/auth')) {
            const code = query['code'] || '';
            const result = await verifier.resolveAuthCode(code);
            const ip = (req.socket && req.socket.remoteAddress) || 'unknown';
            const mappedUrl = waiting.get(ip);
            waiting.delete(ip);

            if (result.ok) {
                setCookie(res, 'accessToken', result.accessToken, {
                    httpOnly: true,
                    secure: opts.secureCookies ?? true,
                    sameSite: 'lax',
                });
                setCookie(res, 'refreshToken', result.refreshToken, {
                    httpOnly: true,
                    secure: opts.secureCookies ?? true,
                    sameSite: 'lax',
                });

                // debug: inspect headers right before redirect
                console.log('Set-Cookie header before redirect:', res.getHeader('Set-Cookie'));

                redirect(res, mappedUrl || '/');
                return true;
            } else {
                console.error(result);
                sendJson(res, 401, { error: 'Failed to resolve auth code' });
                return true;
            }
        }

        // Route filter (like express-middleware.ts)
        const path = url.pathname;
        const needsAuth = opts.authenticateRoutes.some(pattern => {
            const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
            return regex.test(path);
        });

        if (!needsAuth) {
            // no auth required for this route
            return false;
        }

        // Refresh on demand – keep like Express
        const refresh = await verifier.refreshOnDemand(req as any);

        if (refresh.ok) {
            setCookie(res, 'accessToken', refresh.accessToken!, {
                httpOnly: true,
                secure: opts.secureCookies ?? true,
                sameSite: 'lax',
            });
            setCookie(res, 'refreshToken', refresh.refreshToken!, {
                httpOnly: true,
                secure: opts.secureCookies ?? true,
                sameSite: 'lax',
            });
        }
        if (refresh.failed) {
            setCookie(res, 'accessToken', '', {
                httpOnly: true,
                secure: opts.secureCookies ?? true,
                sameSite: 'lax',
                maxAge: 0,
            });
            setCookie(res, 'refreshToken', '', {
                httpOnly: true,
                secure: opts.secureCookies ?? true,
                sameSite: 'lax',
                maxAge: 0,
            });
        }

        const outcome: VerifyOutcome = await verifier.validateRequest({
            headers: req.headers as Record<string, string | string[] | undefined>,
            cookieHeader: req.headers['cookie'] as string | undefined,
        });

        if (!outcome.ok) {
            setCookie(res, 'accessToken', '', {
                httpOnly: true,
                secure: opts.secureCookies ?? true,
                sameSite: 'lax',
                maxAge: 0,
            });
            setCookie(res, 'refreshToken', '', {
                httpOnly: true,
                secure: opts.secureCookies ?? true,
                sameSite: 'lax',
                maxAge: 0,
            });

            if (outcome.status === 307) {
                const ip = (req.socket && req.socket.remoteAddress) || 'unknown';
                waiting.set(ip, url.pathname + (url.search || ''));
                redirect(res, outcome.error, 307);
                return true;
            }

            sendJson(res, outcome.status, { error: outcome.error });
            return true;
        }

        req.sigauth = verifier;
        req.user = outcome.user;
        return false;
    };
}
