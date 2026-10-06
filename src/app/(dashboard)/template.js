// O template remonta a cada navegação, então a animação de entrada roda em toda
// troca de página. Cada filho direto da página entra em sequência (stagger).
export default function DashboardTemplate({ children }) {
  return (
    <div className="flex flex-col gap-8 *:animate-enter [&>*:nth-child(2)]:[animation-delay:80ms] [&>*:nth-child(3)]:[animation-delay:160ms] [&>*:nth-child(4)]:[animation-delay:240ms] [&>*:nth-child(n+5)]:[animation-delay:320ms]">
      {children}
    </div>
  )
}
