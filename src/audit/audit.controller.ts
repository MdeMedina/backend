import { Controller, Get, Query, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { UserRole, AuditAction } from '../../generated/prisma';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuditQueryDto {
  page?: string;
  limit?: string;
  userId?: string;
  entityName?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
}

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  getAuditHistory(@Query() query: AuditQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 100) : 50;

    const filters: any = {};
    if (query.userId) filters.userId = query.userId;
    if (query.entityName) filters.entityName = query.entityName;
    if (query.action) filters.action = query.action;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);

    return this.auditService.getAuditHistory(page, limit, filters);
  }

  @Get('verify')
  @Roles(UserRole.ADMIN)
  verifyIntegrity() {
    return this.auditService.verifyIntegrity();
  }
}

