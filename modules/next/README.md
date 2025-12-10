# @sigauth/next

SigAuth integration for Next.js applications. This package provides a wrapper around `@sigauth/core` to simplify authentication and authorization in Next.js Server Components, API Routes, and Middleware.

## Configuration

First, define your SigAuth options. It is recommended to do this in a shared constants file or a configuration module.

```typescript
// utils/constants.ts
import { SigAuthOptions } from '@sigauth/core';

export const SIGAUTH_OPTIONS: SigAuthOptions = {
    appId: 'your-app-id',
    authServerUrl: 'https://auth.yourdomain.com',
    clientId: 'your-client-id',
    // ... other options
};
```

## Usage

### Initialization

The `SigAuthNextWrapper` is a singleton. You should initialize it once, typically in a helper function or when you first use it.

```typescript
// lib/auth.ts
import { SigAuthNextWrapper } from '@sigauth/next';
import { SIGAUTH_OPTIONS } from '@/utils/constants';

export async function checkAuth() {
    // Initialize on first use if not already done
    return await SigAuthNextWrapper.getInstance(SIGAUTH_OPTIONS).checkAuthenticationFromServer();
}
```

### Server Components (App Router)

Protect your Server Components by calling the check function. This will handle token validation, refreshing, and redirection to the login page if necessary.

```typescript
// app/protected/page.tsx
import { checkAuth } from '@/lib/auth'; // Your helper
import { PermissionBuilder } from '@sigauth/next';

export default async function ProtectedPage() {
    const { user, sigauth } = await checkAuth();

    // Check permissions
    const hasPermission = await sigauth?.hasPermission(
        new PermissionBuilder('view', 'your-app-id').withAssetId(123).build()
    );

    return (
        <div>
            <h1>Welcome, {user?.name}</h1>
            {hasPermission && <p>You can view this content.</p>}
        </div>
    );
}
```

### Auth Callback Route (App Router)

Set up a route handler to handle the OIDC callback code exchange.

```typescript
// app/api/auth/callback/route.ts
import { SigAuthNextWrapper } from '@sigauth/next';
import { SIGAUTH_OPTIONS } from '@/utils/constants';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const wrapper = SigAuthNextWrapper.getInstance(SIGAUTH_OPTIONS);
    return wrapper.sigAuthExchange(request.url);
}
```

## API

### `SigAuthNextWrapper`

- `static getInstance(opts?: SigAuthOptions)`: Returns the singleton instance. Options are required on the first call.
- `checkAuthenticationFromServer()`: Authenticates in Server Components. Handles redirects and cookie setting (via `next/headers` and `next/cookies`).
- `checkAuthenticationFromApi(req, res)`: Authenticates in Pages Router API routes.
- `sigAuthExchange(url)`: Helper to exchange an auth code for tokens and set cookies.
- `getSigAuthVerifier()`: Returns the underlying `SigauthVerifier` instance from `@sigauth/core`.
