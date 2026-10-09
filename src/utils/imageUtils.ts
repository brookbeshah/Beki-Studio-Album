/**
 * Production Browser Canvas Image Compression Utility
 * Exclusively for local raster image files selected by administrators before upload.
 *
 * Rules:
 * - Only compress supported local raster image files exceeding 1.5 MiB (1,572,864 bytes).
 * - Resize excessively large images to a maximum dimension of 2560px while preserving aspect ratio.
 * - Maintain high visual quality and correct orientation.
 * - Preserve transparency (PNG/WebP) and use compatible output format.
 * - Never recompress smaller files (< 1.5 MiB).
 * - Handle unsupported, corrupt, and unprocessable images safely (returns original file).
 * - Clean up temporary object URLs, decoded image resources, and Canvas resources.
 * - Never replace an image with a larger encoded result unless necessary dimension reduction justifies it.
 * - Record diagnostic info without logging personal data.
 * - NEVER run on: external URLs, existing Storage objects, videos, already stored gallery images.
 */

export interface CompressionOptions {
  maxDimension?: number;
  maxSizeBytes?: number;
  quality?: number;
}

export interface CompressionDiagnostic {
  processed: boolean;
  originalSize: number;
  compressedSize: number;
  originalWidth?: number;
  originalHeight?: number;
  outputWidth?: number;
  outputHeight?: number;
  reductionPercentage?: number;
  reason?: string;
  error?: string;
}

const DEFAULT_MAX_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5 MiB (1,572,864 bytes)
const DEFAULT_MAX_DIMENSION = 2560; // 2560 pixels
const DEFAULT_QUALITY = 0.88; // High visual fidelity

/**
 * Compresses a newly selected local raster image file if it exceeds 1.5 MiB.
 * Returns the optimized File, or the original File if compression is unnecessary or impossible.
 */
