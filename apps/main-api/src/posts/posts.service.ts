import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createPaginatedResponse, getPaginationOffsets } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreatePostDto } from './dto/create-post.dto';
import { SearchPostDto } from './dto/search-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private async getPostAndCheckOwnership(postId: string, userId: string) {
    const profile = await this.usersService.getProfileByUserId(userId);
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
    const profile = await this.usersService.getProfileByUserId(userId);
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
            isPublic: true,
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

    if (!post.profile.isPublic) {
      if (!currentUserId) {
        throw new ForbiddenException('This profile is private');
      }
      const currentProfile = await this.prisma.profile.findUnique({
        where: { userId: currentUserId },
      });
      if (!currentProfile) {
        throw new NotFoundException('Profile not found');
      }
      const isOwner = currentProfile.id === post.profileId;
      if (!isOwner) {
        const isFollower = await this.prisma.profileFollow.findUnique({
          where: {
            profileId_followerId: {
              profileId: post.profileId,
              followerId: currentProfile.id,
            },
          },
        });
        if (!isFollower?.accepted) {
          throw new ForbiddenException('This profile is private');
        }
      }
    }

    return post;
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const { post } = await this.getPostAndCheckOwnership(id, userId);
    if (post.isArchived) {
      throw new BadRequestException('Archived post cannot be modified');
    }

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
    });
  }

  async remove(id: string, userId: string) {
    await this.getPostAndCheckOwnership(id, userId);

    await this.prisma.post.delete({ where: { id } });
  }

  async archivePost(id: string, userId: string) {
    const { post } = await this.getPostAndCheckOwnership(id, userId);
    if (post.isArchived) {
      return post;
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        isArchived: true,
      },
    });
  }

  async findMyPosts(userId: string) {
    const profile = await this.usersService.getProfileByUserId(userId);

    return this.prisma.post.findMany({
      where: { profileId: profile.id, isArchived: false },
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

  async findMyArchivedPosts(userId: string) {
    const profile = await this.usersService.getProfileByUserId(userId);

    return this.prisma.post.findMany({
      where: { profileId: profile.id, isArchived: true },
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

  async getFeed(userId: string, query: PaginationQueryDto) {
    const profile = await this.usersService.getProfileByUserId(userId);
    const follows = await this.prisma.profileFollow.findMany({
      where: { followerId: profile.id, accepted: true },
      select: { profileId: true },
    });

    if (follows.length === 0) {
      return createPaginatedResponse([], 0, query);
    }
    const authorIds = follows.map((f) => f.profileId);

    const { skip, take } = getPaginationOffsets(query);

    const where = {
      profileId: {
        in: authorIds,
      },
      isArchived: false,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          postAssets: {
            include: {
              asset: true,
            },
            orderBy: { orderIndex: 'asc' },
          },
        },
      }),
    ]);

    return createPaginatedResponse(items, total, query);
  }

  async search(userId: string, searchDto: SearchPostDto) {
    const profile = await this.usersService.getProfileByUserId(userId);
    const follows = await this.prisma.profileFollow.findMany({
      where: { followerId: profile.id, accepted: true },
      select: { profileId: true },
    });

    const authorIds = follows.map((f) => f.profileId);

    const where: Prisma.PostWhereInput = {
      content: {
        contains: searchDto.query,
        mode: 'insensitive',
      },
      isArchived: false,
      OR: [
        { profile: { isPublic: true } },
        { profileId: { in: authorIds } },
        { profileId: profile.id },
      ],
    };

    const { skip, take } = getPaginationOffsets(searchDto);

    const [total, items] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          postAssets: {
            include: { asset: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      }),
    ]);

    return createPaginatedResponse(items, total, searchDto);
  }
}
