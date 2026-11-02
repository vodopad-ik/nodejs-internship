import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @Min(1)
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  page: number = 1;

  @Max(50)
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  limit: number = 10;
}
