import { notFound } from "next/navigation"
import { InboxIcon, PlusIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { LogoMark, LogoWordmark } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { QUOTE_STATUS_VALUES } from "@/lib/constants/quote-status"
import { ToastDemo } from "./demo-actions"

export const metadata = { title: "Design System" }

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  )
}

// Vitrine dos componentes base (Sprint 2). Disponível só em desenvolvimento.
export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") notFound()

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <LogoWordmark />
          </div>
          <h1 className="font-display text-5xl leading-none tracking-[-0.01em]">Design System</h1>
          <p className="text-muted-foreground">
            Vitrine dos componentes base. Visível apenas em desenvolvimento.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Tipografia">
        <div className="grid gap-6 rounded-xl border bg-card p-6 shadow-sm sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="font-display text-4xl leading-none">Aa</span>
            <span className="text-sm font-medium">Instrument Serif</span>
            <span className="text-xs text-muted-foreground">Títulos de destaque · font-display</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-4xl leading-none font-semibold tracking-tight">Aa</span>
            <span className="text-sm font-medium">Inter</span>
            <span className="text-xs text-muted-foreground">Interface e textos · font-sans</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-4xl leading-none">#01</span>
            <span className="text-sm font-medium">Geist Mono</span>
            <span className="text-xs text-muted-foreground">Códigos e identificadores · font-mono</span>
          </div>
        </div>
      </Section>

      <Separator />

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Novo orçamento</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="destructive">Excluir</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Desabilitado</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">Extra pequeno</Button>
          <Button size="sm">Pequeno</Button>
          <Button>Padrão</Button>
          <Button size="lg">Grande</Button>
        </div>
      </Section>

      <Section title="Status do orçamento">
        <div className="flex flex-wrap gap-2">
          {QUOTE_STATUS_VALUES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {QUOTE_STATUS_VALUES.map((status) => (
            <StatusBadge key={status} status={status} size="sm" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Padrão</Badge>
          <Badge variant="secondary">Secundário</Badge>
          <Badge variant="outline">Contorno</Badge>
          <Badge variant="destructive">Destrutivo</Badge>
        </div>
      </Section>

      <Section title="Formulário">
        <Card>
          <CardHeader>
            <CardTitle>Novo cliente</CardTitle>
            <CardDescription>Campos base usados nos formulários.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ds-name">Nome</Label>
              <Input id="ds-name" placeholder="Ex.: Maria Souza" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ds-email">E-mail</Label>
              <Input id="ds-email" type="email" placeholder="maria@empresa.com" aria-invalid />
              <p className="text-sm text-destructive">Informe um e-mail válido.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ds-unit">Unidade</Label>
              <Select>
                <SelectTrigger id="ds-unit" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hora">Hora</SelectItem>
                  <SelectItem value="projeto">Projeto</SelectItem>
                  <SelectItem value="mes">Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="ds-notes">Observações</Label>
              <Textarea id="ds-notes" placeholder="Anotações internas sobre o cliente" />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button>Salvar cliente</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Tabela">
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Orçamento</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>MS</AvatarFallback>
                  </Avatar>
                  Maria Souza
                </TableCell>
                <TableCell>#2026-001</TableCell>
                <TableCell className="text-right tabular-nums">R$ 1.500,00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>JP</AvatarFallback>
                  </Avatar>
                  João Pereira
                </TableCell>
                <TableCell>#2026-002</TableCell>
                <TableCell className="text-right tabular-nums">R$ 820,50</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </Section>

      <Section title="Carregamento (Skeleton)">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </Section>

      <Section title="Estado vazio">
        <EmptyState
          icon={InboxIcon}
          title="Nada por aqui ainda"
          description="Use este componente sempre que uma lista ou seção não tiver conteúdo, com uma ação clara para começar."
        >
          <Button>
            <PlusIcon data-icon="inline-start" />
            Ação principal
          </Button>
          <Button variant="outline">Secundária</Button>
        </EmptyState>
      </Section>

      <Section title="Feedback (toast)">
        <ToastDemo />
      </Section>
    </main>
  )
}
