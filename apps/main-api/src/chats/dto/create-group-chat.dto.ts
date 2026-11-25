import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateGroupChatDto {
  @ApiProperty({
    example: 'Backend Developers',
    description: 'Group chat title',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({
    example: 'Group chat for discussing architecture and PRs',
    description: 'Optional group chat description',
    maxLength: 500,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: ['clx111aaa222bbb333', 'clx444ccc555ddd666'],
    description: 'Profile IDs of initial group chat participants (minimum 2 other users)',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  participantProfileIds: string[];
}
