// Example Express app using the middleware locally with pnpm/yarn/npm link or workspace
import express from 'express';
import { sigAuthExpress } from '../src/middleware/express-middleware';

const app = express();

app.use(
    sigAuthExpress({
        issuer: process.env.SIGAUTH_ISSUER || 'https://auth.example.com',
        audience: process.env.SIGAUTH_AUDIENCE,
    })
);

app.get('/protected', (req: any, res: any) => {
    res.json({ ok: true, user: req.user });
});

app.listen(3001, () => console.log('Express example on http://localhost:3001'));
