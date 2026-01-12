import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import type { PaginationDto } from './users.service';
import { UserRole } from '../../generated/prisma';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto, @Request() req: any) {
    const requestingUserRole = req.user?.role as UserRole;
    if (!requestingUserRole) {
      throw new Error('User not authenticated');
    }
    return this.usersService.findAll(pagination, requestingUserRole);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const requestingUserId = req.user?.id;
    const requestingUserRole = req.user?.role as UserRole;
    if (!requestingUserId || !requestingUserRole) {
      throw new Error('User not authenticated');
    }
    return this.usersService.findOne(id, requestingUserId, requestingUserRole);
  }
}


