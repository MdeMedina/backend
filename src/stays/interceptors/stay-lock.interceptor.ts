import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { StayStatus } from '../../../generated/prisma';

@Injectable()
export class StayLockInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { method, params, body } = request;

    // Solo aplicar a métodos que modifican (PUT, PATCH, DELETE)
    if (!['PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const stayId = params?.id || body?.id || params?.stayId;

    if (!stayId) {
      return next.handle();
    }

    // Obtener la estancia
    const stay = await this.prisma.stay.findUnique({
      where: { id: stayId },
    });

    if (!stay) {
      throw new BadRequestException('Stay not found');
    }

    // Verificar si está bloqueada (más de 24 horas desde el check-in programado)
    const now = new Date();
    const scheduledCheckIn = new Date(stay.scheduledCheckIn);
    const hoursSinceCheckIn = (now.getTime() - scheduledCheckIn.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCheckIn > 24 && !stay.isLocked) {
      // Bloquear automáticamente si no está bloqueada
      await this.prisma.stay.update({
        where: { id: stayId },
        data: {
          isLocked: true,
          lockedAt: now,
        },
      });
    }

    // Si está bloqueada, verificar si hay una petición aprobada
    if (stay.isLocked || hoursSinceCheckIn > 24) {
      // Verificar si el usuario es Admin (puede editar con petición)
      const user = request.user;
      const isAdmin = user?.role === 'ADMIN';

      if (!isAdmin) {
        throw new ForbiddenException(
          'This stay is locked. More than 24 hours have passed since the scheduled check-in. ' +
          'Only administrators can modify locked stays through approved petitions.',
        );
      }

      // Si es Admin, verificar que existe una petición aprobada
      const approvedPetition = await this.prisma.petition.findFirst({
        where: {
          stayId,
          status: 'APPROVED',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!approvedPetition) {
        throw new ForbiddenException(
          'This stay is locked. An approved petition is required to modify it.',
        );
      }
    }

    return next.handle();
  }
}


