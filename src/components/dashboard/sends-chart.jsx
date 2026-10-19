"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { ChartColumnIcon, TableIcon } from "lucide-react"

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { countLabel } from "@/lib/dashboard"
import { SERIES_UNIT_LABELS, narrowLabelMask, niceTicks } from "@/lib/dashboard-series"
import { formatPercent } from "@/lib/format"
import { formatCurrency } from "@/lib/money"
import { cn } from "@/lib/utils"

const UNIT_COLUMN = { week: "Semana", month: "Mês", year: "Ano" }
const tickFormatter = new Intl.NumberFormat("pt-BR", { notation: "compact" })
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1]

/** Legenda: o retângulo imita a marca (coluna), a cor só reforça o nome. */
function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-viz-approved" />
        Aprovadas
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-viz-reached" />
        Demais enviadas
      </li>
    </ul>
  )
}

function ViewToggle({ view, onChange }) {
  const options = [
    { value: "chart", label: "Gráfico", icon: ChartColumnIcon },
    { value: "table", label: "Tabela", icon: TableIcon },
  ]
  return (
    <div role="group" aria-label="Exibir como" className="inline-flex rounded-lg border bg-muted/50 p-0.5">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => onChange(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            view === value && "bg-background text-foreground shadow-xs ring-1 ring-border dark:bg-input/40",
          )}
        >
          <Icon aria-hidden="true" className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * Coluna empilhada: aprovadas embaixo (a parte escura), demais enviadas em
 * cima; a altura total é o número de enviadas. 2 px de superfície separam as
 * partes; só a ponta de cima é arredondada (4 px), a base fica reta.
 */
function Column({ bucket, top, index, dimmed }) {
  if (bucket.reached === 0) return null
  const rest = bucket.reached - bucket.approved
  return (
    <motion.div
      aria-hidden="true"
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1 }}
      transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: Math.min(index * 0.035, 0.5) }}
      style={{ height: `${(bucket.reached / top) * 100}%`, originY: 1 }}
      // bg-card (opaco): a folga de 2 px entre as partes é da cor da superfície e
      // a grade não atravessa a coluna, nem quando ela está esmaecida.
      className="relative flex w-3/5 max-w-6 flex-col gap-0.5 rounded-t-[4px] bg-card"
    >
      {rest > 0 && (
        <div
          className={cn("min-h-[3px] basis-0 rounded-t-[4px] bg-viz-reached transition-opacity duration-200", dimmed && "opacity-45")}
          style={{ flexGrow: rest }}
        />
      )}
      {bucket.approved > 0 && (
        <div
          className={cn(
            "min-h-[3px] basis-0 bg-viz-approved transition-opacity duration-200",
            rest === 0 && "rounded-t-[4px]",
            dimmed && "opacity-45",
          )}
          style={{ flexGrow: bucket.approved }}
        />
      )}
    </motion.div>
  )
}

/**
 * Onde o tooltip cabe, medido antes de pintar: ao lado da coluna (do lado com
 * mais espaço, senão do outro), para não cobrir o dado; se não couber de
 * nenhum lado (celular), acima do gráfico, centrado na coluna e dentro das bordas.
 */
function placeTooltip(tip, plotWidth, index, count) {
  const gap = 6
  const width = tip.offsetWidth
  const slotLeft = (index / count) * plotWidth
  const slotRight = ((index + 1) / count) * plotWidth
  const right = slotRight + gap
  const left = slotLeft - gap - width
  const fitsRight = right + width <= plotWidth
  const fitsLeft = left >= 0
  const preferRight = (slotLeft + slotRight) / 2 < plotWidth / 2

  let x = preferRight ? (fitsRight ? right : fitsLeft ? left : null) : fitsLeft ? left : fitsRight ? right : null
  const above = x === null
  if (above) x = Math.min(Math.max((slotLeft + slotRight - width) / 2, 0), Math.max(plotWidth - width, 0))

  tip.style.left = `${x}px`
  tip.style.top = above ? "auto" : "0px"
  tip.style.bottom = above ? "calc(100% + 8px)" : "auto"
  tip.style.visibility = "visible"
}

