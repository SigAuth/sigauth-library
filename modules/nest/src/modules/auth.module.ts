import { DynamicModule, MiddlewareConsumer, Module } from '@nestjs/common';
import { SigAuthOptions } from '@sigauth/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './auth.guard.js';

@Module({})
export class AuthModule {
    static forRoot(options: SigAuthOptions): DynamicModule {
        return {
            module: AuthModule,
            controllers: [AuthController],
            providers: [
                {
                    // Provide the SIGAUTH_OPTIONS token with the given options to be injected in the middleware
                    provide: 'SIGAUTH_OPTIONS',
                    useValue: options,
                },
                AuthService,
                AuthGuard,
            ],
            exports: ['SIGAUTH_OPTIONS', AuthService],
        };
    }
}
