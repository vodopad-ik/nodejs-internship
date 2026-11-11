import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Profile } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { createPaginatedResponse, getPaginationOffsets } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { FollowResponseDto, FollowStatus } from './dto/follow-response.dto';

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private async assertCanViewProfile(targetProfile: Profile, currentUserId: string): Promise<void> {
    if (targetProfile.isPublic) return;

    const currentProfile = await this.usersService.getProfileByUserId(currentUserId);
    if (currentProfile.id === targetProfile.id) return;

    const follow = await this.prisma.profileFollow.findUnique({
      where: {
        profileId_followerId: { profileId: targetProfile.id, followerId: currentProfile.id },
      },
    });
    if (!follow?.accepted) {
      throw new ForbiddenException('This profile is private');
    }
  }

  async follow(currentUserId: string, targetProfileId: string) {
    const currentProfile = await this.usersService.getProfileByUserId(currentUserId);

    if (currentProfile.id === targetProfileId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const targetProfile = await this.prisma.profile.findUnique({
      where: { id: targetProfileId },
    });

    if (!targetProfile) {
      throw new NotFoundException('Target profile not found');
    }

    const existing = await this.prisma.profileFollow.findUnique({
      where: {
        profileId_followerId: { profileId: targetProfile.id, followerId: currentProfile.id },
      },
    });

    if (existing) {
      if (existing.accepted) {
        throw new ConflictException('You are already following this profile');
      }
      throw new ConflictException('Follow request is already pending');
    }

    const follow = await this.prisma.profileFollow.create({
      data: {
        profileId: targetProfile.id,
        followerId: currentProfile.id,
        accepted: targetProfile.isPublic,
      },
    });

    const followResponse = new FollowResponseDto();
    followResponse.status = targetProfile.isPublic
      ? FollowStatus.FOLLOWING
      : FollowStatus.REQUESTED;
    followResponse.profileId = follow.profileId;
    followResponse.followerId = follow.followerId;
    followResponse.accepted = follow.accepted;
    return followResponse;
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
      return { message: 'Successfully unfollowed' };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Follow relationship not found');
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
      return { message: 'Follower successfully removed' };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Follower relationship not found');
      }
      throw error;
    }
  }

  async getFollowers(profileId: string, currentUserId: string, query: PaginationQueryDto) {
    const targetProfile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!targetProfile) {
      throw new NotFoundException('Profile not found');
    }

    await this.assertCanViewProfile(targetProfile, currentUserId);

    const { skip, take } = getPaginationOffsets(query);
    const where = { profileId, accepted: true };

    const [total, items] = await this.prisma.$transaction([
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
      throw new NotFoundException('Profile not found');
    }

    await this.assertCanViewProfile(targetProfile, currentUserId);

    const { skip, take } = getPaginationOffsets(query);
    const where = { followerId: profileId, accepted: true };

    const [total, items] = await this.prisma.$transaction([
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

    const [total, items] = await this.prisma.$transaction([
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

    const [total, items] = await this.prisma.$transaction([
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
      throw new NotFoundException('Follow request not found');
    }
    if (request.accepted) {
      throw new ConflictException('Follow request is already accepted');
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
      throw new NotFoundException('Follow request not found');
    }
    if (request.accepted) {
      throw new BadRequestException('Cannot reject an already accepted follow request');
    }

    await this.prisma.profileFollow.delete({ where });
    return { message: 'Follow request rejected' };
  }
}
