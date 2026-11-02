import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class SearchPostDto extends PaginationQueryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  query!: string;
}
