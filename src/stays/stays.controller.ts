import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { StaysService, CreateStayDto, UpdateStayDto, PaginationDto } from './stays.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma';
import { StayLockInterceptor } from './interceptors/stay-lock.interceptor';
import { Request } from 'express';

@Controller('stays')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaysController {
  constructor(private readonly staysService: StaysService) {}

  @Post()
  create(@Body() createStayDto: CreateStayDto) {
    return this.staysService.create(createStayDto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.staysService.findAll(pagination, user.role, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.staysService.findOne(id, user.role, user.id);
  }

  @UseInterceptors(StayLockInterceptor)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStayDto: UpdateStayDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.staysService.update(id, updateStayDto, user.role);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.staysService.remove(id, user.role);
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

