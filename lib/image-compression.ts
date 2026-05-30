/**
 * Client-side image compression utility
 * Compresses images using Canvas API before upload
 * No external dependencies required
 */

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

/**
 * Compress an image file using Canvas
 * Reduces dimensions and JPEG quality to minimize file size
 *
 * @param file - Image file to compress
 * @param options - Compression options
 * @returns Compressed blob ready for upload
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; name: string; size: number }> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    format = 'jpeg',
  } = options

  return new Promise((resolve, reject) => {
    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'))
      return
    }

    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions (maintain aspect ratio)
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            // Generate new filename preserving extension
            const originalName = file.name
            const nameWithoutExt = originalName.substring(
              0,
              originalName.lastIndexOf('.')
            )
            const newName = `${nameWithoutExt}-compressed.${format}`

            resolve({
              blob,
              name: newName,
              size: blob.size,
            })
          },
          `image/${format}`,
          quality
        )
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = event.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
  files: File[],
  options?: CompressionOptions
): Promise<Array<{ blob: Blob; name: string; size: number }>> {
  return Promise.all(files.map((file) => compressImage(file, options)))
}

/**
 * Calculate compression ratio
 */
export function getCompressionRatio(
  originalSize: number,
  compressedSize: number
): string {
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)
  return `${ratio}%`
}
