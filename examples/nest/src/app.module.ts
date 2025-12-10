import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SigAuthModule } from '@sigauth/nest';

@Module({
    imports: [
        // Configure the AuthModule with your SigAuth options
        SigAuthModule.forRoot({
            issuer: 'http://localhost:5173',
            audience: 'Nest JS',
            appId: 5, // Replace with your actual appId
            appToken: 'lYbuefUJEZdZ5JRntaa6t8PfZBqWhwFF14VT9aGGC7GWp5HNlxySoC5D4qbdGDR6', // Replace with your actual appToken
            secureCookies: false,
        }),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
