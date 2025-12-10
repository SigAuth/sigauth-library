import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthGuard } from '@sigauth/nest';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const authGuard = app.get(AuthGuard);
    app.useGlobalGuards(authGuard); // every route is protected by default
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
