import { Body, Controller, Post, Request } from '@nestjs/common';
import { PushService } from './push.service';
import type { PushNotificationPayload } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('send')
  sendNotification(@Body() body: PushNotificationPayload, @Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.pushService.sendNotification(userId, body);
  }
}


