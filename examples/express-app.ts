// Example Express app using the middleware locally with pnpm/yarn/npm link or workspace
import express from 'express';
import { sigAuthExpress } from '../src/middleware/express-middleware';

const app = express();

app.use(
    sigAuthExpress({
        issuer: process.env.SIGAUTH_ISSUER || 'http://localhost:4000',
        audience: process.env.SIGAUTH_AUDIENCE || 'express-app',
        appId: 2, // example appId
        appToken: '8VzHwVs6WkLI3hcvnSwNsn2TcmJeA4GHLWXaxDEZDjkHhY44BdkyPHaVvHZtpDYu', // example appToken
    }),
);

app.get('/protected', (req: any, res: any) => {
    res.json({ ok: true, user: req.user });
});

app.listen(3001, () => console.log('Express example on http://localhost:3001'));
