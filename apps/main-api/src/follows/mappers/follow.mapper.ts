import { ProfileFollow } from '@prisma/client';
import { FollowResponseDto, FollowStatus } from '../dto/follow-response.dto';

export function toFollowResponseDto(follow: ProfileFollow): FollowResponseDto {
  const followResponse = new FollowResponseDto();
  followResponse.status = follow.accepted ? FollowStatus.FOLLOWING : FollowStatus.REQUESTED;
  followResponse.profileId = follow.profileId;
  followResponse.followerId = follow.followerId;
  followResponse.accepted = follow.accepted;
  return followResponse;
}
