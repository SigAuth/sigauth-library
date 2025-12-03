import http from 'http';
import { NodeRequest, NodeResponse, sigauthNode } from '../src/middleware/node-middleware';

const handler = sigauthNode({
    issuer: 'http://localhost:5173',
    audience: 'Node App',
    appId: 3, // example appId
    appToken: 'RhapPkDjigFdc4WXFmUlUQG9HdAYqWvNI7i9lFzsYRR2F0fZaQ7J9FsOW2odjWag', // example appToken
    authenticateRoutes: ['/protected/*'],
    secureCookies: false, // for local testing without HTTPS
});

const server = http.createServer(async (req: NodeRequest, res: NodeResponse) => {
    try {
        const failed = await handler(req, res);
        if (failed) return;
    } catch (e: any) {
        const status = (e as any).status || 500;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: e?.message || 'error' }));
    }

    if (!req.url?.startsWith('/protected')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Unprotected Route' }));
    } else {
        const user = req.user;

        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Protected Route', user }));
    }
});

server.listen(3002, () => console.log('Node example on http://localhost:3002'));
