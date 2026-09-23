import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const source = new URL('../public/favicon.svg', import.meta.url)
const output = new URL('../build/', import.meta.url)
await mkdir(output, { recursive: true })
const sizes = [16, 32, 48, 64, 128, 256]
const pngs = await Promise.all(sizes.map((size) => sharp(fileURLToPath(source)).resize(size, size).png().toBuffer()))
const header = Buffer.alloc(6 + sizes.length * 16)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = header.length
sizes.forEach((size, index) => {
  const start = 6 + index * 16
  header[start] = size === 256 ? 0 : size
  header[start + 1] = size === 256 ? 0 : size
  header.writeUInt16LE(1, start + 4)
  header.writeUInt16LE(32, start + 6)
  header.writeUInt32LE(pngs[index].length, start + 8)
  header.writeUInt32LE(offset, start + 12)
  offset += pngs[index].length
})
await writeFile(new URL('icon.ico', output), Buffer.concat([header, ...pngs]))
await writeFile(new URL('icon.png', output), pngs.at(-1))
