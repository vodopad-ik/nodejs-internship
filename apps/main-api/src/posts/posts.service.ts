import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../common/constants/messages.constants';
import { PROFILE_PREVIEW_SELECT } from '../common/constants/prisma-selects.constants';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createPaginatedResponse, getPaginationOffsets } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreatePostDto } from './dto/create-post.dto';
import { SearchPostDto } from './dto/search-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { toPostResponse } from './mappers/post.mapper';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private async getPostAndCheckOwnership(postId: string, userId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(ERROR_MESSAGES.POST_NOT_FOUND);
    }
    if (post.profileId !== currentProfile.id) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_ALLOWED_TO_MODIFY_POST);
    }

    return { post, currentProfile };
  }

  private async getAcceptedFollowingIds(followerId: string): Promise<string[]> {
    const follows = await this.prisma.profileFollow.findMany({
      where: { followerId, accepted: true },
      select: { profileId: true },
    });

    return follows.map((follow) => follow.profileId);
  }

  private async getVisiblePostsFilter(currentProfileId: string): Promise<Prisma.PostWhereInput> {
    const authorIds = await this.getAcceptedFollowingIds(currentProfileId);

    return {
      isArchived: false,
      OR: [
        { profile: { isPublic: true } },
        { profileId: { in: authorIds } },
        { profileId: currentProfileId },
      ],
    };
  }

  private getPostInclude(currentProfileId: string) {
    return {
      profile: {
        select: {
          ...PROFILE_PREVIEW_SELECT,
          isPublic: true,
        },
      },
      postAssets: {
        include: { asset: true },
        orderBy: { orderIndex: 'asc' as const },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
      likes: {
        where: { profileId: currentProfileId },
        select: { profileId: true },
      },
    };
  }

  async getAccessiblePost(postId: string, currentProfileId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: this.getPostInclude(currentProfileId),
    });

    if (!post) {
      throw new NotFoundException(ERROR_MESSAGES.POST_NOT_FOUND);
    }

    const isOwner = currentProfileId === post.profileId;

    if (post.isArchived && !isOwner) {
      throw new NotFoundException(ERROR_MESSAGES.POST_NOT_FOUND);
    }

    if (!post.profile.isPublic && !isOwner) {
      const follow = await this.prisma.profileFollow.findUnique({
        where: {
          profileId_followerId: {
            profileId: post.profileId,
            followerId: currentProfileId,
          },
        },
      });
      if (!follow?.accepted) {
        throw new ForbiddenException(ERROR_MESSAGES.PROFILE_IS_PRIVATE);
      }
    }

    return post;
  }

  async create(userId: string, dto: CreatePostDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const assets = await this.prisma.asset.findMany({ where: { id: { in: dto.assetIds } } });
    if (assets.length !== dto.assetIds.length) {
      throw new BadRequestException(ERROR_MESSAGES.ASSETS_DO_NOT_EXIST);
    }

    const post = await this.prisma.post.create({
      data: {
        content: dto.content,
        profileId: currentProfile.id,
        postAssets: {
          create: dto.assetIds.map((assetId, orderIndex) => ({
            assetId,
            orderIndex,
          })),
        },
      },
      include: this.getPostInclude(currentProfile.id),
    });

    return toPostResponse(post);
  }

  async findOne(id: string, userId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const post = await this.getAccessiblePost(id, currentProfile.id);
    return toPostResponse(post);
  }

  async update(id: string, userId: string, dto: UpdatePostDto) {
    const { post, currentProfile } = await this.getPostAndCheckOwnership(id, userId);
    if (post.isArchived) {
      throw new BadRequestException(ERROR_MESSAGES.ARCHIVED_POST_CANNOT_BE_MODIFIED);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.assetIds) {
        const assets = await tx.asset.findMany({
          where: {
            id: { in: dto.assetIds },
          },
        });

        if (assets.length !== dto.assetIds.length) {
          throw new BadRequestException(ERROR_MESSAGES.ASSETS_DO_NOT_EXIST);
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

      const updatedPost = await tx.post.update({
        where: { id },
        data: {
          content: dto.content,
        },
        include: this.getPostInclude(currentProfile.id),
      });

      return toPostResponse(updatedPost);
    });
  }

  async remove(id: string, userId: string) {
    await this.getPostAndCheckOwnership(id, userId);

    await this.prisma.post.delete({ where: { id } });
  }

  async archivePost(id: string, userId: string) {
    const { currentProfile } = await this.getPostAndCheckOwnership(id, userId);

    const archivedPost = await this.prisma.post.update({
      where: { id },
      data: {
        isArchived: true,
      },
      include: this.getPostInclude(currentProfile.id),
    });

    return toPostResponse(archivedPost);
  }

  async findMyPosts(userId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);

    const items = await this.prisma.post.findMany({
      where: { profileId: currentProfile.id, isArchived: false },
      orderBy: { createdAt: 'desc' },
      include: this.getPostInclude(currentProfile.id),
    });

    return items.map((post) => toPostResponse(post));
  }

  async findMyArchivedPosts(userId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);

    const items = await this.prisma.post.findMany({
      where: { profileId: currentProfile.id, isArchived: true },
      orderBy: { createdAt: 'desc' },
      include: this.getPostInclude(currentProfile.id),
    });

    return items.map((post) => toPostResponse(post));
  }

  async getFeed(userId: string, query: PaginationQueryDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const authorIds = await this.getAcceptedFollowingIds(currentProfile.id);

    if (authorIds.length === 0) {
      return createPaginatedResponse([], 0, query);
    }

    const { skip, take } = getPaginationOffsets(query);

    const where: Prisma.PostWhereInput = {
      profileId: {
        in: authorIds,
      },
      isArchived: false,
    };

    const [total, items] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: this.getPostInclude(currentProfile.id),
      }),
    ]);

    const posts = items.map((post) => toPostResponse(post));
    return createPaginatedResponse(posts, total, query);
  }

  async search(userId: string, searchDto: SearchPostDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const visibleFilter = await this.getVisiblePostsFilter(currentProfile.id);

    const where: Prisma.PostWhereInput = {
      ...visibleFilter,
      content: {
        contains: searchDto.query,
        mode: 'insensitive',
      },
    };

    const { skip, take } = getPaginationOffsets(searchDto);

    const [total, items] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: this.getPostInclude(currentProfile.id),
      }),
    ]);

    const posts = items.map((post) => toPostResponse(post));
    return createPaginatedResponse(posts, total, searchDto);
  }

  async likePost(postId: string, userId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const post = await this.getAccessiblePost(postId, currentProfile.id);

    if (post.isArchived) {
      throw new BadRequestException(ERROR_MESSAGES.ARCHIVED_POST_CANNOT_BE_MODIFIED);
    }

    const existingLike = await this.prisma.postLike.findUnique({
      where: { postId_profileId: { postId, profileId: currentProfile.id } },
    });
    if (existingLike) {
      throw new ConflictException(ERROR_MESSAGES.POST_ALREADY_LIKED);
    }

    await this.prisma.postLike.create({ data: { postId, profileId: currentProfile.id } });
    return { message: SUCCESS_MESSAGES.POST_LIKED };
  }

  async unlikePost(postId: string, userId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);

    try {
      await this.prisma.postLike.delete({
        where: { postId_profileId: { postId, profileId: currentProfile.id } },
      });
      return { message: SUCCESS_MESSAGES.POST_UNLIKED };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(ERROR_MESSAGES.POST_LIKE_NOT_FOUND);
      }
      throw error;
    }
  }

  async getPostLikes(postId: string, userId: string, query: PaginationQueryDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    await this.getAccessiblePost(postId, currentProfile.id);

    const { skip, take } = getPaginationOffsets(query);
    const where: Prisma.PostLikeWhereInput = { postId };

    const [total, items] = await Promise.all([
      this.prisma.postLike.count({ where }),
      this.prisma.postLike.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: { select: PROFILE_PREVIEW_SELECT },
        },
      }),
    ]);

    return createPaginatedResponse(items, total, query);
  }

  async findMyLikedPosts(userId: string, query: PaginationQueryDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const visibleFilter = await this.getVisiblePostsFilter(currentProfile.id);

    const { skip, take } = getPaginationOffsets(query);
    const where: Prisma.PostLikeWhereInput = {
      profileId: currentProfile.id,
      post: visibleFilter,
    };

    const [total, items] = await Promise.all([
      this.prisma.postLike.count({ where }),
      this.prisma.postLike.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { post: { include: this.getPostInclude(currentProfile.id) } },
      }),
    ]);

    const posts = items.map((like) => toPostResponse(like.post));
    return createPaginatedResponse(posts, total, query);
  }

  async findMyCommentedPosts(userId: string, query: PaginationQueryDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const visibleFilter = await this.getVisiblePostsFilter(currentProfile.id);

    const { skip, take } = getPaginationOffsets(query);
    const where: Prisma.PostWhereInput = {
      ...visibleFilter,
      comments: { some: { profileId: currentProfile.id } },
    };

    const [total, items] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: this.getPostInclude(currentProfile.id),
      }),
    ]);

    const posts = items.map((post) => toPostResponse(post));
    return createPaginatedResponse(posts, total, query);
  }
}
