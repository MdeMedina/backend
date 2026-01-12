import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StayCategory, StayStatus, UserRole } from '../../generated/prisma';

export interface Guest {
  name: string;
  email?: string;
  phone?: string;
  document?: string;
}

export interface CreateStayDto {
  apartmentId: string;
  userId?: string;
  category: StayCategory;
  scheduledCheckIn: string | Date;
  scheduledCheckOut: string | Date;
  guestName?: string;
  guestDocument?: string; // RUT o Pasaporte
  guestEmail?: string;
  guestPhone?: string;
  guests?: Guest[];
  notes?: string;
}

export interface UpdateStayDto {
  scheduledCheckIn?: string | Date;
  scheduledCheckOut?: string | Date;
  actualCheckIn?: string | Date;
  actualCheckOut?: string | Date;
  guestName?: string;
  guestDocument?: string; // RUT o Pasaporte
  guestEmail?: string;
  guestPhone?: string;
  guests?: Guest[];
  notes?: string;
  status?: StayStatus;
  category?: StayCategory;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
}

// Helper para convertir string a Date ISO válido
const toISODate = (date: string | Date | undefined): Date | undefined => {
  if (!date) return undefined;
  if (date instanceof Date) return date;
  // Si es string, convertir a ISO completo
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date format: ${date}`);
  }
  return parsed;
};

@Injectable()
export class StaysService {
  constructor(private prisma: PrismaService) {}

  async create(createStayDto: CreateStayDto) {
    const data: any = {
      apartmentId: createStayDto.apartmentId,
      userId: createStayDto.userId,
      category: createStayDto.category,
      scheduledCheckIn: toISODate(createStayDto.scheduledCheckIn),
      scheduledCheckOut: toISODate(createStayDto.scheduledCheckOut),
      guestName: createStayDto.guestName,
      guestDocument: createStayDto.guestDocument,
      guestEmail: createStayDto.guestEmail,
      guestPhone: createStayDto.guestPhone,
      guests: createStayDto.guests || null,
      notes: createStayDto.notes,
    };

    return this.prisma.stay.create({
      data,
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

    // Convertir fechas a ISO válido
    const data: any = { ...updateStayDto };
    if (updateStayDto.scheduledCheckIn) {
      data.scheduledCheckIn = toISODate(updateStayDto.scheduledCheckIn);
    }
    if (updateStayDto.scheduledCheckOut) {
      data.scheduledCheckOut = toISODate(updateStayDto.scheduledCheckOut);
    }
    if (updateStayDto.actualCheckIn) {
      data.actualCheckIn = toISODate(updateStayDto.actualCheckIn);
    }
    if (updateStayDto.actualCheckOut) {
      data.actualCheckOut = toISODate(updateStayDto.actualCheckOut);
    }

    // El interceptor se encargará de verificar el bloqueo de 24 horas
    return this.prisma.stay.update({
      where: { id },
      data,
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



