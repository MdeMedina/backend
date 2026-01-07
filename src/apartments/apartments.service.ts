import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateApartmentDto {
  number: string;
  floor: number;
  building: string;
  description?: string;
  ownerId?: string;
  managerId?: string;
}

export interface UpdateApartmentDto {
  number?: string;
  floor?: number;
  building?: string;
  description?: string;
  ownerId?: string;
  managerId?: string;
  isActive?: boolean;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
}

@Injectable()
export class ApartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createApartmentDto: CreateApartmentDto) {
    return this.prisma.apartment.create({
      data: createApartmentDto,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(pagination: PaginationDto = {}) {
    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 50, 100);
    const skip = (page - 1) * limit;

    const [apartments, total] = await Promise.all([
      this.prisma.apartment.findMany({
        skip,
        take: limit,
        where: { isActive: true },
        orderBy: [{ building: 'asc' }, { floor: 'asc' }, { number: 'asc' }],
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          manager: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.apartment.count({ where: { isActive: true } }),
    ]);

    return {
      data: apartments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    return apartment;
  }

  async update(id: string, updateApartmentDto: UpdateApartmentDto) {
    const apartment = await this.prisma.apartment.findUnique({ where: { id } });
    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    return this.prisma.apartment.update({
      where: { id },
      data: updateApartmentDto,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    // Soft delete
    return this.prisma.apartment.update({
      where: { id },
      data: { isActive: false },
    });
  }
}


