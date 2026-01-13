import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../../generated/prisma';

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await require('bcrypt').hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(pagination: PaginationDto = {}, requestingUserRole: UserRole) {
    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 50, 100); // Máximo 100 por página
    const skip = (page - 1) * limit;

    // Solo Admin puede ver todos los usuarios
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can view all users');
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, requestingUserId: string, requestingUserRole: UserRole) {
    // Los usuarios pueden ver su propio perfil, los admins pueden ver cualquiera
    if (id !== requestingUserId && requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ) {
    // Solo Admin puede actualizar otros usuarios
    if (id !== requestingUserId && requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Solo Admin puede cambiar roles
    if (updateUserDto.role && requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can change user roles');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string, requestingUserRole: UserRole) {
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete users');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete: desactivar en lugar de eliminar (BR-03: conservar historial)
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Obtiene la jerarquía de propietarios con sus responsables asignados y departamentos
   * Solo para Admin según ERS
   */
  async getHierarchy(requestingUserRole: UserRole) {
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can view the hierarchy');
    }

    // Obtener todos los propietarios con sus departamentos
    const owners = await this.prisma.user.findMany({
      where: { role: UserRole.OWNER },
      orderBy: { lastName: 'asc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        ownedApartments: {
          select: {
            id: true,
            number: true,
            floor: true,
            building: true,
            isActive: true,
            manager: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    return owners;
  }

  /**
   * Activa o desactiva un usuario (para validación de documentos)
   */
  async toggleActive(id: string, isActive: boolean, requestingUserRole: UserRole) {
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can activate/deactivate users');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }
}


