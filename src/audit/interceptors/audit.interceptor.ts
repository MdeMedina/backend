import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { AuditAction } from '../../../generated/prisma';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id ?? null;
    const method = request.method;
    const path = request.url;
    const handler = context.getHandler();
    const controller = context.getClass();
    const entityName = controller.name.replace('Controller', '');

    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;

        // Mapear métodos HTTP a acciones de auditoría
        let action: AuditAction;
        switch (method) {
          case 'GET':
            action = AuditAction.VIEW;
            break;
          case 'POST':
            action = AuditAction.CREATE;
            break;
          case 'PATCH':
          case 'PUT':
            action = AuditAction.UPDATE;
            break;
          case 'DELETE':
            action = AuditAction.DELETE;
            break;
          default:
            action = AuditAction.VIEW;
        }

        // Extraer entityId de los parámetros si existe
        const entityId = request.params?.id || null;

        // Crear metadata con información adicional
        const metadata = {
          method,
          path,
          durationMs,
          handler: handler.name,
          ip: request.ip,
          userAgent: request.get('user-agent'),
        };

        // Registrar en auditoría
        this.auditService
          .createAuditLog(
            userId,
            action,
            entityName,
            entityId,
            metadata,
          )
          .catch(() => {
            // Evitar que un fallo de auditoría rompa la petición
          });
      }),
    );
  }
}


