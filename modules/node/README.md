# @sigauth/node

Node.js HTTP server integration for SigAuth, allowing you to add authentication and authorization to raw Node.js HTTP servers without a framework.

## Usage

Wrap your request handler or use the provided middleware function.

```typescript
import { createServer } from 'http';
import { sigauthNode } from '@sigauth/node';

const authMiddleware = sigauthNode({
    authUrl: 'https://auth.example.com',
    clientId: 'your-client-id',
    authenticateRoutes: ['/protected/*'],
    // ... other options
});

const server = createServer(async (req, res) => {
    // Run the auth middleware
    const authResult = await authMiddleware(req, res);

    // If the middleware handled the response (e.g., redirect or error), stop here
    if (authResult.closed) return;

    // Access user data if authenticated
    if (authResult.user) {
        console.log('User:', authResult.user);
    }

    // Your application logic
    if (req.url === '/protected/resource') {
        res.end('Protected Content');
    } else {
        res.end('Public Content');
    }
});

server.listen(3000);
```

## Features

- **Framework Agnostic**: Works with the standard Node.js `http` module.
- **Cookie Management**: Helper functions to set and manage authentication cookies.
- **Route Protection**: Configurable route protection patterns.
- **OIDC Support**: Handles the authentication flow and token exchange.
