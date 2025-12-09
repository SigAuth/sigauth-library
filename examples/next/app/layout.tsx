'use server';

import './globals.css';
import { SigAuthNextWrapper, SigAuthOptions } from '@sigauth/next';
import { SIGAUTH_OPTIONS } from '@/utils/constants';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    SigAuthNextWrapper.getInstance(SIGAUTH_OPTIONS); // initialize SigAuth wrapper

    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
