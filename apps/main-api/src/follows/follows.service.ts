import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Profile } from '@prisma/client';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../common/constants/messages.constants';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createPaginatedResponse, getPaginationOffsets } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { toFollowResponseDto } from './mappers/follow.mapper';

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private async assertCanViewProfile(targetProfile: Profile, currentUserId: string): Promise<void> {
    if (targetProfile.isPublic) {
      return;
    }

    const currentProfile = await this.usersService.getProfileByUserId(currentUserId);
    const isOwner = currentProfile.id === targetProfile.id;
    if (!isOwner) {
      const follow = await this.prisma.profileFollow.findUnique({
        where: {
          profileId_followerId: { profileId: targetProfile.id, followerId: currentProfile.id },
        },
      });
      if (!follow?.accepted) {
        throw new ForbiddenException(ERROR_MESSAGES.PROFILE_IS_PRIVATE);
      }
    }
  }

  async follow(currentUserId: string, targetProfileId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(currentUserId);

    if (currentProfile.id === targetProfileId) {
      throw new BadRequestException(ERROR_MESSAGES.CANNOT_FOLLOW_SELF);
    }

    const targetProfile = await this.prisma.profile.findUnique({
      where: { id: targetProfileId },
    });

    if (!targetProfile) {
      throw new NotFoundException(ERROR_MESSAGES.TARGET_PROFILE_NOT_FOUND);
    }

    const existing = await this.prisma.profileFollow.findUnique({
      where: {
        profileId_followerId: { profileId: targetProfile.id, followerId: currentProfile.id },
      },
    });

    if (existing) {
      if (existing.accepted) {
        throw new ConflictException(ERROR_MESSAGES.ALREADY_FOLLOWING);
      }
      throw new ConflictException(ERROR_MESSAGES.FOLLOW_REQUEST_PENDING);
    }

    const follow = await this.prisma.profileFollow.create({
      data: {
        profileId: targetProfile.id,
        followerId: currentProfile.id,
        accepted: targetProfile.isPublic,
      },
    });

    return toFollowResponseDto(follow, targetProfile.isPublic);
  }

  async unfollow(currentUserId: string, targetProfileId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(currentUserId);
    try {
      await this.prisma.profileFollow.delete({
        where: {
          profileId_followerId: {
            profileId: targetProfileId,
            followerId: currentProfile.id,
          },
        },
      });
      return { message: SUCCESS_MESSAGES.UNFOLLOWED };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(ERROR_MESSAGES.FOLLOW_NOT_FOUND);
      }
      throw error;
    }
  }

  async removeFollower(currentUserId: string, followerProfileId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(currentUserId);
    try {
      await this.prisma.profileFollow.delete({
        where: {
          profileId_followerId: {
            profileId: currentProfile.id,
            followerId: followerProfileId,
          },
        },
      });
      return { message: SUCCESS_MESSAGES.FOLLOWER_REMOVED };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(ERROR_MESSAGES.FOLLOWER_NOT_FOUND);
      }
      throw error;
    }
  }

  async getFollowers(profileId: string, currentUserId: string, query: PaginationQueryDto) {
    const targetProfile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!targetProfile) {
      throw new NotFoundException(ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }

    await this.assertCanViewProfile(targetProfile, currentUserId);

    const { skip, take } = getPaginationOffsets(query);
    const where = { profileId, accepted: true };

    const [total, items] = await Promise.all([
      this.prisma.profileFollow.count({ where }),
      this.prisma.profileFollow.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return createPaginatedResponse(items, total, query);
  }

  async getFollowing(profileId: string, currentUserId: string, query: PaginationQueryDto) {
    const targetProfile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!targetProfile) {
      throw new NotFoundException(ERROR_MESSAGES.PROFILE_NOT_FOUND);
    }

    await this.assertCanViewProfile(targetProfile, currentUserId);

    const { skip, take } = getPaginationOffsets(query);
    const where = { followerId: profileId, accepted: true };

    const [total, items] = await Promise.all([
      this.prisma.profileFollow.count({ where }),
      this.prisma.profileFollow.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          following: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return createPaginatedResponse(items, total, query);
  }

  async getIncomingRequests(currentUserId: string, query: PaginationQueryDto) {
    const currentProfile = await this.usersService.getProfileByUserId(currentUserId);

    const { skip, take } = getPaginationOffsets(query);
    const where = { profileId: currentProfile.id, accepted: false };

    const [total, items] = await Promise.all([
      this.prisma.profileFollow.count({ where }),
      this.prisma.profileFollow.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return createPaginatedResponse(items, total, query);
  }

  async getSentRequests(currentUserId: string, query: PaginationQueryDto) {
    const currentProfile = await this.usersService.getProfileByUserId(currentUserId);

    const { skip, take } = getPaginationOffsets(query);
    const where = { followerId: currentProfile.id, accepted: false };

    const [total, items] = await Promise.all([
      this.prisma.profileFollow.count({ where }),
      this.prisma.profileFollow.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          following: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return createPaginatedResponse(items, total, query);
  }

  async acceptRequest(currentUserId: string, followerProfileId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(currentUserId);

    const where = {
      profileId_followerId: { profileId: currentProfile.id, followerId: followerProfileId },
    };
    const request = await this.prisma.profileFollow.findUnique({ where });

    if (!request) {
      throw new NotFoundException(ERROR_MESSAGES.FOLLOW_REQUEST_NOT_FOUND);
    }
    if (request.accepted) {
      throw new ConflictException(ERROR_MESSAGES.FOLLOW_REQUEST_ALREADY_ACCEPTED);
    }

    return this.prisma.profileFollow.update({
      where,
      data: { accepted: true },
    });
  }

  async rejectRequest(currentUserId: string, followerProfileId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(currentUserId);

    const where = {
      profileId_followerId: { profileId: currentProfile.id, followerId: followerProfileId },
    };
    const request = await this.prisma.profileFollow.findUnique({ where });

    if (!request) {
      throw new NotFoundException(ERROR_MESSAGES.FOLLOW_REQUEST_NOT_FOUND);
    }
    if (request.accepted) {
      throw new BadRequestException(ERROR_MESSAGES.CANNOT_REJECT_ACCEPTED_REQUEST);
    }

    await this.prisma.profileFollow.delete({ where });
    return { message: SUCCESS_MESSAGES.FOLLOW_REQUEST_REJECTED };
  }
}
