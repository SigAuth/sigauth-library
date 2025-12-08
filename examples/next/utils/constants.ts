import { SigAuthOptions } from '@sigauth/next';

export const SIGAUTH_OPTIONS: SigAuthOptions = {
    issuer: 'http://localhost:5173',
    audience: 'Next App',
    appId: 4,
    appToken: 'CKuHJEsQaEf9U6abBLuDfFG03rZRMLlDQuLMm7GbCRhdOIFmX2xCIpM7XtWTighC',
    // authenticatedRoutes have no affect in Next.js apps since all route protection is handled manually
};
