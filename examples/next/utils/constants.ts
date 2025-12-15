import { SigAuthOptions } from '@sigauth/next';

export const SIGAUTH_OPTIONS: SigAuthOptions = {
    issuer: 'http://localhost:5173',
    audience: 'TestC',
    appId: 4,
    appToken: 'hg0EO2SGgTI2PtMfWeMMKAGymcQ0cSEQKluWbVDSMHg6GlmLwEBEUEqYBdEEnnjD',
    // authenticatedRoutes have no affect in Next.js apps since all route protection is handled manually
};
