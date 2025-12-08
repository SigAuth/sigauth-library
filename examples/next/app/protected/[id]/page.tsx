// app/protected/page.tsx
import checkAuth from './checkAuth';

export default async function Page() {
    const result = await checkAuth();
    console.log(result.user?.name);

    return <main className="w-screen h-screen flex justify-center items-center">This is a protected route</main>;
}
