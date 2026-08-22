/**
 * Browser-side image compression, run before every upload.
 *
 * Uploads go through a Next.js route handler on Vercel, whose serverless
 * request body is capped at ~4.5 MB regardless of what the app allows — that
 * cap, not `MAX_UPLOAD_BYTES`, is what a phone photo actually hits. Shrinking
 * in the browser keeps a 10 MB original well under it while leaving the image
 * far larger than anything the site renders (the widest layout slot is under
 * 1600 CSS px, and Cloudinary re-encodes for delivery anyway).
 */

/** Largest original we accept from the file picker. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** Longest edge kept after downscaling. */
const MAX_EDGE = 2560

/** WebP quality — visually lossless for photos at this resolution. */
const QUALITY = 0.82

/** Below this, re-encoding costs quality for no meaningful size win. */
const SKIP_BELOW_BYTES = 400 * 1024

/** Formats whose re-encode would lose something we can't recover. */
const PASS_THROUGH_TYPES = new Set(["image/gif", "image/svg+xml"])

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function supportsWebp(): boolean {
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL("image/webp").startsWith("data:image/webp")
}

function replaceExtension(name: string, extension: string): string {
  return `${name.replace(/\.[^./\\]+$/, "")}.${extension}`
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    // Respects EXIF orientation, which a bare <img> decode does not.
    return createImageBitmap(file, { imageOrientation: "from-image" })
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("decode failed"))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Returns a smaller version of `file`, or the original when compressing it
 * would not help (small file, animated/vector format, unsupported browser, or
 * a result that came out larger). Never throws — a failure just means the
 * original is uploaded, and the server still enforces its own limit.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (typeof document === "undefined") return file
  if (!file.type.startsWith("image/")) return file
  if (PASS_THROUGH_TYPES.has(file.type)) return file
  if (file.size <= SKIP_BELOW_BYTES) return file

  let source: ImageBitmap | HTMLImageElement
  try {
    source = await loadBitmap(file)
  } catch {
    return file
  }

  try {
    const width = "width" in source ? source.width : 0
    const height = "height" in source ? source.height : 0
    if (!width || !height) return file

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)

    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

    const type = supportsWebp() ? "image/webp" : "image/jpeg"
    const blob = await canvasToBlob(canvas, type, QUALITY)
    if (!blob || blob.size >= file.size) return file

    const extension = type === "image/webp" ? "webp" : "jpg"
    return new File([blob], replaceExtension(file.name, extension), {
      type,
      lastModified: Date.now(),
    })
  } catch {
    return file
  } finally {
    if ("close" in source) source.close()
  }
}
