import http from 'http';
import { withSigAuth } from '../src/middleware/node';

const handler = withSigAuth(
    (req: any, res: http.ServerResponse) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, user: (req as any).user }));
    },
    {
        issuer: process.env.SIGAUTH_ISSUER || 'https://demo.sigauth.org',
        audience: process.env.SIGAUTH_AUDIENCE,
        appId: 2, // example appId
        appToken: '8VzHwVs6WkLI3hcvnSwNsn2TcmJeA4GHLWXaxDEZDjkHhY44BdkyPHaVvHZtpDYu', // example appToken
    },
);

const server = http.createServer(async (req, res) => {
    try {
        await (handler as any)(req, res);
    } catch (e: any) {
        const status = (e as any).status || 500;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: e?.message || 'error' }));
    }
});

server.listen(3002, () => console.log('Node example on http://localhost:3002'));
