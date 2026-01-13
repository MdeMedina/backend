import { Body, Controller, Get, Param, Post, Patch, Query, Request } from '@nestjs/common';
import { PetitionsService } from './petitions.service';
import type { CreatePetitionDto, ReviewPetitionDto, PaginationDto } from './petitions.service';
import { UserRole, PetitionStatus } from '../../generated/prisma';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('petitions')
export class PetitionsController {
  constructor(private readonly petitionsService: PetitionsService) {}

  @Get()
  findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: PetitionStatus,
  ) {
    return this.petitionsService.findAll(pagination, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.petitionsService.findOne(id);
  }

  @Post()
  create(@Body() body: CreatePetitionDto, @Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return this.petitionsService.create(body, userId);
  }

  @Patch(':id/review')
  @Roles(UserRole.ADMIN)
  review(
    @Param('id') id: string,
    @Body() reviewDto: ReviewPetitionDto,
    @Request() req: any,
  ) {
    const adminId = req.user?.id;
    if (!adminId) {
      throw new Error('User not authenticated');
    }
    return this.petitionsService.review(id, reviewDto, adminId);
  }
}


