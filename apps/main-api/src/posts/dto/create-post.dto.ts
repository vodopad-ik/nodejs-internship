import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePostDto {
  @ApiProperty({
    example: 'Sunset over the mountains',
    description: 'Post text caption',
    minLength: 1,
    maxLength: 2200,
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2200)
  content!: string;

  @ApiProperty({
    example: ['clx123asset1', 'clx123asset2'],
    description: 'Array of uploaded asset IDs (1 to 10 unique IDs)',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  assetIds!: string[];
}
