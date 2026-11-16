import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { ERROR_MESSAGES } from '../common/constants/messages.constants';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfileByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }
    return profile;
  }

  async create(data: { id: string; email: string; username: string; displayName?: string }) {
    return this.prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        profile: {
          create: {
            username: data.username,
            displayName: data.displayName || data.username,
          },
        },
      },
      include: {
        profile: true,
      },
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      include: {
        profile: true,
      },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    if (dto.username !== undefined) {
      const existingProfile = await this.prisma.profile.findFirst({
        where: {
          username: dto.username,
          NOT: { userId: id },
        },
      });
      if (existingProfile) {
        throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_TAKEN);
      }
    }

    const profileUpdate: Prisma.ProfileUpdateWithoutUserInput = {
      ...(dto.username !== undefined && { username: dto.username }),
      ...(dto.displayName !== undefined && { displayName: dto.displayName }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      ...(dto.birthday !== undefined && { birthday: new Date(dto.birthday) }),
    };

    const hasProfileUpdates = Object.keys(profileUpdate).length > 0;

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          profile: hasProfileUpdates ? { update: profileUpdate } : undefined,
        },
        include: {
          profile: true,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<User> {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
      }
      throw error;
    }
  }
}
