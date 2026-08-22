import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error('Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)');
  }
  cloudinary.config({ cloud_name, api_key, api_secret });
  configured = true;
}

export interface UploadedImage {
  url: string;
  publicId: string;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

/** Replaces the Go API's `saveFileToUploads` (local disk write). */
export async function uploadImageBuffer(file: File): Promise<UploadedImage> {
  ensureConfigured();

  if (!file.type.startsWith('image/')) {
    throw new Error('file must be an image');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('image exceeds the 10MB limit');
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'duckegy',
        resource_type: 'image',
        // Incoming transformation: the asset is re-encoded before it is
        // stored, so an original that skipped the browser-side compression
        // (older browser, direct API call) still lands at web weight.
        // `limit` only ever shrinks, so smaller uploads pass through as-is.
        transformation: [
          { width: 2560, height: 2560, crop: 'limit', quality: 'auto:good' },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

/** Replaces `os.Remove(filePath)`. Failures are logged, not thrown — mirrors the Go cleanup path. */
export async function deleteImage(publicId: string): Promise<void> {
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('Failed to delete Cloudinary asset', publicId, err);
  }
}
