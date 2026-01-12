import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StayCategory, StayStatus, UserRole } from '../../generated/prisma';

export interface CreateStayDto {
  apartmentId: string;
  userId?: string;
  category: StayCategory;
  scheduledCheckIn: Date;
  scheduledCheckOut: Date;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  notes?: string;
}

export interface UpdateStayDto {
  scheduledCheckIn?: Date;
  scheduledCheckOut?: Date;
  actualCheckIn?: Date;
  actualCheckOut?: Date;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  notes?: string;
  status?: StayStatus;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
}

@Injectable()
export class StaysService {
  constructor(private prisma: PrismaService) {}

  async create(createStayDto: CreateStayDto) {
    return this.prisma.stay.create({
      data: createStayDto,
      include: {
        apartment: {
          select: {
            id: true,
            number: true,
            floor: true,
            building: true,
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

  async findAll(
    pagination: PaginationDto = {},
    userRole: UserRole,
    userId?: string,
  ) {
    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 50, 100);
    const skip = (page - 1) * limit;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let where: any = {};

    // Conserje solo ve registros del día actual hasta 24 horas después
    if (userRole === UserRole.CONCIERGE) {
      where = {
        scheduledCheckIn: {
          gte: now,
          lte: tomorrow,
        },
      };
    }

    // Otros roles pueden ver más, pero con filtros según necesidad
    // (se puede extender según requerimientos)

    const [stays, total] = await Promise.all([
      this.prisma.stay.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledCheckIn: 'asc' },
        include: {
          apartment: {
            select: {
              id: true,
              number: true,
              floor: true,
              building: true,
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
      this.prisma.stay.count({ where }),
    ]);

    return {
      data: stays,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userRole: UserRole, userId?: string) {
    const stay = await this.prisma.stay.findUnique({
      where: { id },
      include: {
        apartment: {
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
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        petitions: {
          where: {
            status: 'APPROVED',
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!stay) {
      throw new NotFoundException('Stay not found');
    }

    // Conserje solo puede ver si está en su rango de tiempo
    if (userRole === UserRole.CONCIERGE) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (
        stay.scheduledCheckIn < now ||
        stay.scheduledCheckIn > tomorrow
      ) {
        throw new ForbiddenException(
          'You can only view stays scheduled for today or the next 24 hours',
        );
      }
    }

    return stay;
  }

  async update(
    id: string,
    updateStayDto: UpdateStayDto,
    userRole: UserRole,
  ) {
    const stay = await this.prisma.stay.findUnique({ where: { id } });
    if (!stay) {
      throw new NotFoundException('Stay not found');
    }

    // El interceptor se encargará de verificar el bloqueo de 24 horas
    return this.prisma.stay.update({
      where: { id },
      data: updateStayDto,
      include: {
        apartment: {
          select: {
            id: true,
            number: true,
            floor: true,
            building: true,
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

  async remove(id: string, userRole: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete stays');
    }

    const stay = await this.prisma.stay.findUnique({ where: { id } });
    if (!stay) {
      throw new NotFoundException('Stay not found');
    }

    return this.prisma.stay.delete({ where: { id } });
  }

  async checkIn(id: string) {
    const stay = await this.prisma.stay.findUnique({ where: { id } });
    if (!stay) {
      throw new NotFoundException('Stay not found');
    }

    return this.prisma.stay.update({
      where: { id },
      data: {
        actualCheckIn: new Date(),
        status: StayStatus.CHECKED_IN,
      },
    });
  }

  async checkOut(id: string) {
    const stay = await this.prisma.stay.findUnique({ where: { id } });
    if (!stay) {
      throw new NotFoundException('Stay not found');
    }

    return this.prisma.stay.update({
      where: { id },
      data: {
        actualCheckOut: new Date(),
        status: StayStatus.CHECKED_OUT,
      },
    });
  }
}



