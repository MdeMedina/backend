import { Body, Controller, Get, Param, Post, Patch, Delete, Query, Request, UseInterceptors, UseGuards } from '@nestjs/common';
import { StaysService } from './stays.service';
import type { PaginationDto, UpdateStayDto } from './stays.service';
import { StayLockInterceptor } from './interceptors/stay-lock.interceptor';
import { UserRole } from '../../generated/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('stays')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaysController {
  constructor(private readonly staysService: StaysService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto, @Request() req: any) {
    const userRole = req.user?.role as UserRole;
    const userId = req.user?.id;
    if (!userRole) {
      throw new Error('User not authenticated');
    }
    return this.staysService.findAll(pagination, userRole, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const userRole = req.user?.role as UserRole;
    const userId = req.user?.id;
    if (!userRole) {
      throw new Error('User not authenticated');
    }
    return this.staysService.findOne(id, userRole, userId);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ASSIGNED_MANAGER)
  @Post()
  @UseInterceptors(StayLockInterceptor)
  create(@Body() body: any) {
    return this.staysService.create(body);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.ASSIGNED_MANAGER)
  @Patch(':id')
  @UseInterceptors(StayLockInterceptor)
  update(@Param('id') id: string, @Body() body: UpdateStayDto, @Request() req: any) {
    const userRole = req.user?.role as UserRole;
    return this.staysService.update(id, body, userRole);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const userRole = req.user?.role as UserRole;
    return this.staysService.remove(id, userRole);
  }

  @Post(':id/check-in')
  checkIn(@Param('id') id: string) {
    return this.staysService.checkIn(id);
  }

  @Post(':id/check-out')
  checkOut(@Param('id') id: string) {
    return this.staysService.checkOut(id);
  }
}


