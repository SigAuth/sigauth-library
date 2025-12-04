import { SigauthVerifier } from '@/core/verifier';
import { SigAuthHandlerResponse, SigAuthOptions } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Singleton wrapper to use SigauthVerifier within Next.js applications
 * Supports both API routes and server components
 * Make sure to always provide the options if you don't can't guarantee the singleton has been initialized
 */
export class SigAuthNextWrapper {
    private static instance: SigAuthNextWrapper | null = null;
    verifier: SigauthVerifier;

    private constructor(opts: SigAuthOptions) {
        this.verifier = new SigauthVerifier(opts);
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
    async handleApiEnvironment(req: NextApiRequest, res: NextApiResponse): Promise<SigAuthHandlerResponse> {
        return this.handle(
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
            req.url || '',
            (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
        );
    }

    /**
     * Use this method authenticate the user within a server componenet
     */
    async handleServerEnvironment(): Promise<SigAuthHandlerResponse> {
        return this.handle(
            async (name, value, options) => {
                const cookieStore = await cookies();
                cookieStore.set(name, value, options);
            },
            redirect,
            '',
            '',
        ); // URL and IP are not available in server components because they run on the server
    }

    private async handle(
        setCookie: (name: string, value: string, options?: any) => void,
        redirect: (url: string) => void,
        url: string,
        ip: string,
    ): Promise<SigAuthHandlerResponse> {
        return { closed: false, user: null, sigauth: this.verifier };
    }
}
