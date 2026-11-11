import { ApiProperty } from '@nestjs/swagger';

export enum FollowStatus {
  FOLLOWING = 'FOLLOWING',
  REQUESTED = 'REQUESTED',
}

export class FollowResponseDto {
  @ApiProperty({ example: 'clx...targetProfileId' })
  profileId!: string;

  @ApiProperty({ example: 'clx...currentProfileId' })
  followerId!: string;

  @ApiProperty({ example: true })
  accepted!: boolean;

  @ApiProperty({ enum: FollowStatus, example: FollowStatus.FOLLOWING })
  status!: FollowStatus;
}
