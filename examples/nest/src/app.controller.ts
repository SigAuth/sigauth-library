import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AllowAnonymous, PermissionBuilder, type SigAuthUser, SigauthVerifier, User, Verifier } from '@sigauth/nest';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    @AllowAnonymous() // This route can be accessed without authentication
    getHello(): string {
        return this.appService.getHello();
    }

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
        const hasPermission = await verifier.hasPermission(new PermissionBuilder('root', 5).build());
        return hasPermission ? 'You have access to this blog post.' : 'You do not have permission to access this blog post.';
    }
}
