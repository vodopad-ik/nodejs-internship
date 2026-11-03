import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}
