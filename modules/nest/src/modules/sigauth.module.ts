import { DynamicModule, MiddlewareConsumer, Module } from '@nestjs/common';
import { SigAuthOptions } from '@sigauth/core';
import { SigAuthController } from './sigauth.controller.js';
import { SigAuthService } from './sigauth.service.js';
import { SigAuthGuard } from './sigauth.guard.js';

@Module({})
export class SigAuthModule {
    static forRoot(options: SigAuthOptions): DynamicModule {
        return {
            module: SigAuthModule,
            controllers: [SigAuthController],
            providers: [
                {
                    // Provide the SIGAUTH_OPTIONS token with the given options to be injected in the middleware
                    provide: 'SIGAUTH_OPTIONS',
                    useValue: options,
                },
                SigAuthService,
                SigAuthGuard,
            ],
            exports: ['SIGAUTH_OPTIONS', SigAuthService],
        };
    }
}
