import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LeaveChatDto {
  @ApiPropertyOptional({
    example: 'clx123abc456def789',
    description: 'Profile ID of another group participant to transfer admin role to when leaving',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  newAdminProfileId?: string;
}
