'use server';

import { SIGAUTH_OPTIONS } from '@/utils/constants';
import { SigAuthNextWrapper } from '@sigauth/next';

export default async function checkAuth() {
    return await SigAuthNextWrapper.getInstance(SIGAUTH_OPTIONS).checkAuthenticationFromServer();
}
