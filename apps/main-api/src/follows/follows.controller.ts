import { Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessGuard } from '../auth/guards/access.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FollowsService } from './follows.service';

@ApiTags('follows')
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':targetProfileId')
  @ApiOperation({ summary: 'Follow a user or send a follow request' })
  async follow(@CurrentUserId() userId: string, @Param('targetProfileId') targetProfileId: string) {
    return this.followsService.follow(userId, targetProfileId);
  }

  @Delete('followers/:followerProfileId')
  @ApiOperation({ summary: 'Remove a user from my followers' })
  async removeFollower(
    @CurrentUserId() userId: string,
    @Param('followerProfileId') followerProfileId: string,
  ) {
    return this.followsService.removeFollower(userId, followerProfileId);
  }

  @Delete('requests/:followerProfileId/reject')
  @ApiOperation({ summary: 'Reject an incoming follow request' })
  async rejectRequest(
    @CurrentUserId() userId: string,
    @Param('followerProfileId') followerProfileId: string,
  ) {
    return this.followsService.rejectRequest(userId, followerProfileId);
  }

  @Delete(':targetProfileId')
  @ApiOperation({ summary: 'Unfollow a user or cancel sent follow request' })
  async unfollow(
    @CurrentUserId() userId: string,
    @Param('targetProfileId') targetProfileId: string,
  ) {
    return this.followsService.unfollow(userId, targetProfileId);
  }

  @Get('requests/incoming')
  @ApiOperation({ summary: 'Get list of incoming pending follow requests' })
  async getIncomingRequests(@CurrentUserId() userId: string, @Query() query: PaginationQueryDto) {
    return this.followsService.getIncomingRequests(userId, query);
  }

  @Get('requests/sent')
  @ApiOperation({ summary: 'Get list of sent pending follow requests' })
  async getSentRequests(@CurrentUserId() userId: string, @Query() query: PaginationQueryDto) {
    return this.followsService.getSentRequests(userId, query);
  }

  @Patch('requests/:followerProfileId/accept')
  @ApiOperation({ summary: 'Accept an incoming follow request' })
  async acceptRequest(
    @CurrentUserId() userId: string,
    @Param('followerProfileId') followerProfileId: string,
  ) {
    return this.followsService.acceptRequest(userId, followerProfileId);
  }

  @Get(':profileId/followers')
  @ApiOperation({ summary: 'Get paginated list of followers of a profile' })
  async getFollowers(
    @Param('profileId') profileId: string,
    @CurrentUserId() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.followsService.getFollowers(profileId, userId, query);
  }

  @Get(':profileId/following')
  @ApiOperation({ summary: 'Get paginated list of profiles followed by a profile' })
  async getFollowing(
    @Param('profileId') profileId: string,
    @CurrentUserId() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.followsService.getFollowing(profileId, userId, query);
  }
}
