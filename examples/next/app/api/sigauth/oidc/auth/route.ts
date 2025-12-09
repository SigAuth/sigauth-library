import { SIGAUTH_OPTIONS } from '@/utils/constants';
import { SigAuthNextWrapper } from '@sigauth/next';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    return await SigAuthNextWrapper.getInstance(SIGAUTH_OPTIONS).sigAuthExchange(req.url);
}
