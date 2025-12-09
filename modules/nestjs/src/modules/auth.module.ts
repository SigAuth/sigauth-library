import { DynamicModule, Module } from '@nestjs/common';
import { SigAuthOptions } from '@sigauth/core';
import { AuthMiddleware } from 'src/modules/auth.middleware';

@Module({})
export class AuthModule {
    static forRoot(options: SigAuthOptions): DynamicModule {
        return {
            module: AuthModule,
            providers: [
                {
                    // Provide the SIGAUTH_OPTIONS token with the given options to be injected in the middleware
                    provide: 'SIGAUTH_OPTIONS',
                    useValue: options,
                },
                AuthMiddleware,
            ],
            exports: [AuthMiddleware],
        };
    }
}
