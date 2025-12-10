# @sigauth/nest

SigAuth NestJS Integration for lifting authentication and authorization.

## Installation

```bash
npm install @sigauth/nest @sigauth/core
# or
pnpm add @sigauth/nest @sigauth/core
# or
yarn add @sigauth/nest @sigauth/core
```

## Configuration

Import the `AuthModule` in your root `AppModule` using `forRoot` to configure the SigAuth options.

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '@sigauth/nest';

@Module({
    imports: [
        AuthModule.forRoot({
            issuer: 'http://localhost:5173', // Your SigAuth issuer URL
            audience: 'Nest App', // Your application name/audience
            appId: 123, // Your App ID
            appToken: 'your-app-token', // Your App Token
            secureCookies: false, // Set to true in production
        }),
    ],
})
export class AppModule {}
```

## Usage

### Protecting Routes

To protect your routes, you can use the `AuthGuard`. You can register it globally in your `main.ts` or as a provider in `AppModule`.

**Global Registration (main.ts):**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthGuard } from '@sigauth/nest';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Get the guard from the dependency injection container to ensure dependencies are resolved
    const authGuard = app.get(AuthGuard);
    app.useGlobalGuards(authGuard);

    await app.listen(3000);
}
bootstrap();
```

**Module Registration (AppModule):**

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard, AuthModule } from '@sigauth/nest';

@Module({
    imports: [
        AuthModule.forRoot({
            /* options */
        }),
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
    ],
})
export class AppModule {}
```

### Allow Anonymous Access

If you have enabled the global guard, all routes will be protected by default. To allow public access to specific routes or controllers, use the `@AllowAnonymous()` decorator.

```typescript
import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from '@sigauth/nest';

@Controller('public')
export class PublicController {
    @Get()
    @AllowAnonymous()
    getPublicData() {
        return { message: 'This is public' };
    }
}
```

## Endpoints

The `AuthModule` automatically registers an `AuthController` which exposes the following endpoints:

- `GET /sigauth/oidc/auth`: Handles the OIDC authorization code exchange.

## Authorization

Endoints behind the auth guard can obtain the user and verifier by using the `@User()` and `@Verifier()` param decorator.

```typescript
@Get('protected')
getProtected(@User() user: SigAuthUser): string {
    return `This is protected. Hello, ${user.name}!`;
}

@Get('info')
async getProtectedInfo(@User() user: SigAuthUser, @Verifier() verifier: SigauthVerifier): Promise<string> {
    return `User Info: ${JSON.stringify(user)}, Verifier Info: ${JSON.stringify(await verifier.getUserInfo())}`;
}

@Get('blog/:id')
async getBlogPost(@Verifier() verifier: SigauthVerifier): Promise<string> {
    const hasPermission = await verifier.hasPermission(new PermissionBuilder('read', '<app-Id>').withAssetId(26).withContainerId(6).build());
    return hasPermission ? 'You have access to this blog post.' : 'You do not have permission to access this blog post.';
}
```

## Exports

The module exports the following services and utilities:

- `AuthService`: Service for handling authentication logic.
- `AuthGuard`: Guard for protecting routes.
- `AllowAnonymous`: Decorator for bypassing the guard.
- `SigAuthOptions`: Interface for configuration options.
