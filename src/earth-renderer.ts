import earthUrl from './assets/earth-blue-marble.webp'
import cloudsUrl from './assets/earth-clouds.webp'

export const EARTH_SIZE = 384
const TEXTURE_WIDTH = 1024
const TEXTURE_HEIGHT = 512

function context2d(canvas: HTMLCanvasElement, readFrequently = false) {
  const context = canvas.getContext('2d', { willReadFrequently: readFrequently })
  if (!context) throw new Error('Canvas 2D is unavailable')
  return context
}

function loadImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    function clean() {
      image.onload = null
      image.onerror = null
      signal.removeEventListener('abort', abort)
    }
    function abort() {
      clean()
      image.src = ''
      reject(new DOMException('Earth texture loading cancelled', 'AbortError'))
    }
    image.onload = () => { clean(); resolve(image) }
    image.onerror = () => { clean(); reject(new Error(`Unable to load Earth texture: ${url}`)) }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    else image.src = url
  })
}

function texturePixels(image: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_WIDTH
  canvas.height = TEXTURE_HEIGHT
  const context = context2d(canvas, true)
  context.drawImage(image, 0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT)
  return context.getImageData(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT).data
}

export async function createEarthRenderer(canvas: HTMLCanvasElement, signal: AbortSignal) {
  const textures = await Promise.all([loadImage(earthUrl, signal), loadImage(cloudsUrl, signal)])
  signal.throwIfAborted()
  const [earth, clouds] = textures.map(texturePixels)
  const context = context2d(canvas)
  const image = context.createImageData(EARTH_SIZE, EARTH_SIZE)
  const pixels: { index: number; u: number; row: number; light: number }[] = []
  const tilt = 20 * Math.PI / 180
  const sinTilt = Math.sin(tilt)
  const cosTilt = Math.cos(tilt)

  for (let y = 0; y < EARTH_SIZE; y++) {
    for (let x = 0; x < EARTH_SIZE; x++) {
      const nx = (x + .5 - EARTH_SIZE / 2) / (EARTH_SIZE / 2 - 3)
      const ny = (y + .5 - EARTH_SIZE / 2) / (EARTH_SIZE / 2 - 3)
      const radius = nx * nx + ny * ny
      if (radius > 1) continue
      const nz = Math.sqrt(1 - radius)
      // Map the photograph onto a tilted sphere, rather than spinning a flat disc.
      const ty = ny * cosTilt - nz * sinTilt
      const tz = nz * cosTilt + ny * sinTilt
      const u = Math.atan2(nx, tz) / (2 * Math.PI) + .5
      const v = Math.asin(Math.max(-1, Math.min(1, ty))) / Math.PI + .5
      const index = (y * EARTH_SIZE + x) * 4
      pixels.push({
        index, u,
        row: Math.min(TEXTURE_HEIGHT - 1, Math.floor(v * TEXTURE_HEIGHT)) * TEXTURE_WIDTH,
        light: .22 + .92 * Math.max(0, -.4 * nx - .25 * ny + .88 * nz),
      })
      image.data[index + 3] = Math.min(255, (1 - radius) * EARTH_SIZE * 128)
    }
  }

  return {
    draw(seconds: number) {
      const angle = -.22 + seconds / 65
      const cloudsAngle = -.21 + seconds / 73
      for (const { index, u, row, light } of pixels) {
        const earthX = ((u + angle) % 1 + 1) % 1 * TEXTURE_WIDTH
        const left = Math.floor(earthX)
        const blend = earthX - left
        const source = (row + left) * 4
        const next = (row + ((left + 1) % TEXTURE_WIDTH)) * 4
        const cloudX = Math.floor(((u + cloudsAngle) % 1 + 1) % 1 * TEXTURE_WIDTH)
        const cloudIndex = (row + cloudX) * 4
        const cloud = clouds[cloudIndex] / 255 * clouds[cloudIndex + 3] / 255 * .82
        for (let channel = 0; channel < 3; channel++) {
          const color = earth[source + channel] * (1 - blend) + earth[next + channel] * blend
          image.data[index + channel] = Math.min(255, (color * (1 - cloud) + 245 * cloud) * light)
        }
      }
      context.putImageData(image, 0, 0)
    },
  }
}
