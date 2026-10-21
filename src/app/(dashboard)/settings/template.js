// Remonta a cada troca de aba: o conteúdo novo entra com a animação de entrada
// do template do painel (este div é filho direto dele, como o cabeçalho e as abas).
export default function SettingsTemplate({ children }) {
  return <div className="flex flex-col gap-8">{children}</div>
}
