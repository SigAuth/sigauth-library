// Example Express app using the middleware locally with pnpm/yarn/npm link or workspace
import express, { Request } from 'express';
import { PermissionBuilder, sigauthExpress, SigAuthOptions, SigauthVerifier } from '@sigauth/express';

const app = express();

const opts = {
    issuer: 'http://localhost:5173', // SigAuth instance url
    audience: 'TestB', // make sure this matches the audience configured in the SigAuth OIDC app
    appId: 3, // example appId
    appToken: 'IsDJoI2VHYzj6xMTI8IoG5KZ9OP5Xeszv3kW3RpVEgP9TIlYaEbt751q68raf79X', // example appToken
    authenticateRoutes: ['/protected/*', '/protected'],
    secureCookies: false, // for local testing without HTTPS
} as SigAuthOptions;

app.use(sigauthExpress(opts));

app.get('/protected', (req: Express.Request, res: any) => {
    res.json({ ok: true, user: req.sigauth });
});

app.get('/protected/blog/:id', async (req: Request<{ id: string }>, res: any) => {
    const hasPermission = await req.sigauth.hasPermission(new PermissionBuilder('asset', 2).withAssetId(+req.params.id).withContainerId(2));
    res.json({ ok: true, hasPermission, id: req.params.id });
});

app.get('/protected/user/info', async (req: Express.Request, res: any) => {
    // getUserInfo works because it is behind a route which is included in authenticateRoutes
    const userInfo = await req.sigauth.getUserInfo();
    res.json({ ok: true, userInfo });
});

app.get('/info', async (req: Express.Request, res: any) => {
    // create a verifier instance because req.sigauth is not available outside authenticateRoutes
    const sigAuth = new SigauthVerifier(opts);
    const appInfo = await sigAuth.getAppInfo();
    res.json({ ok: true, appInfo });
});

app.get('/sigauth-config.json', (req, res) => {
    res.json({
        asset: ['Read', 'Write', 'Delete'],
        container: ['Contributor'],
        root: ['Admin', 'Member'],
    });
});

app.get('/', (req, res) => {
    res.json({ ok: true, message: 'Public route' });
});

app.listen(3001, () => console.log('Express example on http://localhost:3001'));
