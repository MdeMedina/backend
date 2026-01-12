import { Body, Controller, Get, Param, Post, Query, Request, UseInterceptors } from '@nestjs/common';
import { StaysService } from './stays.service';
import type { PaginationDto } from './stays.service';
import { StayLockInterceptor } from './interceptors/stay-lock.interceptor';
import { UserRole } from '../../generated/prisma';

@Controller('stays')
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

  @Post()
  @UseInterceptors(StayLockInterceptor)
  create(@Body() body: any) {
    return this.staysService.create(body);
  }
}


