import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Great shot, @johndoe!',
    description: 'Comment text content (supports @username mentions)',
    minLength: 1,
    maxLength: 2200,
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2200)
  content: string;

  @ApiPropertyOptional({
    example: 'clx123abc456def789',
    description: 'Optional parent comment ID when replying to an existing comment',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  parentCommentId?: string;
}
