// Example Express app using the middleware locally with pnpm/yarn/npm link or workspace
import express, { Request } from 'express';
import { PermissionBuilder } from '../src/core/permission.builder';
import { sigAuthExpress } from '../src/middleware/express-middleware';

const app = express();

app.use(
    sigAuthExpress({
        issuer: process.env.SIGAUTH_ISSUER || 'http://localhost:4000',
        audience: process.env.SIGAUTH_AUDIENCE || 'express-app',
        appId: 2, // example appId
        appToken: 'EOQ0xCGu5ZS8q04RGNPAZ7QqoTnmr0Z5NJ2wZslleehV8Gx1pgGKVByN00DXHcsK', // example appToken
        authenticateRoutes: ['/protected/*', '/protected'],
    }),
);

app.get('/protected', (req: Express.Request, res: any) => {
    res.json({ ok: true, user: req.sigauth });
});

app.get('/protected/:id', (req: Request<{ id: string }>, res: any) => {
    const hasPermission = req.sigauth.hasPermission(new PermissionBuilder('view', 2).withAssetId(+req.params.id).withContainerId(2));
    res.json({ ok: true, hasPermission, id: req.params.id });
});

app.get('/', (req, res) => {
    res.json({ ok: true, message: 'Public route' });
});

app.listen(3001, () => console.log('Express example on http://localhost:3001'));
