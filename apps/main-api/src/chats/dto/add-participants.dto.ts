import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AddParticipantsDto {
  @ApiProperty({
    example: ['clx111aaa222bbb333'],
    description: 'Profile IDs of users to add to the group chat',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  profileIds: string[];
}
