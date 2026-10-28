import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env, isCloudinaryConfigured } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

export interface StoredImage {
  url: string;
  publicId?: string;
}

function assertValidUpload(file: Express.Multer.File) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new AppError('VALIDATION_ERROR', 'Only JPEG, PNG, and WebP images are allowed', 400);
  }
  if (file.size > MAX_BYTES) {
    throw new AppError('VALIDATION_ERROR', 'Image must be 5MB or smaller', 400);
  }
}

export async function storeImage(file: Express.Multer.File): Promise<StoredImage> {
  assertValidUpload(file);
  const provider = env.STORAGE_PROVIDER === 'cloudinary' && isCloudinaryConfigured() ? 'cloudinary' : 'local';

  if (provider === 'cloudinary') {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'simmi-masala/products' },
        (err, res) => {
          if (err || !res) reject(err ?? new Error('Cloudinary upload failed'));
          else resolve(res as { secure_url: string; public_id: string });
        },
      );
      stream.end(file.buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  const dir = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);
  await fs.mkdir(dir, { recursive: true });
  const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const name = `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(dir, name), file.buffer);
  return { url: `${env.API_BASE_URL}/uploads/${name}` };
}
