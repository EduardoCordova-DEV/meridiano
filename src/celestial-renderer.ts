import type { Theme } from './types'

export const CELESTIAL_SIZE = 320
export type CelestialKind = 'sun' | 'moon'
const TAU = Math.PI * 2
const TEXTURE_WIDTH = 512
const TEXTURE_HEIGHT = 256
const SPHERE_SIZE = 212
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount
const smooth = (value: number) => value * value * (3 - 2 * value)

function hash(x: number, y: number, seed: number) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 982451653)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function noise(u: number, v: number, grid: number, seed: number) {
  const x = u * grid, y = v * grid
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = smooth(x - ix), fy = smooth(y - iy)
  const wrap = (value: number) => (value % grid + grid) % grid
  return mix(mix(hash(wrap(ix), iy, seed), hash(wrap(ix + 1), iy, seed), fx),
    mix(hash(wrap(ix), iy + 1, seed), hash(wrap(ix + 1), iy + 1, seed), fx), fy)
}

function createTextures(): Record<CelestialKind, Uint8ClampedArray> {
  const sun = new Uint8ClampedArray(TEXTURE_WIDTH * TEXTURE_HEIGHT * 3)
  const moon = new Uint8ClampedArray(sun.length)
  const elevation = new Float32Array(TEXTURE_WIDTH * TEXTURE_HEIGHT)
  let seed = 8927
  const random = () => {
    seed = Math.imul(1664525, seed) + 1013904223 | 0
    return (seed >>> 0) / 4294967296
  }
  for (let y = 0; y < TEXTURE_HEIGHT; y++) for (let x = 0; x < TEXTURE_WIDTH; x++) {
    elevation[y * TEXTURE_WIDTH + x] = (noise(x / TEXTURE_WIDTH, y / TEXTURE_HEIGHT, 64, 12) - .5) * 1.2
  }
  for (let i = 0; i < 170; i++) {
    const cx = random() * TEXTURE_WIDTH, cy = 8 + random() * (TEXTURE_HEIGHT - 16)
    const radius = 2 + random() ** 2.8 * 20
    const stretch = 1.25
    for (let y = Math.max(0, Math.floor(cy - radius * 1.3)); y < Math.min(TEXTURE_HEIGHT, cy + radius * 1.3); y++) {
      for (let dx = -Math.ceil(radius * 1.3 * stretch); dx <= radius * 1.3 * stretch; dx++) {
        const x = (Math.floor(cx) + dx + TEXTURE_WIDTH) % TEXTURE_WIDTH
        const distance = Math.hypot(dx / stretch, y - cy) / radius
        if (distance > 1.3) continue
        const bowl = distance < .82 ? -((1 - distance * distance / .82 ** 2) ** 1.5) : 0
        const rim = .32 * Math.exp(-(((distance - .9) / .12) ** 2))
        elevation[y * TEXTURE_WIDTH + x] += (bowl + rim) * radius * .47
      }
    }
  }
  for (let y = 0; y < TEXTURE_HEIGHT; y++) for (let x = 0; x < TEXTURE_WIDTH; x++) {
    const u = x / TEXTURE_WIDTH, v = y / TEXTURE_HEIGHT, index = (y * TEXTURE_WIDTH + x) * 3
    const fine = noise(u, v, 128, 1), detail = hash(x, y, 7)
    const flow = noise(u + .015 * Math.sin(v * 50), v, 32, 5)
    const cells = fine ** .8 * .6 + flow * .3 + detail * .1
    const filament = clamp((noise(u, v, 16, 52) - .65) * 4, 0, 1) ** 2
    sun[index] = 247 - filament * 48 + cells * 8
    sun[index + 1] = 102 + cells * 138 - filament * 60
    sun[index + 2] = 8 + cells * 83 - filament * 13
    const maria = smooth(clamp((noise(u, v, 8, 3) - .43) * 3, 0, 1))
    const dx = elevation[y * TEXTURE_WIDTH + (x + 1) % TEXTURE_WIDTH] - elevation[y * TEXTURE_WIDTH + (x + TEXTURE_WIDTH - 1) % TEXTURE_WIDTH]
    const dy = elevation[Math.min(TEXTURE_HEIGHT - 1, y + 1) * TEXTURE_WIDTH + x] - elevation[Math.max(0, y - 1) * TEXTURE_WIDTH + x]
    const rock = 177 - maria * 68 + (fine - .5) * 27 + (detail - .5) * 16 - dx * 21 - dy * 16
    moon[index] = rock * .98
    moon[index + 1] = rock
    moon[index + 2] = rock * 1.025
  }
  return { sun, moon }
}

// All visible cards share the same deterministic maps; nothing is downloaded.
let textures: ReturnType<typeof createTextures> | undefined

function context2d(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable')
  return context
}

function circle(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.beginPath()
  context.arc(x, y, radius, 0, TAU)
}

