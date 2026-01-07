import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService, AuditMetadata } from '../audit.service';
import { AuditAction } from '../../../generated/prisma';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user, method, url, body, params, query } = request;

    // No auditar rutas públicas (excepto login que se audita manualmente)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic && method !== 'POST' && url !== '/auth/login') {
      return next.handle();
    }

    // Determinar la acción basada en el método HTTP
    let action: AuditAction;
    switch (method) {
      case 'POST':
        action = AuditAction.CREATE;
        break;
      case 'PUT':
      case 'PATCH':
        action = AuditAction.UPDATE;
        break;
      case 'DELETE':
        action = AuditAction.DELETE;
        break;
      case 'GET':
        action = AuditAction.VIEW;
        break;
      default:
        action = AuditAction.VIEW;
    }

    // Extraer metadata
    const metadata: AuditMetadata = {
      ip: request.ip || request.socket.remoteAddress,
      userAgent: request.get('user-agent'),
      method,
      url,
      body: method !== 'GET' ? body : undefined,
      params,
      query,
    };

    // Extraer entity name e id de la URL
    const urlParts = url.split('/').filter(Boolean);
    const entityName = urlParts[0] || 'unknown';
    const entityIdParam = params?.id || query?.id || null;
    // Convertir a string si es necesario
    const entityId = entityIdParam ? String(entityIdParam) : null;

    const userId = (user as any)?.id || null;

    return next.handle().pipe(
      tap(async () => {
        // Registrar después de que la operación sea exitosa
        try {
          await this.auditService.createAuditLog(
            userId,
            action,
            entityName,
            entityId,
            metadata,
          );
        } catch (error) {
          // No fallar la request si la auditoría falla, pero loguear
          console.error('Error creating audit log:', error);
        }
      }),
    );
  }
}

