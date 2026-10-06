// Remonta a cada navegação entre as telas de autenticação: título, formulário
// e rodapé entram em sequência.
export default function AuthTemplate({ children }) {
  return (
    <div className="flex flex-col gap-8 *:animate-enter [&>*:nth-child(2)]:[animation-delay:90ms] [&>*:nth-child(n+3)]:[animation-delay:180ms]">
      {children}
    </div>
  )
}
