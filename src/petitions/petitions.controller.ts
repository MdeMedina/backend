import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { PetitionsService } from './petitions.service';
import type { CreatePetitionDto } from './petitions.service';

@Controller('petitions')
export class PetitionsController {
  constructor(private readonly petitionsService: PetitionsService) {}

  @Get()
  findAll() {
    return this.petitionsService.findAll();
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
}


