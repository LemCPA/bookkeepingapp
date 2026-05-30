/**
 * Client-side image compression utility
 * Compresses images using Canvas API before upload
 * Handles EXIF orientation for mobile camera images
 * No external dependencies required
 */

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

/**
 * Read EXIF orientation from image file
 * Mobile cameras often save images with rotation metadata
 * Returns 1-8 representing the orientation (1 = normal, 6 = 90° CW, etc)
 */
async function getExifOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer
      const view = new DataView(buffer)

      // Check for JPEG SOI marker
      if (view.getUint16(0, false) !== 0xFFD8) {
        resolve(1) // Not a JPEG, return normal orientation
        return
      }

      let offset = 2
      while (offset < view.byteLength) {
        const marker = view.getUint16(offset, false)
        offset += 2

        // Look for APP1 (EXIF) marker
        if (marker === 0xFFE1) {
          const length = view.getUint16(offset, false)
          const exifData = buffer.slice(offset + 2, offset + length)

          // Parse EXIF IFD to find orientation tag (0x0112)
          const exifView = new DataView(exifData)
          const exifSignature = exifView.byteOffset

          // Skip 'Exif\0\0' header and check endianness
          let tiffOffset = 6
          const isLittleEndian = exifView.getUint16(tiffOffset, false) === 0x4949
          tiffOffset += 2

          // Skip 42 marker
          tiffOffset += 2

          // Read IFD offset
          const ifdOffset = exifView.getUint32(tiffOffset, isLittleEndian)
          let tagOffset = exifSignature + ifdOffset

          const entryCount = exifView.getUint16(tagOffset, isLittleEndian)
          tagOffset += 2

          // Search for orientation tag (0x0112)
          for (let i = 0; i < entryCount; i++) {
            const tag = exifView.getUint16(tagOffset, isLittleEndian)
            const type = exifView.getUint16(tagOffset + 2, isLittleEndian)
            const count = exifView.getUint32(tagOffset + 4, isLittleEndian)
            const valueOffset = tagOffset + 8

            if (tag === 0x0112) {
              // Found orientation tag, read the value
              const orientation = exifView.getUint16(valueOffset, isLittleEndian)
              resolve(orientation)
              return
            }

            tagOffset += 12
          }

          resolve(1) // No orientation tag found
          return
        }

        // Skip to next marker
        offset += view.getUint16(offset, false)
      }

      resolve(1) // No EXIF data found
    }
    reader.onerror = () => resolve(1) // Error reading file, use normal orientation
    reader.readAsArrayBuffer(file.slice(0, 65536)) // Only read first 64KB for EXIF
  })
}

/**
 * Apply EXIF orientation to canvas context
 * Rotates and flips the image based on orientation value
 */
function applyExifOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
): { width: number; height: number } {
  switch (orientation) {
    case 2:
      // Flip horizontal
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      return { width, height }
    case 3:
      // Rotate 180
      ctx.translate(width, height)
      ctx.rotate(Math.PI)
      return { width, height }
    case 4:
      // Flip vertical
      ctx.translate(0, height)
      ctx.scale(1, -1)
      return { width, height }
    case 5:
      // Rotate 90 CW and flip horizontal
      ctx.rotate(Math.PI / 2)
      ctx.translate(0, -height)
      ctx.scale(1, -1)
      return { width: height, height: width }
    case 6:
      // Rotate 90 CW
      ctx.rotate(Math.PI / 2)
      ctx.translate(0, -height)
      return { width: height, height: width }
    case 7:
      // Rotate 270 CW and flip horizontal
      ctx.rotate(-Math.PI / 2)
      ctx.translate(-width, 0)
      ctx.scale(1, -1)
      return { width: height, height: width }
    case 8:
      // Rotate 270 CW
      ctx.rotate(-Math.PI / 2)
      ctx.translate(-width, 0)
      return { width: height, height: width }
    default:
      // No rotation (orientation 1)
      return { width, height }
  }
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
