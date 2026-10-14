// Resumo legível do navegador guardado no aceite eletrônico ("Chrome · Windows").
// Só para exibir ao dono da proposta: o texto completo continua no banco.

// A ordem importa: Edge e Opera também dizem "Chrome"; Chrome também diz "Safari".
const BROWSERS = [
  [/\bEdg(?:e|A|iOS)?\//, "Edge"],
  [/\b(?:OPR|Opera)\//, "Opera"],
  [/\bSamsungBrowser\//, "Samsung Internet"],
  [/\b(?:Firefox|FxiOS)\//, "Firefox"],
  [/\b(?:Chrome|CriOS)\//, "Chrome"],
  [/\bVersion\/[\d.]+.*\bSafari\//, "Safari"],
]

const SYSTEMS = [
  [/\bWindows\b/, "Windows"],
  [/\bAndroid\b/, "Android"],
  [/\b(?:iPhone|iPad|iPod)\b/, "iOS"],
  [/\bMac OS X\b|\bMacintosh\b/, "macOS"],
  [/\bCrOS\b/, "ChromeOS"],
  [/\bLinux\b/, "Linux"],
]

/** "Mozilla/5.0 (Windows NT 10.0…) … Chrome/141…" → "Chrome · Windows"; desconhecido → null. */
export function describeUserAgent(userAgent) {
  if (!userAgent) return null
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1]
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1]
  const parts = [browser, system].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : null
}
