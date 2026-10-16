import { ApiProperty } from '@nestjs/swagger';

export class UploadAssetsDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Array of media files to upload (up to 10 files, max 15MB each)',
  })
  files!: Express.Multer.File[];
}
