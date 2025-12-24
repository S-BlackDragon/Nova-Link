import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
    private s3Client: S3Client;
    private bucket: string;
    private publicUrl: string;

    constructor() {
        this.s3Client = new S3Client({
            endpoint: process.env.MINIO_ENDPOINT || 'http://163.192.96.105:9000',
            region: 'us-east-1', // MinIO requires a region, but ignores it
            credentials: {
                accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
                secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
            },
            forcePathStyle: true, // Required for MinIO
        });
        this.bucket = process.env.MINIO_BUCKET || 'avatars';
        this.publicUrl = process.env.MINIO_PUBLIC_URL || process.env.MINIO_ENDPOINT || 'http://163.192.96.105:9000';
    }

    /**
     * Generate a pre-signed URL for uploading a file directly to MinIO
     */
    async getPresignedUploadUrl(
        userId: string,
        contentType: string,
    ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
        // Generate unique key: avatars/userId/timestamp-random.ext
        const ext = this.getExtensionFromMime(contentType);
        const key = `${userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(this.s3Client, command, {
            expiresIn: 300, // 5 minutes
        });

        const publicUrl = `${this.publicUrl}/${this.bucket}/${key}`;

        return { uploadUrl, key, publicUrl };
    }

    /**
     * Get file extension from MIME type
     */
    private getExtensionFromMime(mime: string): string {
        const map: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
        };
        return map[mime] || '.jpg';
    }
}
