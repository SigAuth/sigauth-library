import { SigauthVerifier } from '@/core/verifier';
import { SigAuthHandlerResponse, SigAuthOptions } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

export function sigauthNext(opts: SigAuthOptions) {
    const verifier = new SigauthVerifier(opts);
    const waiting: Map<string, string> = new Map();

    // Helper to manage cookies via headers
    const setAuthCookies = (res: NextApiResponse, access: string, refresh: string) => {
        const secure = opts.secureCookies ?? true;
        const cookies = [
            `accessToken=${access}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
            `refreshToken=${refresh}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
        ];
        res.setHeader('Set-Cookie', cookies);
    };

    const clearAuthCookies = (res: NextApiResponse) => {
        const secure = opts.secureCookies ?? true;
        const cookies = [
            `accessToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`,
            `refreshToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`,
        ];
        res.setHeader('Set-Cookie', cookies);
    };

    const getIp = (req: NextApiRequest) => {
        const forwarded = req.headers['x-forwarded-for'];
        return typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress || 'unknown';
    };

    return async function (req: NextApiRequest, res: NextApiResponse): Promise<SigAuthHandlerResponse> {
        const url = req.url || '';
        const path = url.split('?')[0];
        const ip = getIp(req);

        if (path.startsWith('/sigauth/oidc/auth')) {
            const code = req.query.code as string | undefined;
            const result = await verifier.resolveAuthCode(code || '');
            const mappedUrl = waiting.get(ip);
            waiting.delete(ip);

            if (result.ok) {
                setAuthCookies(res, result.accessToken, result.refreshToken);
                res.redirect(mappedUrl || '/');
            } else {
                res.status(401).json({ error: 'Failed to resolve auth code' });
            }
            return { closed: true, user: null, sigauth: verifier };
        }

        // Check if route needs authentication
        const isProtected = opts.authenticateRoutes.some(pattern => {
            const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
            return regex.test(path);
        });

        if (!isProtected) {
            return { closed: false, user: null, sigauth: verifier }; // Continue with request
        }

        return { closed: false, user: null, sigauth: verifier };
    };
}
