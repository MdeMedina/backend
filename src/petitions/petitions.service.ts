import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PetitionStatus, UserRole } from '../../generated/prisma';

export interface CreatePetitionDto {
  stayId: string;
  reason: string;
}

export interface ReviewPetitionDto {
  status: PetitionStatus;
  adminNotes?: string;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
}

@Injectable()
export class PetitionsService {
  constructor(private prisma: PrismaService) {}

  async create(createPetitionDto: CreatePetitionDto, userId: string) {
    // Verificar que la estancia existe y está bloqueada
    const stay = await this.prisma.stay.findUnique({
      where: { id: createPetitionDto.stayId },
    });

    if (!stay) {
      throw new NotFoundException('Stay not found');
    }

    if (!stay.isLocked) {
      throw new BadRequestException('Stay is not locked. No petition needed.');
    }

    // Verificar que no hay una petición pendiente
    const existingPetition = await this.prisma.petition.findFirst({
      where: {
        stayId: createPetitionDto.stayId,
        status: 'PENDING',
      },
    });

    if (existingPetition) {
      throw new BadRequestException('There is already a pending petition for this stay');
    }

    return this.prisma.petition.create({
      data: {
        ...createPetitionDto,
        userId,
      },
      include: {
        stay: {
          include: {
            apartment: {
              select: {
                id: true,
                number: true,
                floor: true,
                building: true,
              },
            },
          },
        },
        user: {
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

  async findAll(pagination: PaginationDto = {}, status?: PetitionStatus) {
    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [petitions, total] = await Promise.all([
      this.prisma.petition.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          stay: {
            include: {
              apartment: {
                select: {
                  id: true,
                  number: true,
                  floor: true,
                  building: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.petition.count({ where }),
    ]);

    return {
      data: petitions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const petition = await this.prisma.petition.findUnique({
      where: { id },
      include: {
        stay: {
          include: {
            apartment: {
              select: {
                id: true,
                number: true,
                floor: true,
                building: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!petition) {
      throw new NotFoundException('Petition not found');
    }

    return petition;
  }

  async review(
    id: string,
    reviewPetitionDto: ReviewPetitionDto,
    adminId: string,
  ) {
    const petition = await this.prisma.petition.findUnique({
      where: { id },
    });

    if (!petition) {
      throw new NotFoundException('Petition not found');
    }

    if (petition.status !== 'PENDING') {
      throw new BadRequestException('Petition has already been reviewed');
    }

    // El texto original (reason) no se puede modificar
    return this.prisma.petition.update({
      where: { id },
      data: {
        status: reviewPetitionDto.status,
        adminNotes: reviewPetitionDto.adminNotes,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      include: {
        stay: {
          include: {
            apartment: {
              select: {
                id: true,
                number: true,
                floor: true,
                building: true,
              },
            },
          },
        },
        user: {
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
}




