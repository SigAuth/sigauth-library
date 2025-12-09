import { SigAuthHandlerResponse, SigAuthOptions, SigauthVerifier } from '@sigauth/core';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

/**
 * Singleton wrapper to use SigauthVerifier within Next.js applications
 * Supports both API routes and server components
 * Make sure to always provide the options if you don't can't guarantee the singleton has been initialized
 */
export class SigAuthNextWrapper {
    private static instance: SigAuthNextWrapper | null = null;
    verifier: SigauthVerifier;
    opts: SigAuthOptions;

    private constructor(opts: SigAuthOptions) {
        this.verifier = new SigauthVerifier(opts);
        this.opts = opts;
    }

    static getInstance(opts?: SigAuthOptions): SigAuthNextWrapper {
        if (!this.instance) {
            if (!opts) throw new Error('SigAuthNextWrapper not initialized. Please provide options on first getInstance call.');
            this.instance = new SigAuthNextWrapper(opts);
        }
        return this.instance;
    }

    /**
     * Use this method to authenticate the user within an API route
     */
    async checkAuthenticationFromApi(req: NextApiRequest, res: NextApiResponse): Promise<SigAuthHandlerResponse> {
        return this.checkAuthentication(
            (name, value, options) => {
                res.setHeader(
                    'Set-Cookie',
                    `${name}=${value}; Path=/; HttpOnly${options?.secure ? '; Secure' : ''}${
                        options?.maxAge ? `; Max-Age=${options.maxAge}` : ''
                    }`,
                );
            },
            (url: string) => {
                res.writeHead(302, { location: url });
                res.end();
            },
            req.headers,
            req.url || '',
            (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
        );
    }

    /**
     * Use this method authenticate the user within a server componenet
     */
    async checkAuthenticationFromServer(): Promise<SigAuthHandlerResponse> {
        const headerList = await headers();
        const headerRecord: Record<string, string | string[] | undefined> = {};

        for (const [key, value] of headerList.entries()) {
            if (headerRecord[key]) {
                // Wenn schon vorhanden, als Array speichern
                if (Array.isArray(headerRecord[key])) {
                    (headerRecord[key] as string[]).push(value);
                } else {
                    headerRecord[key] = [headerRecord[key] as string, value];
                }
            } else {
                headerRecord[key] = value;
            }
        }

        const h = await headers();
        const path = h.get('referer');
        const host = h.get('host');
        const url = `${path?.split(host || '')[1]}`;

        return this.checkAuthentication(
            async (name, value, options) => {
                const cookieStore = await cookies();
                cookieStore.set(name, value, options);
            },
            redirect,
            headerRecord,
            url,
            '',
        ); // URL and IP are not available in server components because they run on the server
    }

    private async checkAuthentication(
        setCookie: (name: string, value: string, options?: any) => void,
        redirect: (url: string) => void,
        headers: Record<string, string | string[] | undefined>,
        url: string,
        ip: string,
    ): Promise<SigAuthHandlerResponse> {
        // assume this route from where this is called needs authentication
        const refresh = await this.verifier.refreshOnDemand({ headers });
        if (refresh.ok) {
            console.log('Setting refreshed tokens in cookies');
            setCookie('accessToken', refresh.accessToken!, {
                httpOnly: true,
                secure: this.opts.secureCookies ?? true,
                sameSite: 'lax',
                path: '/',
            });
            setCookie('refreshToken', refresh.refreshToken!, {
                httpOnly: true,
                secure: this.opts.secureCookies ?? true,
                sameSite: 'lax',
                path: '/',
            });
        }
        if (refresh.failed) {
            console.log('Clearing tokens from cookies due to failed refresh');
            setCookie('accessToken', '', {
                httpOnly: true,
                secure: this.opts.secureCookies ?? true,
                sameSite: 'lax',
                maxAge: 0,
                path: '/',
            });
            setCookie('refreshToken', '', {
                httpOnly: true,
                secure: this.opts.secureCookies ?? true,
                sameSite: 'lax',
                maxAge: 0,
                path: '/',
            });
        }

        const outcome = await this.verifier.validateRequest({ headers }, url);
        if (!outcome.ok) {
            if (outcome.status === 307) {
                redirect(outcome.error);
                return { closed: true, user: null, sigauth: this.verifier };
            }
        }

        if (outcome.ok) {
            return { closed: false, user: outcome.user, sigauth: this.verifier };
        }

        console.error(`Authentication failed: ${outcome.error}`);
        return { closed: false, user: null, sigauth: this.verifier };
    }

    public async sigAuthExchange(url: string): Promise<Response> {
        const { searchParams } = new URL(url);
        const code = searchParams.get('code') || '';
        const redirectUri = searchParams.get('redirectUri') || '';

        const result = await this.verifier.resolveAuthCode(code, redirectUri);

        if (!result.ok) {
            return Response.json({ error: 'Failed to resolve auth code' }, { status: 401 });
        }

        return new Response(null, {
            status: 302,
            headers: {
                'Set-Cookie': [
                    `accessToken=${result.accessToken}; Path=/; HttpOnly; SameSite=Lax`,
                    `refreshToken=${result.refreshToken}; Path=/; HttpOnly; SameSite=Lax`,
                ].join(', '),
                Location: redirectUri,
            },
        });
    }
}
