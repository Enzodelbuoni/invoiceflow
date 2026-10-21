import "server-only"
import sharp from "sharp"

import { DataError } from "@/lib/data/shared"

// Regrava o logo enviado antes de ir para o Storage (etapa 39):
// - o formato é conferido pelo conteúdo (não pelo nome nem pelo tipo que o
//   navegador declarou): só PNG, JPEG e WebP — SVG fica de fora;
// - imagens gigantes são recusadas antes de abrir (limite de pixels);
// - sai um WebP de até 512 px no lado maior, girado conforme o EXIF, sem as
//   margens vazias e sem metadados (nada de localização de foto no logo público).

const ACCEPTED_FORMATS = new Set(["png", "jpeg", "webp"])
const MAX_INPUT_PIXELS = 50_000_000
const MIN_SIDE = 32
const MAX_SIDE = 512

const invalid = (message) => new DataError("invalid_image", message)

/** Buffer da imagem enviada → `{ data, width, height }` do WebP regravado. */
export async function processLogo(input) {
  let metadata
  try {
    // Só o cabeçalho (não decodifica os pixels): sem limite aqui, para a imagem
    // gigante receber "grande demais" logo abaixo, e não "não conseguimos abrir".
    metadata = await sharp(input, { limitInputPixels: false }).metadata()
  } catch {
    throw invalid("Não conseguimos abrir esta imagem. Use um PNG, JPG ou WebP.")
  }
  if (!ACCEPTED_FORMATS.has(metadata.format)) throw invalid("Use uma imagem PNG, JPG ou WebP.")
  if (metadata.width * metadata.height > MAX_INPUT_PIXELS) throw invalid("A imagem é grande demais.")
  if (Math.min(metadata.width, metadata.height) < MIN_SIDE) {
    throw invalid(`A imagem é pequena demais: use pelo menos ${MIN_SIDE} px de altura e de largura.`)
  }

  const encode = (trim) => {
    let pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate()
    // Corta as margens da cor do canto (transparente ou fundo liso): o logo
    // ocupa a altura toda na proposta, em vez de flutuar numa caixa vazia.
    if (trim) pipeline = pipeline.trim({ threshold: 10 })
    return pipeline
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true })
  }
  // Imagem toda de uma cor só não tem o que cortar (o sharp recusa): vai inteira.
  const { data, info } = await encode(true).catch(() => encode(false))
  return { data, width: info.width, height: info.height }
}
