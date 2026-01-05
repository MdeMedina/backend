import {
  Controller,
  Post,
  Body,
  Delete,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PushService, PushSubscriptionDto, PushNotificationPayload } from './push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma';
import { Request } from 'express';

@Controller('push')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('subscribe')
  async subscribe(@Body() subscription: PushSubscriptionDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.pushService.subscribe(user.id, subscription);
  }

  @Delete('unsubscribe')
  async unsubscribe(@Body('endpoint') endpoint: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.pushService.unsubscribe(user.id, endpoint);
  }

  @Get('public-key')
  getPublicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Roles(UserRole.ADMIN)
  @Post('send')
  async sendNotification(
    @Body() body: { userId: string; payload: PushNotificationPayload },
  ) {
    return this.pushService.sendNotification(body.userId, body.payload);
  }

  @Roles(UserRole.ADMIN)
  @Post('broadcast')
  async broadcast(@Body() payload: PushNotificationPayload) {
    return this.pushService.broadcast(payload);
  }
}

