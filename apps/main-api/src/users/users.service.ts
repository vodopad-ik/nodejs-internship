import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.user.update({
      where: { id },
      data: {
        profile: dto.username
          ? {
              update: {
                username: dto.username,
              },
            }
          : undefined,
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
