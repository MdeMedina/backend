import { Module } from '@nestjs/common';
import { StaysService } from './stays.service';
import { StaysController } from './stays.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { StayLockInterceptor } from './interceptors/stay-lock.interceptor';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [StaysController],
  providers: [StaysService, StayLockInterceptor],
  exports: [StaysService],
})
export class StaysModule {}

