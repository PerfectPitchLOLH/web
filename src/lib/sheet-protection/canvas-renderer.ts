import { PROTECTION_CONSTANTS } from './protection.constants'

export interface CanvasRenderOptions {
  scale?: number
  backgroundColor?: string
  targetWidth?: number
}

export class SheetMusicCanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    })

    if (!context) {
      throw new Error('Could not get 2D context from canvas')
    }

    this.ctx = context
  }

  async renderFromSVG(
    svgContent: string,
    options: CanvasRenderOptions = {},
  ): Promise<void> {
    const {
      scale = PROTECTION_CONSTANTS.CANVAS_SCALE,
      backgroundColor = PROTECTION_CONSTANTS.CANVAS_BACKGROUND,
      targetWidth,
    } = options

    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    try {
      const img = await this.loadImage(url)

      let width: number
      let height: number

      if (targetWidth && img.width > 0) {
        const ratio = img.height / img.width
        width = targetWidth
        height = Math.round(targetWidth * ratio)
      } else {
        width = img.width * scale
        height = img.height * scale
      }

      this.canvas.width = width
      this.canvas.height = height

      this.ctx.imageSmoothingEnabled = true
      this.ctx.imageSmoothingQuality = 'high'

      this.ctx.fillStyle = backgroundColor
      this.ctx.fillRect(0, 0, width, height)

      this.ctx.drawImage(img, 0, 0, width, height)
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load SVG image'))

      img.src = url
    })
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}
