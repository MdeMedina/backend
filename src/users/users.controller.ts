import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import type { PaginationDto, CreateUserDto, UpdateUserDto } from './users.service';
import { UserRole } from '../../generated/prisma';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Rutas específicas ANTES de rutas con parámetros
  @Get('hierarchy')
  @Roles(UserRole.ADMIN)
  getHierarchy(@Request() req: any) {
    const requestingUserRole = req.user?.role as UserRole;
    if (!requestingUserRole) {
      throw new Error('User not authenticated');
    }
    return this.usersService.getHierarchy(requestingUserRole);
  }

  @Get()
  @Roles(UserRole.ADMIN)
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

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  toggleActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @Request() req: any,
  ) {
    const requestingUserRole = req.user?.role as UserRole;
    if (!requestingUserRole) {
      throw new Error('User not authenticated');
    }
    return this.usersService.toggleActive(id, isActive, requestingUserRole);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    const requestingUserId = req.user?.id;
    const requestingUserRole = req.user?.role as UserRole;
    if (!requestingUserId || !requestingUserRole) {
      throw new Error('User not authenticated');
    }
    return this.usersService.update(id, updateUserDto, requestingUserId, requestingUserRole);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    const requestingUserRole = req.user?.role as UserRole;
    if (!requestingUserRole) {
      throw new Error('User not authenticated');
    }
    return this.usersService.remove(id, requestingUserRole);
  }
}
