import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private async getProfileByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  private async getPostAndCheckOwnership(postId: string, userId: string) {
    const profile = await this.getProfileByUserId(userId);
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.profileId !== profile.id) {
      throw new ForbiddenException('You are not allowed to modify this post');
    }

    return { post, profile };
  }

  async create(userId: string, dto: CreatePostDto) {
    const profile = await this.getProfileByUserId(userId);
    const assets = await this.prisma.asset.findMany({ where: { id: { in: dto.assetIds } } });
    if (assets.length !== dto.assetIds.length) {
      throw new BadRequestException('One or more assets do not exist');
    }

    return this.prisma.post.create({
      data: {
        content: dto.content,
        profileId: profile.id,
        postAssets: {
          create: dto.assetIds.map((assetId, orderIndex) => ({
            assetId,
            orderIndex,
          })),
        },
      },
      include: {
        profile: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        postAssets: {
          include: {
            asset: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async findOne(id: string, currentUserId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        profile: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        postAssets: {
          include: { asset: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.isArchived) {
      const currentProfile = currentUserId
        ? await this.prisma.profile.findUnique({ where: { userId: currentUserId } })
        : null;
      if (!currentProfile || post.profileId !== currentProfile.id) {
        throw new NotFoundException('Post not found');
      }
    }
    return post;
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    await this.getPostAndCheckOwnership(id, userId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.assetIds) {
        const assets = await tx.asset.findMany({
          where: {
            id: { in: dto.assetIds },
          },
        });

        if (assets.length !== dto.assetIds.length) {
          throw new BadRequestException('One or more assets do not exist');
        }
        await tx.postAsset.deleteMany({ where: { postId: id } });
        await tx.postAsset.createMany({
          data: dto.assetIds.map((assetId, orderIndex) => ({
            postId: id,
            assetId,
            orderIndex,
          })),
        });
      }

      return tx.post.update({
        where: { id },
        data: {
          content: dto.content,
        },
        include: {
          profile: true,
          postAssets: {
            include: {
              asset: true,
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    });
  }

  async remove(id: string, userId: string) {
    await this.getPostAndCheckOwnership(id, userId);

    await this.prisma.post.delete({ where: { id } });
  }

  async toggleArchive(id: string, userId: string) {
    const { post } = await this.getPostAndCheckOwnership(id, userId);

    return this.prisma.post.update({
      where: { id },
      data: {
        isArchived: !post.isArchived,
      },
    });
  }

  async findMyPosts(userId: string) {
    const profile = await this.getProfileByUserId(userId);

    return this.prisma.post.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        postAssets: {
          include: {
            asset: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }
}
