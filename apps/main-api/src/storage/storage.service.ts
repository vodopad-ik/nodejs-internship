import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private readonly config: ConfigService) {
    const endPoint = this.config.get<string>('MINIO_ENDPOINT') || 'localhost';
    const port = Number(this.config.get<string>('MINIO_PORT')) || 9000;
    const useSSL = this.config.get<string>('MINIO_USE_SSL') === 'true';
    const accessKey = this.config.get<string>('MINIO_ROOT_USER') || 'minioadmin';
    const secretKey = this.config.get<string>('MINIO_ROOT_PASSWORD') || 'minioadminpassword';

    this.client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    this.bucket = this.config.get<string>('MINIO_BUCKET_NAME') || 'innogram-media';
  }

  async onModuleInit() {
    const isBucketExist = await this.client.bucketExists(this.bucket);
    if (!isBucketExist) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Bucket "${this.bucket}" created successfully`);
    }

    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucket}/*`],
        },
      ],
    };
    await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'posts',
  ): Promise<{ url: string; key: string }> {
    const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${file.originalname}`;
    await this.client.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });
    const url = `http://${this.config.get('MINIO_ENDPOINT') || 'localhost'}:${this.config.get('MINIO_PORT') || 9000}/${this.bucket}/${key}`;
    return { url, key };
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