function glow(context: CanvasRenderingContext2D, radius: number, rgb: string, strength: number) {
  const gradient = context.createRadialGradient(160, 160, radius * .7, 160, 160, radius * 1.5)
  gradient.addColorStop(0, `rgba(${rgb},${strength})`)
  gradient.addColorStop(.48, `rgba(${rgb},${strength * .6})`)
  gradient.addColorStop(1, `rgba(${rgb},0)`)
  context.fillStyle = gradient
  circle(context, 160, 160, radius * 1.5)
  context.fill()
}

export function createCelestialRenderer(canvas: HTMLCanvasElement, kind: CelestialKind) {
  const context = context2d(canvas)
  const sphere = document.createElement('canvas')
  sphere.width = sphere.height = SPHERE_SIZE
  const sphereContext = context2d(sphere)
  const image = sphereContext.createImageData(SPHERE_SIZE, SPHERE_SIZE)
  textures ??= createTextures()
  const texture = textures[kind]
  const sun = kind === 'sun'
  const points: { index: number; u: number; row: number; light: number }[] = []
  for (let y = 0; y < SPHERE_SIZE; y++) for (let x = 0; x < SPHERE_SIZE; x++) {
    const nx = (x + .5 - SPHERE_SIZE / 2) / (SPHERE_SIZE / 2 - 2)
    const ny = (y + .5 - SPHERE_SIZE / 2) / (SPHERE_SIZE / 2 - 2)
    const radius = nx * nx + ny * ny
    if (radius > 1) continue
    const nz = Math.sqrt(1 - radius)
    const u = Math.atan2(nx, nz) / TAU + .5
    const v = Math.asin(ny) / Math.PI + .5
    const light = sun ? .63 + .4 * nz : .085 + 1.3 * Math.max(0, -.94 * nx - .1 * ny + .15 * nz)
    const index = (y * SPHERE_SIZE + x) * 4
    image.data[index + 3] = Math.min(255, (1 - radius) * SPHERE_SIZE * 128)
    points.push({ index, u, row: Math.min(TEXTURE_HEIGHT - 1, Math.floor(v * TEXTURE_HEIGHT)) * TEXTURE_WIDTH, light })
  }

  return {
    draw(seconds: number, theme: Theme) {
      context.clearRect(0, 0, CELESTIAL_SIZE, CELESTIAL_SIZE)
      glow(context, 103, sun ? '255,164,35' : '121,161,226', sun ? .16 : .075)
      if (sun) {
        glow(context, 105, '255,126,20', .24 + .025 * Math.sin(seconds / 2))
        context.save()
        context.translate(160, 160)
        for (let i = 0; i < 52; i++) {
          const angle = i * TAU / 52 + seconds / 95
          const reach = 111 + 16 * (.5 + .5 * Math.sin(i * 17 + seconds * .55))
          context.save()
          context.rotate(angle)
          context.strokeStyle = `rgba(255,${165 + i % 6 * 10},70,${.18 + i % 4 * .06})`
          context.lineWidth = .8 + i % 3 * .4
          context.beginPath()
          context.moveTo(99, -9)
          context.bezierCurveTo(reach + 5, -18, reach + 4, 12, 101, 7)
          context.stroke()
          context.restore()
        }
        context.restore()
      } else {
        glow(context, 107, '98,151,255', theme === 'light' ? .08 : .19)
        for (const [x, y, radius, phase] of [[57, 72, 3, 1], [260, 98, 2.4, 3], [259, 235, 3.1, 5], [66, 243, 1.6, 0]]) {
          context.save()
          context.globalAlpha = .55 + .2 * Math.sin(seconds / 3 + phase)
          context.fillStyle = theme === 'light' ? '#496b9a' : '#c8e1ff'
          context.beginPath()
          for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4, size = i % 2 ? radius * .23 : radius
            const px = x + Math.cos(angle) * size, py = y + Math.sin(angle) * size
            if (i === 0) context.moveTo(px, py)
            else context.lineTo(px, py)
          }
          context.closePath()
          context.fill()
          context.restore()
        }
      }
      const turn = sun ? seconds / 140 : .022 * Math.sin(seconds / 13)
      for (const { index, u, row, light } of points) {
        const x = ((u + turn) % 1 + 1) % 1 * TEXTURE_WIDTH
        const left = Math.floor(x), fraction = x - left
        const source = (row + left) * 3, next = (row + (left + 1) % TEXTURE_WIDTH) * 3
        for (let channel = 0; channel < 3; channel++) {
          image.data[index + channel] = mix(texture[source + channel], texture[next + channel], fraction) * light
        }
      }
      sphereContext.putImageData(image, 0, 0)
      context.drawImage(sphere, 54, 54)
      if (!sun) {
        context.strokeStyle = theme === 'light' ? '#94b0d144' : '#abcfff66'
        context.lineWidth = .8
        context.beginPath()
        context.arc(160, 160, 104, 2.15, 4.45)
        context.stroke()
      }
    },
  }
}
