# @sigauth/express

Express middleware integration for SigAuth, enabling easy authentication and authorization in your Express applications.

## Usage

Register the middleware in your Express application.

```typescript
import express from 'express';
import { sigauthExpress } from '@sigauth/express';

const app = express();

app.use(
    sigauthExpress({
        authUrl: 'https://auth.example.com',
        clientId: 'your-client-id',
        authenticateRoutes: ['/protected/*'],
        // ... other options
    }),
);

app.get('/protected/resource', (req, res) => {
    // Access user information
    console.log(req.user);
    res.send(`Hello, ${req.user.sub}`);
});

app.listen(3000);
```

## Features

- **Automatic Authentication**: Intercepts requests to protected routes and redirects to the auth provider if necessary.
- **Token Management**: Handles access and refresh tokens via cookies.
- **Request Augmentation**: Adds `req.user` and `req.sigauth` to the Express request object for easy access to user data and verifier methods.
- **OIDC Callback Handling**: Automatically handles the OIDC callback route (`/sigauth/oidc/auth`).
