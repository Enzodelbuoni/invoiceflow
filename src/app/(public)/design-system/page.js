import { notFound } from "next/navigation"

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
import { ThemeDemo, ToastDemo } from "./demo-actions"

export const metadata = { title: "Design System" }

// Classes escritas por extenso para o Tailwind conseguir detectá-las.
const STATUS_SWATCHES = [
  { label: "Rascunho", className: "bg-status-draft/10 text-status-draft dark:bg-status-draft/15" },
  { label: "Enviado", className: "bg-status-sent/10 text-status-sent dark:bg-status-sent/15" },
  { label: "Visualizado", className: "bg-status-viewed/10 text-status-viewed dark:bg-status-viewed/15" },
  { label: "Aprovado", className: "bg-status-approved/10 text-status-approved dark:bg-status-approved/15" },
  { label: "Recusado", className: "bg-status-declined/10 text-status-declined dark:bg-status-declined/15" },
  { label: "Expirado", className: "bg-status-expired/10 text-status-expired dark:bg-status-expired/15" },
  { label: "Cancelado", className: "bg-status-cancelled/10 text-status-cancelled dark:bg-status-cancelled/15" },
]

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

// Vitrine dos componentes base (Sprint 2). Disponível só em desenvolvimento.
export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") notFound()

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-medium text-primary">InvoiceFlow</span>
        <h1 className="text-3xl font-semibold tracking-tight">Design System</h1>
        <p className="text-muted-foreground">
          Vitrine dos componentes base. Visível apenas em desenvolvimento.
        </p>
      </header>

      <Section title="Tema">
        <ThemeDemo />
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
          {STATUS_SWATCHES.map((s) => (
            <span
              key={s.label}
              className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${s.className}`}
            >
              {s.label}
            </span>
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

      <Section title="Feedback (toast)">
        <ToastDemo />
      </Section>
    </main>
  )
}
