import { SIGAUTH_OPTIONS } from '@/utils/constants';
import { SigAuthNextWrapper } from '@sigauth/next';
import { NextApiRequest, NextApiResponse } from 'next';

export async function GET(req: NextApiRequest, res: NextApiResponse) {
    return await SigAuthNextWrapper.getInstance(SIGAUTH_OPTIONS).sigAuthExchange(req, res);
}
