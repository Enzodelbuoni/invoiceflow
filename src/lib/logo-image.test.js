import sharp from "sharp"
import { describe, expect, it, vi } from "vitest"

import { processLogo } from "./logo-image"

// "server-only" lança erro fora do servidor do Next; aqui ele vira um módulo vazio.
vi.mock("server-only", () => ({}))

/** Imagem de teste gerada na hora (cor sólida). */
const image = (width, height, format, options = {}) =>
  sharp({ create: { width, height, channels: 4, background: { r: 15, g: 118, b: 110, alpha: 1 } } })
    [format](options)
    .toBuffer()

describe("processLogo", () => {
  it.each(["png", "jpeg", "webp"])("%s → WebP de até 512 px, proporção mantida", async (format) => {
    const result = await processLogo(await image(2000, 800, format))
    expect(result).toMatchObject({ width: 512, height: 205 })
    expect((await sharp(result.data).metadata()).format).toBe("webp")
  })

  it("corta as margens transparentes em volta do desenho", async () => {
    // 400×200 transparente com um retângulo de 100×50 no meio.
    const logo = await sharp({ create: { width: 400, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: { create: { width: 100, height: 50, channels: 4, background: "#0f766e" } }, left: 150, top: 75 }])
      .png()
      .toBuffer()
    expect(await processLogo(logo)).toMatchObject({ width: 100, height: 50 })
  })

  it("corta também o fundo branco liso", async () => {
    const logo = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#ffffff" } })
      .composite([{ input: { create: { width: 120, height: 60, channels: 3, background: "#18181b" } }, left: 20, top: 200 }])
      .jpeg({ quality: 100 })
      .toBuffer()
    const { width, height } = await processLogo(logo)
    expect(width).toBeGreaterThanOrEqual(118)
    expect(width).toBeLessThanOrEqual(124)
    expect(height).toBeGreaterThanOrEqual(58)
    expect(height).toBeLessThanOrEqual(64)
  })

  it("não aumenta imagem pequena", async () => {
    expect(await processLogo(await image(120, 40, "png"))).toMatchObject({ width: 120, height: 40 })
  })

  it("tira os metadados (EXIF) e aplica a rotação da foto", async () => {
    // Foto 300×200 marcada para girar 90° (orientação 6) e com EXIF.
    const photo = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#0f766e" } })
      .withExif({ IFD0: { Copyright: "segredo", Artist: "Ana" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer()
    expect((await sharp(photo).metadata()).exif).toBeDefined()
    const result = await processLogo(photo)
    expect(result).toMatchObject({ width: 200, height: 300 })
    const metadata = await sharp(result.data).metadata()
    expect(metadata.exif).toBeUndefined()
    expect(metadata.orientation).toBeUndefined()
  })

  it.each([
    ["SVG", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><script>alert(1)</script></svg>')],
    ["texto", Buffer.from("isto não é uma imagem")],
    ["vazio", Buffer.alloc(0)],
  ])("%s é recusado", async (_, input) => {
    await expect(processLogo(input)).rejects.toMatchObject({ name: "DataError", code: "invalid_image" })
  })

  it("GIF é recusado (só PNG, JPEG e WebP)", async () => {
    await expect(processLogo(await image(100, 100, "gif"))).rejects.toMatchObject({
      message: "Use uma imagem PNG, JPG ou WebP.",
    })
  })

  it("imagem com menos de 32 px num dos lados é recusada", async () => {
    await expect(processLogo(await image(400, 20, "png"))).rejects.toMatchObject({
      message: "A imagem é pequena demais: use pelo menos 32 px de altura e de largura.",
    })
  })

  it("imagem gigante (bomba de descompressão) é recusada sem abrir", async () => {
    // 10.000 × 10.000 = 100 milhões de pixels, num PNG minúsculo.
    const bomb = await sharp({ create: { width: 10000, height: 10000, channels: 3, background: "#ffffff" } })
      .png({ compressionLevel: 9 })
      .toBuffer()
    expect(bomb.length).toBeLessThan(2 * 1024 * 1024)
    await expect(processLogo(bomb)).rejects.toMatchObject({ code: "invalid_image", message: "A imagem é grande demais." })
  })
})
