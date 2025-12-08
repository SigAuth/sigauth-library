'use server';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SigAuthNextWrapper, SigAuthOptions } from '@sigauth/next';
import { SIGAUTH_OPTIONS } from '@/utils/constants';

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    SigAuthNextWrapper.getInstance(SIGAUTH_OPTIONS); // initialize SigAuth wrapper

    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
