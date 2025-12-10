import { SIGAUTH_OPTIONS } from '@/utils/constants';
import { SigAuthNextWrapper } from '@sigauth/next';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    // we pass the options again because this action could be called independently from the layout
    return await SigAuthNextWrapper.getInstance(SIGAUTH_OPTIONS).sigAuthExchange(req.url);
}
