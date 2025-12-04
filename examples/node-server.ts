import http from 'http';
import { NodeRequest, NodeResponse, sigauthNode } from '../src/middleware/node-middleware';
import { PermissionBuilder } from '../src/core/permission.builder';

const handler = sigauthNode({
    issuer: 'http://localhost:5173',
    audience: 'Node App',
    appId: 3, // example appId
    appToken: 'RhapPkDjigFdc4WXFmUlUQG9HdAYqWvNI7i9lFzsYRR2F0fZaQ7J9FsOW2odjWag', // example appToken
    authenticateRoutes: ['/protected/*'],
    secureCookies: false, // for local testing without HTTPS
});

const server = http.createServer(async (req: NodeRequest, res: NodeResponse) => {
    const failed = await handler(req, res);
    if (failed) return;

    if (!req.url?.startsWith('/protected')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Unprotected Route' }));
    } else {
        const user = req.user;

        const hasReadPermission = await req.sigauth?.hasPermission(
            new PermissionBuilder('read', 3).withAssetId(10).withContainerId(5).build(),
        );
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Protected Route', user }));
    }
});

server.listen(3002, () => console.log('Node example on http://localhost:3002'));
