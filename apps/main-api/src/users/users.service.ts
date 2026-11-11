import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
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
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  create(data: { id: string; email: string; username: string; displayName?: string }) {
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

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      include: {
        profile: true,
      },
    });
  }

  async findOne(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  update(id: string, dto: UpdateUserDto): Promise<User> {
    const profileUpdate: Prisma.ProfileUpdateWithoutUserInput = {
      ...(dto.username !== undefined && { username: dto.username }),
      ...(dto.displayName !== undefined && { displayName: dto.displayName }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      ...(dto.birthday !== undefined && { birthday: new Date(dto.birthday) }),
    };

    const hasProfileUpdates = Object.keys(profileUpdate).length > 0;

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email !== undefined && { email: dto.email }),
        profile: hasProfileUpdates ? { update: profileUpdate } : undefined,
      },
      include: {
        profile: true,
      },
    });
  }

  remove(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
