/** Título e descrição das telas de autenticação. */
export function AuthHeading({ title, description }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-4xl leading-tight tracking-[-0.01em] text-balance">{title}</h1>
      {description && <p className="text-pretty text-muted-foreground">{description}</p>}
    </div>
  )
}
