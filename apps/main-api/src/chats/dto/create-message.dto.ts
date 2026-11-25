import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMessageDto {
  @ApiPropertyOptional({
    example: 'Hey! Check out these screenshots.',
    description: 'Message text content',
    maxLength: 4000,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(4000)
  content?: string;

  @ApiPropertyOptional({
    example: ['clx111asset001', 'clx111asset002'],
    description: 'Ordered array of attached media asset IDs (maximum 10)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  assetIds?: string[];

  @ApiPropertyOptional({
    example: 'clx999msg123',
    description: 'Optional message ID within the same chat to reply to',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  replyToMessageId?: string;
}
