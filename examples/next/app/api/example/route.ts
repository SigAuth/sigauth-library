import { SIGAUTH_OPTIONS } from '@/utils/constants';
import { SigAuthNextWrapper } from '@sigauth/next';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const result = await SigAuthNextWrapper.getInstance(SIGAUTH_OPTIONS).checkAuthentication('/api/example');
    if (result.user) {
        return NextResponse.json({ message: `Hello, ${result.user.name}! You are authenticated.` });
    } else {
        return NextResponse.json({ message: 'Hello, guest! You are not authenticated.' }, { status: 401 });
    }
}
