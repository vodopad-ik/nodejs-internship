import { Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard } from '../auth/guards/access.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FollowResponseDto } from './dto/follow-response.dto';
import { FollowsService } from './follows.service';

@ApiTags('follows')
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':targetProfileId')
  @ApiOperation({ summary: 'Follow a user or send a follow request' })
  @ApiParam({ name: 'targetProfileId', description: 'Target profile ID' })
  @ApiCreatedResponse({ type: FollowResponseDto, description: 'Follow relationship created' })
  @ApiNotFoundResponse({ description: 'Target profile not found' })
  async follow(@CurrentUserId() userId: string, @Param('targetProfileId') targetProfileId: string) {
    return this.followsService.follow(userId, targetProfileId);
  }

  @Delete('followers/:followerProfileId')
  @ApiOperation({ summary: 'Remove a user from my followers' })
  @ApiParam({ name: 'followerProfileId', description: 'Follower profile ID' })
  @ApiOkResponse({ description: 'Follower removed successfully' })
  @ApiNotFoundResponse({ description: 'Follower relationship not found' })
  async removeFollower(
    @CurrentUserId() userId: string,
    @Param('followerProfileId') followerProfileId: string,
  ) {
    return this.followsService.removeFollower(userId, followerProfileId);
  }

  @Delete('requests/:followerProfileId/reject')
  @ApiOperation({ summary: 'Reject an incoming follow request' })
  @ApiParam({ name: 'followerProfileId', description: 'Follower profile ID' })
  @ApiOkResponse({ description: 'Follow request rejected' })
  @ApiNotFoundResponse({ description: 'Follow request not found' })
  async rejectRequest(
    @CurrentUserId() userId: string,
    @Param('followerProfileId') followerProfileId: string,
  ) {
    return this.followsService.rejectRequest(userId, followerProfileId);
  }

  @Delete(':targetProfileId')
  @ApiOperation({ summary: 'Unfollow a user or cancel sent follow request' })
  @ApiParam({ name: 'targetProfileId', description: 'Target profile ID' })
  @ApiOkResponse({ description: 'Unfollowed successfully' })
  @ApiNotFoundResponse({ description: 'Follow relationship not found' })
  async unfollow(
    @CurrentUserId() userId: string,
    @Param('targetProfileId') targetProfileId: string,
  ) {
    return this.followsService.unfollow(userId, targetProfileId);
  }

  @Get('requests/incoming')
  @ApiOperation({ summary: 'Get list of incoming pending follow requests' })
  @ApiOkResponse({ description: 'Paginated list of incoming follow requests' })
  async getIncomingRequests(@CurrentUserId() userId: string, @Query() query: PaginationQueryDto) {
    return this.followsService.getIncomingRequests(userId, query);
  }

  @Get('requests/sent')
  @ApiOperation({ summary: 'Get list of sent pending follow requests' })
  @ApiOkResponse({ description: 'Paginated list of sent follow requests' })
  async getSentRequests(@CurrentUserId() userId: string, @Query() query: PaginationQueryDto) {
    return this.followsService.getSentRequests(userId, query);
  }

  @Patch('requests/:followerProfileId/accept')
  @ApiOperation({ summary: 'Accept an incoming follow request' })
  @ApiParam({ name: 'followerProfileId', description: 'Follower profile ID' })
  @ApiOkResponse({ type: FollowResponseDto, description: 'Follow request accepted' })
  @ApiNotFoundResponse({ description: 'Follow request not found' })
  async acceptRequest(
    @CurrentUserId() userId: string,
    @Param('followerProfileId') followerProfileId: string,
  ) {
    return this.followsService.acceptRequest(userId, followerProfileId);
  }

  @Get(':profileId/followers')
  @ApiOperation({ summary: 'Get paginated list of followers of a profile' })
  @ApiParam({ name: 'profileId', description: 'Profile ID' })
  @ApiOkResponse({ description: 'Paginated list of followers' })
  @ApiForbiddenResponse({ description: 'Profile is private' })
  @ApiNotFoundResponse({ description: 'Profile not found' })
  async getFollowers(
    @Param('profileId') profileId: string,
    @CurrentUserId() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.followsService.getFollowers(profileId, userId, query);
  }

  @Get(':profileId/following')
  @ApiOperation({ summary: 'Get paginated list of profiles followed by a profile' })
  @ApiParam({ name: 'profileId', description: 'Profile ID' })
  @ApiOkResponse({ description: 'Paginated list of followed profiles' })
  @ApiForbiddenResponse({ description: 'Profile is private' })
  @ApiNotFoundResponse({ description: 'Profile not found' })
  async getFollowing(
    @Param('profileId') profileId: string,
    @CurrentUserId() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.followsService.getFollowing(profileId, userId, query);
  }
}
