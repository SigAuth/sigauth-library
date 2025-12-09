import { SigAuthNextWrapper } from '@sigauth/next';
import Image from 'next/image';

export default async function Home() {
    const appInfo = await SigAuthNextWrapper.getInstance().verifier.getAppInfo();
    console.log('App Info:', appInfo);

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
                <div className="flex gap-2">
                    <Image className="dark:invert" src="/next.svg" alt="Next.js logo" width={100} height={20} priority />
                    <p> + SigAuth</p>
                </div>
                <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
                    <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
                        Welcome to the SigAuth + Next.js example!
                    </h1>
                    <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                        Check out the code to see how to integrate SigAuth into your Next.js application.
                    </p>

                    <a href="/protected/2">Get Started</a>

                    <h3>Assetes</h3>
                </div>
                <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
                    <a
                        className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
                        href="https://docs.sigauth.org"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Documentation
                    </a>
                </div>
            </main>
        </div>
    );
}
