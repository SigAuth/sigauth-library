import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { SigAuthGuard } from '@sigauth/nest';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const authGuard = app.get(SigAuthGuard);
    app.useGlobalGuards(authGuard); // every route is protected by default
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