/** Tooltip do intervalo apontado, com o valor na frente do nome. */
function ChartTooltip({ bucket, index, count, plotRef }) {
  const tipRef = useRef(null)
  useLayoutEffect(() => {
    if (tipRef.current && plotRef.current) placeTooltip(tipRef.current, plotRef.current.clientWidth, index, count)
  }, [index, count, plotRef])
  const restValue = bucket.reachedValueCents - bucket.approvedValueCents
  return (
    <div
      ref={tipRef}
      aria-hidden="true"
      style={{ visibility: "hidden", animationDuration: "150ms" }}
      className="pointer-events-none absolute z-10 w-max max-w-64 animate-enter rounded-lg border bg-popover px-3 py-2.5 text-popover-foreground shadow-lg"
    >
      <p className="text-xs font-medium">{bucket.title}</p>
      {bucket.note && <p className="text-[11px] text-muted-foreground">Parcial: {bucket.note}</p>}
      {/* Chave em traço (não caixa), valor em destaque e o nome em seguida. */}
      <div className="mt-2 grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 text-xs">
        <span className="h-0.5 w-3 rounded-full bg-viz-approved" />
        <span className="font-semibold tabular-nums">{bucket.approved}</span>
        <span className="text-muted-foreground">{bucket.approved === 1 ? "aprovada" : "aprovadas"}</span>
        <span className="text-right text-muted-foreground tabular-nums">{formatCurrency(bucket.approvedValueCents)}</span>
        <span className="h-0.5 w-3 rounded-full bg-viz-reached" />
        <span className="font-semibold tabular-nums">{bucket.reached - bucket.approved}</span>
        <span className="text-muted-foreground">demais enviadas</span>
        <span className="text-right text-muted-foreground tabular-nums">{formatCurrency(restValue)}</span>
      </div>
      <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{countLabel(bucket.reached, "enviada", "enviadas")}</span>
        {bucket.conversion !== null && <> · {formatPercent(bucket.conversion)} de conversão</>}
      </p>
    </div>
  )
}

function bucketDescription(bucket) {
  const when = bucket.note ? `${bucket.title} (parcial: ${bucket.note})` : bucket.title
  const conversion = bucket.conversion === null ? "" : `, ${formatPercent(bucket.conversion)} de conversão`
  return `${when}: ${countLabel(bucket.reached, "enviada", "enviadas")}, ${countLabel(bucket.approved, "aprovada", "aprovadas")}${conversion}.`
}

