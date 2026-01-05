import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApartmentsModule } from './apartments/apartments.module';
import { StaysModule } from './stays/stays.module';
import { PetitionsModule } from './petitions/petitions.module';
import { AuditModule } from './audit/audit.module';
import { WebSocketModule } from './websocket/websocket.module';
import { PushModule } from './push/push.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuditInterceptor } from './audit/interceptors/audit.interceptor';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ApartmentsModule,
    StaysModule,
    PetitionsModule,
    AuditModule,
    WebSocketModule,
    PushModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
