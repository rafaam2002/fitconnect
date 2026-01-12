import crypto from 'crypto';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { EntityManager } from '@mikro-orm/core';
import dotenv from 'dotenv';

import { ServiceResponse } from '../types/common.type';
import { CurrentUser } from '../types/common.type';
import {
  UnauthorizedError,
  InternalServerError,
  createServiceResponse,
} from '../utils/errors.util';

import { BaseService } from './base.service';

dotenv.config();

const bucketName =
  process.env.AWS_BUCKET_NAME || 'pre-signed-url-demo-gondorwebmasters';
const region = process.env.AWS_REGION || 'eu-north-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

export class S3Service extends BaseService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(em: EntityManager) {
    super(em);
    this.s3Client = s3;
    this.bucketName = bucketName;
  }

  /**
   * Generar presigned URL para subir imagen a S3
   */
  public async getPresignedUrl(
    currentUser: CurrentUser,
    key?: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      // Generar key aleatorio si no se proporciona
      const Key = key || `${crypto.randomUUID()}.jpeg`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key,
        ContentType: 'image/jpeg',
      });

      // Generar presigned URL con expiración de 2 minutos
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 60 * 2,
      });

      return createServiceResponse(
        200,
        'Presigned URL generated successfully',
        true,
        {
          presignedUrl: url,
          key: Key,
        }
      );
    } catch (error: any) {
      console.error('Error generating presigned URL:', error);
      throw new InternalServerError('Error generating presigned URL');
    }
  }
}
