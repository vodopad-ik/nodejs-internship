import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePrivateChatDto {
  @ApiProperty({
    example: 'clx123abc456def789',
    description: 'Target participant profile ID for 1-on-1 private chat',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  participantProfileId: string;
}
