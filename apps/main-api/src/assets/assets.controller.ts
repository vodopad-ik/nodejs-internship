import {
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard } from '../auth/guards/access.guard';
import { AssetsService } from './assets.service';
import { UploadAssetsDto } from './dto/upload-assets.dto';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload up to 10 media files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadAssetsDto })
  @ApiCreatedResponse({ description: 'Files uploaded successfully' })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadFiles(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 15 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|mp4)$/ }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.assetsService.uploadAssets(files);
  }
}
