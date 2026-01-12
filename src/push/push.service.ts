import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as webpush from 'web-push';

export interface PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

@Injectable()
export class PushService {
  private vapidKeys: {
    publicKey: string;
    privateKey: string;
  };

  constructor(private prisma: PrismaService) {
    // Inicializar VAPID keys desde variables de entorno
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      console.warn(
        'VAPID keys not configured. Web Push Notifications will not work.',
      );
    } else {
      this.vapidKeys = { publicKey, privateKey };
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
        publicKey,
        privateKey,
      );
    }
  }

  async subscribe(userId: string, subscription: PushSubscriptionDto) {
    // Eliminar suscripciones duplicadas
    await this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint: subscription.endpoint,
      },
    });

    return this.prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint,
      },
    });
  }

  async sendNotification(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      data: payload.data || {},
    });

    let sent = 0;
    let failed = 0;

    const promises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notificationPayload,
        );
        sent++;
      } catch (error) {
        failed++;
        // Si la suscripción es inválida, eliminarla
        if (error.statusCode === 410 || error.statusCode === 404) {
          await this.prisma.pushSubscription.delete({
            where: { id: subscription.id },
          });
        }
      }
    });

    await Promise.all(promises);

    return { sent, failed };
  }

  async sendToMultipleUsers(
    userIds: string[],
    payload: PushNotificationPayload,
  ): Promise<{ sent: number; failed: number }> {
    let totalSent = 0;
    let totalFailed = 0;

    for (const userId of userIds) {
      const result = await this.sendNotification(userId, payload);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    return { sent: totalSent, failed: totalFailed };
  }

  async broadcast(
    payload: PushNotificationPayload,
    excludeUserIds?: string[],
  ): Promise<{ sent: number; failed: number }> {
    const where: any = {};
    if (excludeUserIds && excludeUserIds.length > 0) {
      where.userId = { notIn: excludeUserIds };
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where,
    });

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      data: payload.data || {},
    });

    let sent = 0;
    let failed = 0;

    const promises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notificationPayload,
        );
        sent++;
      } catch (error) {
        failed++;
        if (error.statusCode === 410 || error.statusCode === 404) {
          await this.prisma.pushSubscription.delete({
            where: { id: subscription.id },
          });
        }
      }
    });

    await Promise.all(promises);

    return { sent, failed };
  }

  getPublicKey(): string | null {
    return this.vapidKeys?.publicKey || null;
  }
}



