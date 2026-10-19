import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @MaxLength(2200)
  @IsString()
  content!: string;

  @IsArray()
  @ArrayMaxSize(10)
  @ArrayMinSize(1)
  @IsString({ each: true })
  assetIds!: string[];
}
