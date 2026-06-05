export interface ImageQuality {
  isLikelyMobilePhoto: boolean
  brightness: number // 0-255
  contrast: number // 0-100
  needsEnhancement: boolean
  warnings: string[]
}

export async function assessImageQuality(blob: Blob): Promise<ImageQuality> {
  const warnings: string[] = []

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve({
          isLikelyMobilePhoto: false,
          brightness: 128,
          contrast: 50,
          needsEnhancement: false,
          warnings,
        })
        return
      }

      ctx.drawImage(img, 0, 0)

      // Sample pixels to assess brightness and contrast
      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      const data = imageData.data

      let brightness = 0
      let min = 255
      let max = 0

      // Sample every 10th pixel for performance
      for (let i = 0; i < data.length; i += 40) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const pixelBrightness = (r + g + b) / 3

        brightness += pixelBrightness
        min = Math.min(min, pixelBrightness)
        max = Math.max(max, pixelBrightness)
      }

      const sampledPixels = data.length / 40
      brightness = brightness / sampledPixels

      const contrast = ((max - min) / 255) * 100

      // Determine if this looks like a mobile photo
      const isLikelyMobilePhoto = img.width < 2000 && img.height < 2000

      // Determine if enhancement is needed
      const needsEnhancement =
        brightness < 80 || // Too dark
        brightness > 200 || // Too bright/washed out
        contrast < 20 // Low contrast

      if (brightness < 80) {
        warnings.push('Image appears quite dark - may affect text clarity')
      }
      if (brightness > 200) {
        warnings.push('Image appears overexposed - may have washed out text')
      }
      if (contrast < 20) {
        warnings.push('Image has low contrast - text may be hard to read')
      }

      resolve({
        isLikelyMobilePhoto,
        brightness: Math.round(brightness),
        contrast: Math.round(contrast),
        needsEnhancement,
        warnings,
      })
    }

    img.onerror = () => {
      resolve({
        isLikelyMobilePhoto: false,
        brightness: 128,
        contrast: 50,
        needsEnhancement: false,
        warnings: ['Could not assess image quality'],
      })
    }

    img.src = URL.createObjectURL(blob)
  })
}

export async function enhanceImageForOcr(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(blob) // Return original if can't enhance
        return
      }

      // Draw original image
      ctx.drawImage(img, 0, 0)

      // Get image data for enhancement
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // Apply contrast and brightness enhancement
      const brightness = 1.1 // Slight brightness increase
      const contrast = 1.2 // Moderate contrast increase

      for (let i = 0; i < data.length; i += 4) {
        // Apply contrast
        data[i] = Math.min(255, (data[i] - 128) * contrast + 128 * brightness)
        data[i + 1] = Math.min(255, (data[i + 1] - 128) * contrast + 128 * brightness)
        data[i + 2] = Math.min(255, (data[i + 2] - 128) * contrast + 128 * brightness)
        // Keep alpha unchanged
      }

      ctx.putImageData(imageData, 0, 0)

      // Convert to blob
      canvas.toBlob((enhancedBlob) => {
        if (enhancedBlob) {
          resolve(enhancedBlob)
        } else {
          resolve(blob) // Return original if enhancement fails
        }
      }, 'image/jpeg', 0.95)
    }

    img.onerror = () => reject(new Error('Failed to load image for enhancement'))
    img.src = URL.createObjectURL(blob)
  })
}
