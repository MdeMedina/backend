import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PetitionsService } from './petitions.service';
import type { CreatePetitionDto, ReviewPetitionDto, PaginationDto } from './petitions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, PetitionStatus } from '../../generated/prisma';
import type { Request } from 'express';

@Controller('petitions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PetitionsController {
  constructor(private readonly petitionsService: PetitionsService) {}

  @Post()
  create(@Body() createPetitionDto: CreatePetitionDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.petitionsService.create(createPetitionDto, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  findAll(@Query() pagination: PaginationDto, @Query('status') status?: PetitionStatus) {
    return this.petitionsService.findAll(pagination, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.petitionsService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/review')
  review(@Param('id') id: string, @Body() reviewPetitionDto: ReviewPetitionDto, @Req() req: Request) {
    const user = (req as any).user;
    return this.petitionsService.review(id, reviewPetitionDto, user.id);
  }
}