export async function compressImageFile(
  file: File,
  options?: CompressionOptions
): Promise<{ file: File; diagnostic: CompressionDiagnostic }> {
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  const originalSize = file.size;

  // 1. Guard check: only process raster images
  if (!file.type || !file.type.startsWith('image/')) {
    return {
      file,
      diagnostic: {
        processed: false,
        originalSize,
        compressedSize: originalSize,
        reason: 'Not an image MIME type',
      },
    };
  }

  // 2. Skip vector graphics and animated formats (SVG, GIF)
  const lowerType = file.type.toLowerCase();
  if (lowerType.includes('svg') || lowerType.includes('gif')) {
    return {
      file,
      diagnostic: {
        processed: false,
        originalSize,
        compressedSize: originalSize,
        reason: 'SVG and GIF formats are bypassed to preserve vector/animation data',
      },
    };
  }

  // 3. Size check: Do not recompress files smaller than 1.5 MiB
  if (originalSize <= maxSizeBytes) {
    return {
      file,
      diagnostic: {
        processed: false,
        originalSize,
        compressedSize: originalSize,
        reason: `File size (${(originalSize / 1024 / 1024).toFixed(2)} MB) is below compression threshold (1.5 MiB)`,
      },
    };
  }

  // 4. In browser environments without DOM/Canvas support (SSR/tests), return pristine file
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      file,
      diagnostic: {
        processed: false,
        originalSize,
        compressedSize: originalSize,
        reason: 'Non-browser environment detected',
      },
    };
  }

  return new Promise<{ file: File; diagnostic: CompressionDiagnostic }>((resolve) => {
    let objectUrl: string | null = null;
    let img: HTMLImageElement | null = null;

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        img = null;
      }
    };

    try {
      objectUrl = URL.createObjectURL(file);
      img = new Image();

      img.onload = () => {
        try {
          if (!img) {
            cleanup();
            return resolve({
              file,
              diagnostic: {
                processed: false,
                originalSize,
                compressedSize: originalSize,
                reason: 'Image resource was unloaded prematurely',
              },
            });
          }

          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          // If image dimensions could not be read, fail safely
          if (!originalWidth || !originalHeight) {
            cleanup();
            return resolve({
              file,
              diagnostic: {
                processed: false,
                originalSize,
                compressedSize: originalSize,
                reason: 'Zero or invalid image dimensions',
              },
            });
          }

          // Calculate aspect-ratio-preserved bounding box
          let targetWidth = originalWidth;
          let targetHeight = originalHeight;

          if (targetWidth > maxDimension || targetHeight > maxDimension) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
              targetWidth = maxDimension;
            } else {
              targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
              targetHeight = maxDimension;
            }
          }

          // Setup Canvas
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d', { alpha: true });

          if (!ctx) {
            cleanup();
            return resolve({
              file,
              diagnostic: {
                processed: false,
                originalSize,
                compressedSize: originalSize,
                reason: 'Could not obtain 2D Canvas context',
              },
            });
          }

          // Render with high-quality smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Determine target MIME type: preserve PNG transparency if PNG, else JPEG
          const isPng = file.type === 'image/png';
          const targetMime = isPng ? 'image/png' : 'image/jpeg';

          canvas.toBlob(
            (blob) => {
              // Canvas cleanup
              canvas.width = 0;
              canvas.height = 0;
              cleanup();

              if (!blob) {
                return resolve({
                  file,
                  diagnostic: {
                    processed: false,
                    originalSize,
                    compressedSize: originalSize,
                    reason: 'Canvas toBlob returned null',
                  },
                });
              }

              // Never replace with a larger encoded file unless significant dimension downscaling occurred
              const isDimensionReduced = targetWidth < originalWidth || targetHeight < originalHeight;
              if (blob.size >= originalSize && !isDimensionReduced) {
                return resolve({
                  file,
                  diagnostic: {
                    processed: false,
                    originalSize,
                    compressedSize: originalSize,
                    originalWidth,
                    originalHeight,
                    outputWidth: targetWidth,
                    outputHeight: targetHeight,
                    reason: 'Compressed result was not smaller than original; preserved original',
                  },
                });
              }

              const compressedFile = new File([blob], file.name, {
                type: targetMime,
                lastModified: Date.now(),
              });

              const reduction = Math.round(((originalSize - blob.size) / originalSize) * 100);

              resolve({
                file: compressedFile,
                diagnostic: {
                  processed: true,
                  originalSize,
                  compressedSize: blob.size,
                  originalWidth,
                  originalHeight,
                  outputWidth: targetWidth,
                  outputHeight: targetHeight,
                  reductionPercentage: reduction,
                  reason: `Successfully optimized image (-${reduction}%) to ${targetWidth}x${targetHeight}`,
                },
              });
            },
            targetMime,
            quality
          );
        } catch (innerErr: any) {
          cleanup();
          resolve({
            file,
            diagnostic: {
              processed: false,
              originalSize,
              compressedSize: originalSize,
              error: innerErr?.message || 'Error during canvas rasterization',
            },
          });
        }
      };

      img.onerror = (err) => {
        cleanup();
        resolve({
          file,
          diagnostic: {
            processed: false,
            originalSize,
            compressedSize: originalSize,
            reason: 'Failed to decode image data; corrupt or unsupported format',
            error: String(err),
          },
        });
      };

      img.src = objectUrl;
    } catch (topErr: any) {
      cleanup();
      resolve({
        file,
        diagnostic: {
          processed: false,
          originalSize,
          compressedSize: originalSize,
          error: topErr?.message || 'Top-level compression exception',
        },
      });
    }
  });
}

/**
 * Backward-compatible wrapper that returns the optimized File directly.
 */
export async function compressImageIfNeeded(
  file: File,
  maxDimension: number = DEFAULT_MAX_DIMENSION,
  quality: number = DEFAULT_QUALITY
): Promise<File> {
  const result = await compressImageFile(file, { maxDimension, quality });
  return result.file;
}
