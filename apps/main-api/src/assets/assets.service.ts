import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AssetsService {
  constructor(
    private storage: StorageService,
    private prisma: PrismaService,
  ) {}

  async uploadAssets(files: Express.Multer.File[]) {
    const uploadPairs = await Promise.all(
      files.map(async (file) => {
        const uploaded = await this.storage.uploadFile(file);
        return { file, uploaded };
      }),
    );
    return this.prisma.$transaction(
      uploadPairs.map(({ file, uploaded }) => {
        return this.prisma.asset.create({
          data: {
            fileName: file.originalname,
            filePath: uploaded.url,
            fileType: file.mimetype,
            fileSize: file.size,
          },
        });
      }),
    );
  }
}
