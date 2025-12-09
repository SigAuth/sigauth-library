'use server';

import { SIGAUTH_OPTIONS } from '@/utils/constants';
import { SigAuthNextWrapper } from '@sigauth/next';

export default async function checkAuth() {
    // we pass the options again because this action could be called independently from the layout
    return await SigAuthNextWrapper.getInstance(SIGAUTH_OPTIONS).checkAuthenticationFromServer();
}
