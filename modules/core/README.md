# @sigauth/core

The core library for SigAuth integrations, providing the fundamental logic for authentication, authorization, and permission management. This package is used by framework-specific integrations like `@sigauth/express` and `@sigauth/node`.

## Installation

```bash
pnpm add @sigauth/core
```

## Features

- **JWT Verification**: Validates access tokens and handles token refreshing using `jose`.
- **Permission Building**: A fluent API for constructing standardized permission strings.
- **OIDC Integration**: Core logic for handling OIDC authentication flows.

## Usage

### PermissionBuilder

Helper class to construct permission strings in the format `ident:assetId:appId:containerId`.

```typescript
import { PermissionBuilder } from '@sigauth/core';

const permission = new PermissionBuilder('read', 123) // ident, appId
    .withAssetId(456)
    .withContainerId(789)
    .build();

// Output: "read:456:123:789"
```

### SigauthVerifier

The main class for handling authentication logic.

```typescript
import { SigauthVerifier } from '@sigauth/core';

const verifier = new SigauthVerifier({
    authUrl: 'https://auth.example.com',
    clientId: 'your-client-id',
    // ... other options
});

// Verify a request
const result = await verifier.verify(req);
```
