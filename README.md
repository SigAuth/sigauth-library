# SigAuth Library

Simple middleware/utilities to verify SigAuth-issued JWTs in Node.js environments.

-   Framework-agnostic verifier (`verifyRequest`, `withSigAuth`)
-   Express middleware (`sigAuthExpress`)

## Install

Add as a dependency to your app once published:

```sh
pnpm add @sigauth/library
```

For local development of this package, see the Testing locally section.

## Usage

### Express

```ts
import express from 'express';
import { sigAuthExpress } from '@sigauth/library';

const app = express();
app.use(
    sigAuthExpress({
        issuer: process.env.SIGAUTH_ISSUER!,
        audience: process.env.SIGAUTH_AUDIENCE,
    })
);

app.get('/protected', (req, res) => {
    res.json({ user: req.user });
});
```

### Node (no framework)

```ts
import http from 'http';
import { withSigAuth } from '@sigauth/library';

const handler = withSigAuth(
    (req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ user: (req as any).user }));
    },
    {
        issuer: process.env.SIGAUTH_ISSUER!,
        audience: process.env.SIGAUTH_AUDIENCE,
    }
);

http.createServer(handler).listen(3000);
```

## Options

-   issuer: string (required)
-   audience: string | string[] (optional)
-   jwksUri: string (optional, defaults to `${issuer}/.well-known/jwks.json`)
-   tokenHeader: string (default: "Authorization")
-   tokenCookie: string (default: "sigauth_token")
-   algorithms: string[] (optional)
-   leewaySeconds: number (default: 5)
-   getToken(req): custom extractor

## Testing locally

Without publishing, you can:

1. Build this package:

```sh
pnpm build
```

2. Use `pnpm link --global` here and `pnpm link --global @sigauth/library` in a sample app; or
3. Use `pnpm pack` to produce a tarball and install it in a sample app: `pnpm add file:./dist.tar.gz`
4. Alternatively, run the included examples directly:

```sh
# Express example
pnpm exec ts-node examples/express-app.ts

# Node http example
pnpm exec ts-node examples/node-server.ts
```

Set environment variables before running:

```sh
$env:SIGAUTH_ISSUER = "https://auth.example.com"
$env:SIGAUTH_AUDIENCE = "my-api"
```

## License

MIT
