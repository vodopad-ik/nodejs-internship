import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../common/constants/messages.constants';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createPaginatedResponse, getPaginationOffsets } from '../common/utils/pagination.util';
import { PostsService } from '../posts/posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { MentionProfile, toCommentResponse } from './mappers/comment.mapper';
import { extractMentionUsernames } from './utils/mention.util';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService,
    private readonly usersService: UsersService,
  ) {}

  private getCommentInclude(currentProfileId: string) {
    return {
      profile: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
      likes: {
        where: { profileId: currentProfileId },
        select: { profileId: true },
      },
    };
  }

  private async buildMentionsMap(contents: string[]): Promise<Map<string, MentionProfile>> {
    const uniqueUsernames = new Set(
      contents.flatMap((content) => extractMentionUsernames(content)),
    );

    if (uniqueUsernames.size === 0) {
      return new Map();
    }

    const profiles = await this.prisma.profile.findMany({
      where: { username: { in: Array.from(uniqueUsernames), mode: 'insensitive' } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });

    const mentionsMap = new Map<string, MentionProfile>();
    for (const profile of profiles) {
      mentionsMap.set(profile.username.toLowerCase(), profile);
    }

    return mentionsMap;
  }

  private async getCommentWithAccessCheck(commentId: string, currentProfileId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException(ERROR_MESSAGES.COMMENT_NOT_FOUND);
    }

    const post = await this.postsService.getAccessiblePost(comment.postId, currentProfileId);
    return { comment, post };
  }

  private async getCommentAndCheckOwnership(commentId: string, userId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: { select: { isArchived: true } } },
    });
    if (!comment) {
      throw new NotFoundException(ERROR_MESSAGES.COMMENT_NOT_FOUND);
    }
    if (comment.profileId !== currentProfile.id) {
      throw new ForbiddenException(ERROR_MESSAGES.NOT_ALLOWED_TO_MODIFY_COMMENT);
    }

    return { comment, currentProfile };
  }

  async create(postId: string, userId: string, dto: CreateCommentDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const post = await this.postsService.getAccessiblePost(postId, currentProfile.id);
    if (post.isArchived) {
      throw new BadRequestException(ERROR_MESSAGES.ARCHIVED_POST_CANNOT_BE_MODIFIED);
    }

    if (dto.parentCommentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentCommentId },
        select: { id: true, postId: true },
      });
      if (!parentComment) {
        throw new NotFoundException(ERROR_MESSAGES.PARENT_COMMENT_NOT_FOUND);
      }
      if (parentComment.postId !== postId) {
        throw new BadRequestException(ERROR_MESSAGES.PARENT_COMMENT_WRONG_POST);
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        profileId: currentProfile.id,
        parentCommentId: dto.parentCommentId,
        content: dto.content,
      },
      include: this.getCommentInclude(currentProfile.id),
    });

    const mentionsMap = await this.buildMentionsMap([comment.content]);
    return toCommentResponse(comment, mentionsMap);
  }

  async findByPost(postId: string, userId: string, query: PaginationQueryDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    await this.postsService.getAccessiblePost(postId, currentProfile.id);

    const { skip, take } = getPaginationOffsets(query);
    const where = { postId, parentCommentId: null };

    const [total, items] = await Promise.all([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: this.getCommentInclude(currentProfile.id),
      }),
    ]);
    const mentionsMap = await this.buildMentionsMap(items.map((item) => item.content));
    const comments = items.map((item) => toCommentResponse(item, mentionsMap));
    return createPaginatedResponse(comments, total, query);
  }

  async findReplies(commentId: string, userId: string, query: PaginationQueryDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    await this.getCommentWithAccessCheck(commentId, currentProfile.id);
    const { skip, take } = getPaginationOffsets(query);
    const where = { parentCommentId: commentId };

    const [total, items] = await Promise.all([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: this.getCommentInclude(currentProfile.id),
      }),
    ]);

    const mentionsMap = await this.buildMentionsMap(items.map((item) => item.content));
    const comments = items.map((item) => toCommentResponse(item, mentionsMap));
    return createPaginatedResponse(comments, total, query);
  }

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const { comment, currentProfile } = await this.getCommentAndCheckOwnership(commentId, userId);
    if (comment.post.isArchived) {
      throw new BadRequestException(ERROR_MESSAGES.ARCHIVED_POST_CANNOT_BE_MODIFIED);
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: this.getCommentInclude(currentProfile.id),
    });

    const mentionsMap = await this.buildMentionsMap([updatedComment.content]);
    return toCommentResponse(updatedComment, mentionsMap);
  }

  async remove(commentId: string, userId: string) {
    await this.getCommentAndCheckOwnership(commentId, userId);
    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  async likeComment(commentId: string, userId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    const { post } = await this.getCommentWithAccessCheck(commentId, currentProfile.id);
    if (post.isArchived) {
      throw new BadRequestException(ERROR_MESSAGES.ARCHIVED_POST_CANNOT_BE_MODIFIED);
    }
    const existingLike = await this.prisma.commentLike.findUnique({
      where: { commentId_profileId: { commentId, profileId: currentProfile.id } },
    });

    if (existingLike) {
      throw new ConflictException(ERROR_MESSAGES.COMMENT_ALREADY_LIKED);
    }
    await this.prisma.commentLike.create({ data: { commentId, profileId: currentProfile.id } });
    return { message: SUCCESS_MESSAGES.COMMENT_LIKED };
  }

  async unlikeComment(commentId: string, userId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    try {
      await this.prisma.commentLike.delete({
        where: { commentId_profileId: { commentId, profileId: currentProfile.id } },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(ERROR_MESSAGES.COMMENT_LIKE_NOT_FOUND);
      }
      throw error;
    }
    return { message: SUCCESS_MESSAGES.COMMENT_UNLIKED };
  }

  async getCommentLikes(commentId: string, userId: string, query: PaginationQueryDto) {
    const currentProfile = await this.usersService.getProfileByUserId(userId);
    await this.getCommentWithAccessCheck(commentId, currentProfile.id);

    const { skip, take } = getPaginationOffsets(query);
    const where = {
      commentId,
    };

    const [total, items] = await Promise.all([
      this.prisma.commentLike.count({ where }),
      this.prisma.commentLike.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
    ]);

    return createPaginatedResponse(items, total, query);
  }
}
