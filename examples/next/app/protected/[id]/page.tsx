// app/protected/page.tsx
import { PermissionBuilder } from '@sigauth/next';
import checkAuth from './checkAuth';
import { SIGAUTH_OPTIONS } from '@/utils/constants';
import { headers } from 'next/headers';

export default async function Page({ params }: { params: Promise<{ id: number }> }) {
    const result = await checkAuth();
    const { id } = await params;

    const hasPermission = await result.sigauth?.hasPermission(
        new PermissionBuilder('view', SIGAUTH_OPTIONS.appId).withAssetId(id).withContainerId(2).build(),
    );

    const userInfo = await result.sigauth?.getUserInfo();
    console.log('User Info:', userInfo);

    return (
        <main className="w-screen h-screen flex flex-col gap-2 justify-center items-center">
            <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
                Hello {result.user?.name}!
            </h1>
            {hasPermission ? (
                <p>You have permission to view this protected resource.</p>
            ) : (
                <p>You do NOT have permission to view this protected resource.</p>
            )}
        </main>
    );
}
