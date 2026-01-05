import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditLog } from '../../generated/prisma';
import * as crypto from 'crypto';

export interface AuditMetadata {
  ip?: string;
  userAgent?: string;
  device?: string;
  requestId?: string;
  [key: string]: any;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un registro de auditoría inalterable con hash estilo blockchain
   * El hash se calcula como SHA-256 de: datos actuales + hash anterior
   */
  async createAuditLog(
    userId: string | null,
    action: AuditAction,
    entityName: string,
    entityId: string | null,
    metadata: AuditMetadata,
  ): Promise<AuditLog> {
    // Obtener el hash de la última entrada para la cadena
    const lastLog = await this.prisma.auditLog.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { hash: true },
    });

    const previousHash = lastLog?.hash || null;

    // Preparar los datos para el hash
    const dataToHash = JSON.stringify({
      userId,
      action,
      entityName,
      entityId,
      metadata,
      timestamp: new Date().toISOString(),
      previousHash,
    });

    // Calcular SHA-256 concatenando datos + hash anterior
    const hash = crypto
      .createHash('sha256')
      .update(dataToHash)
      .digest('hex');

    // Crear el registro (no se puede modificar después)
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityName,
        entityId,
        metadata: metadata as any,
        hash,
        previousHash,
      },
    });
  }

  /**
   * Verifica la integridad de la cadena de auditoría
   * Retorna true si todos los hashes son válidos
   */
  async verifyIntegrity(): Promise<{ valid: boolean; invalidLogs: string[] }> {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { timestamp: 'asc' },
    });

    const invalidLogs: string[] = [];
    let previousHash: string | null = null;

    for (const log of logs) {
      const dataToHash = JSON.stringify({
        userId: log.userId,
        action: log.action,
        entityName: log.entityName,
        entityId: log.entityId,
        metadata: log.metadata,
        timestamp: log.timestamp.toISOString(),
        previousHash,
      });

      const expectedHash = crypto
        .createHash('sha256')
        .update(dataToHash)
        .digest('hex');

      if (log.hash !== expectedHash) {
        invalidLogs.push(log.id);
      }

      if (log.previousHash !== previousHash) {
        invalidLogs.push(log.id);
      }

      previousHash = log.hash;
    }

    return {
      valid: invalidLogs.length === 0,
      invalidLogs,
    };
  }

  /**
   * Obtiene el historial de auditoría con paginación
   */
  async getAuditHistory(
    page: number = 1,
    limit: number = 50,
    filters?: {
      userId?: string;
      entityName?: string;
      action?: AuditAction;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.entityName) {
      where.entityName = filters.entityName;
    }
    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