function ChartView({ series, unitLabel, emptyText }) {
  const { buckets } = series
  const ticks = niceTicks(Math.max(0, ...buckets.map((bucket) => bucket.reached)))
  const top = ticks.at(-1)
  const labelMask = narrowLabelMask(buckets)
  const [active, setActive] = useState(null)
  const [focusIndex, setFocusIndex] = useState(buckets.length - 1)
  const slotRefs = useRef([])
  const plotRef = useRef(null)
  const empty = series.totals.reached === 0

  function moveFocus(index) {
    const next = Math.min(Math.max(index, 0), buckets.length - 1)
    setFocusIndex(next)
    slotRefs.current[next]?.focus()
  }

  function onKeyDown(event) {
    const keys = {
      ArrowRight: focusIndex + 1,
      ArrowLeft: focusIndex - 1,
      Home: 0,
      End: buckets.length - 1,
    }
    if (!(event.key in keys)) return
    event.preventDefault()
    moveFocus(keys[event.key])
  }

  if (buckets.length === 0) {
    return <p className="flex h-44 items-center justify-center text-sm text-muted-foreground sm:h-56">{emptyText}</p>
  }

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 pt-2">
      {/* Eixo das quantidades: números redondos, alinhados às linhas de grade. */}
      <div aria-hidden="true" className="relative h-44 min-w-4 text-[11px] text-muted-foreground tabular-nums sm:h-56">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute right-0 translate-y-1/2 leading-none"
            style={{ bottom: `${(tick / top) * 100}%` }}
          >
            {tickFormatter.format(tick)}
          </span>
        ))}
      </div>

      {/* No toque, o tooltip fica até tocar fora (foco); com o mouse, segue o ponteiro. */}
      <div
        ref={plotRef}
        className="relative h-44 sm:h-56"
        onPointerLeave={(event) => event.pointerType === "mouse" && setActive(null)}
      >
        {ticks.map((tick) => (
          <div
            key={tick}
            aria-hidden="true"
            className={cn("absolute inset-x-0 h-px", tick === 0 ? "bg-foreground/20" : "bg-border")}
            style={{ bottom: `${(tick / top) * 100}%` }}
          />
        ))}

        {empty ? (
          <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <div
            role="group"
            aria-label={`Gráfico de colunas: propostas enviadas e aprovadas ${unitLabel}. Use as setas para percorrer.`}
            onKeyDown={onKeyDown}
            className="absolute inset-0 flex"
          >
            {buckets.map((bucket, index) => (
              <div
                key={bucket.key}
                ref={(element) => {
                  slotRefs.current[index] = element
                }}
                role="img"
                tabIndex={index === focusIndex ? 0 : -1}
                aria-label={bucketDescription(bucket)}
                data-active={active === index || undefined}
                onPointerEnter={(event) => event.pointerType === "mouse" && setActive(index)}
                onFocus={() => {
                  setFocusIndex(index)
                  setActive(index)
                }}
                onBlur={() => setActive(null)}
                className="group relative flex h-full flex-1 items-end justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                {/* Lavagem de fundo no intervalo apontado: o alvo é a faixa toda, não só a coluna. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-px inset-y-0 rounded-md transition-colors group-data-active:bg-muted/70 dark:group-data-active:bg-muted/50"
                />
                <Column bucket={bucket} top={top} index={index} dimmed={active !== null && active !== index} />
              </div>
            ))}
          </div>
        )}

        {active !== null && !empty && (
          <ChartTooltip bucket={buckets[active]} index={active} count={buckets.length} plotRef={plotRef} />
        )}
      </div>

      <div />
      {/* Eixo do tempo: no estreito, um rótulo sim, um não (o do ano sempre). */}
      <div aria-hidden="true" className="mt-2 flex">
        {buckets.map((bucket, index) => (
          <div
            key={bucket.key}
            className={cn(
              "min-w-0 flex-1 text-center text-[11px] leading-tight text-muted-foreground",
              !labelMask[index] && "@max-xl:invisible",
            )}
          >
            <span className="block">{bucket.label}</span>
            {bucket.sublabel && <span className="block text-muted-foreground/80">{bucket.sublabel}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function TableView({ series, unitLabel, periodText, emptyText }) {
  const { buckets, totals, unit } = series
  if (totals.reached === 0) {
    return <p className="flex h-44 items-center justify-center text-sm text-muted-foreground sm:h-56">{emptyText}</p>
  }
  return (
    <Table>
      <TableCaption className="sr-only">
        Propostas enviadas e aprovadas {unitLabel}, {periodText}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>{UNIT_COLUMN[unit]}</TableHead>
          <TableHead className="text-right">Enviadas</TableHead>
          <TableHead className="text-right">Aprovadas</TableHead>
          <TableHead className="text-right">Conversão</TableHead>
          <TableHead className="text-right">Valor aprovado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {buckets.map((bucket) => (
          <TableRow key={bucket.key}>
            <TableCell>
              {bucket.title}
              {bucket.note && <span className="block text-xs text-muted-foreground">Parcial: {bucket.note}</span>}
            </TableCell>
            <TableCell className="text-right tabular-nums">{bucket.reached}</TableCell>
            <TableCell className="text-right tabular-nums">{bucket.approved}</TableCell>
            <TableCell className="text-right tabular-nums">
              {bucket.conversion === null ? "—" : formatPercent(bucket.conversion)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(bucket.approvedValueCents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell className="text-right tabular-nums">{totals.reached}</TableCell>
          <TableCell className="text-right tabular-nums">{totals.approved}</TableCell>
          <TableCell className="text-right tabular-nums">
            {totals.reached === 0 ? "—" : formatPercent(totals.approved / totals.reached)}
          </TableCell>
          <TableCell className="text-right tabular-nums">{formatCurrency(totals.approvedValueCents)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}

/**
 * Gráfico do painel (Sprint 18, parte 2): propostas enviadas por semana, mês
 * ou ano no período escolhido, com a parte aprovada de cada uma. Hover e
 * teclado mostram os detalhes; a visão em tabela traz os mesmos números (é a
 * alternativa acessível: a cor clara fica abaixo de 3:1 contra o cartão).
 * @param {{ series: ReturnType<typeof import("@/lib/dashboard-series").buildSendSeries>,
 *   periodText: string, className?: string }} props
 */
export function SendsChart({ series, periodText, className }) {
  const [view, setView] = useState("chart")
  const unitLabel = SERIES_UNIT_LABELS[series.unit]
  const emptyText = `Nenhuma proposta enviada ${periodText}.`
  const hasData = series.totals.reached > 0

  return (
    <section
      aria-labelledby="sends-chart-title"
      className={cn("@container flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <h2 id="sends-chart-title" className="font-medium">
            Enviadas e aprovadas
          </h2>
          <p className="text-sm text-muted-foreground">
            {unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)}, pela data de envio
            {hasData &&
              ` · ${countLabel(series.totals.reached, "enviada", "enviadas")}, ${countLabel(series.totals.approved, "aprovada", "aprovadas")} ${periodText}`}
          </p>
        </div>
        {hasData && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {view === "chart" && <Legend />}
            <ViewToggle view={view} onChange={setView} />
          </div>
        )}
      </div>

      {view === "chart" || !hasData ? (
        <ChartView key={series.buckets.map((bucket) => bucket.key).join()} series={series} unitLabel={unitLabel} emptyText={emptyText} />
      ) : (
        <TableView series={series} unitLabel={unitLabel} periodText={periodText} emptyText={emptyText} />
      )}
    </section>
  )
}
