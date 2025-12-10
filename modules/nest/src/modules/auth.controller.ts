import { Controller, Get, Inject, Query, Res } from '@nestjs/common';
import { SigAuthOptions } from '@sigauth/core';
import { AuthService } from './auth.service.js';
import { Response } from 'express';
import { AllowAnonymous } from '../common/util.decorators.js';

@Controller('sigauth')
export class AuthController {
    constructor(
        @Inject('SIGAUTH_OPTIONS') private readonly options: SigAuthOptions,
        private readonly authService: AuthService,
    ) {}

    @Get('oidc/auth')
    @AllowAnonymous()
    async exchangeCode(@Query('code') code: string, @Query('redirectUri') redirectUri: string, @Res() res: Response) {
        return this.authService.exchangeCode(code, redirectUri, res);
    }
}
