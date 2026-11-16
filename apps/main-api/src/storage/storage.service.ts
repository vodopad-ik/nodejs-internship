import crypto from 'crypto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;
  private readonly endPoint: string;
  private readonly port: number;
  private readonly useSSL: boolean;

  constructor(private readonly config: ConfigService) {
    this.endPoint = this.config.get<string>('MINIO_ENDPOINT') || 'localhost';
    this.port = Number(this.config.get<string>('MINIO_PORT')) || 9000;
    this.useSSL = this.config.get<string>('MINIO_USE_SSL') === 'true';
    const accessKey = this.config.get<string>('MINIO_ROOT_USER') || 'minioadmin';
    const secretKey = this.config.get<string>('MINIO_ROOT_PASSWORD') || 'minioadminpassword';

    this.client = new Minio.Client({
      endPoint: this.endPoint,
      port: this.port,
      useSSL: this.useSSL,
      accessKey,
      secretKey,
    });

    this.bucket = this.config.get<string>('MINIO_BUCKET_NAME') || 'innogram-media';
  }

  async onModuleInit() {
    try {
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
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to initialize MinIO bucket "${this.bucket}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'posts',
  ): Promise<{ url: string; key: string }> {
    const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${file.originalname}`;
    await this.client.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });
    const protocol = this.useSSL ? 'https' : 'http';
    const url = `${protocol}://${this.endPoint}:${this.port}/${this.bucket}/${key}`;
    return { url, key };
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
