"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import { PlusIcon } from "lucide-react"

import { LogoMark, LogoWordmark } from "@/components/brand/logo"
import { NavUser } from "@/components/layout/nav-user"
import { NAV_GROUPS, SECONDARY_NAV, isNavItemActive } from "@/components/layout/nav-items"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

// Mola do indicador ativo: rápida, sem "quicar" demais.
const ACTIVE_SPRING = { type: "spring", stiffness: 520, damping: 42, mass: 0.9 }

function NavItem({ item, active }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.title}
        className="relative isolate transition-colors duration-200 data-active:bg-transparent"
      >
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={() => isMobile && setOpenMobile(false)}
        >
          {/* Fundo do item ativo: desliza entre os itens ao navegar (layoutId). */}
          {active && (
            <motion.span
              layoutId="sidebar-active-item"
              transition={ACTIVE_SPRING}
              className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm ring-1 ring-sidebar-border dark:bg-sidebar-accent"
            />
          )}
          <Icon
            className={cn(
              "transition-colors duration-200",
              active ? "text-primary-ink" : "text-sidebar-foreground/60"
            )}
          />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({ user, ...props }) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="InvoiceFlow" className="hover:bg-transparent">
              <Link href="/dashboard">
                <LogoMark />
                <div className="grid flex-1 gap-1 text-left">
                  <LogoWordmark />
                  <span className="truncate text-[11px] text-muted-foreground">Propostas profissionais</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Ação principal do produto, sempre à mão. */}
        <SidebarGroup className="pt-1 pb-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Novo orçamento"
                className="justify-center bg-primary font-medium text-primary-foreground shadow-sm ring-1 ring-primary/20 transition-[background-color,box-shadow,translate] duration-200 hover:-translate-y-px hover:bg-primary/90 hover:text-primary-foreground hover:shadow-md active:translate-y-0 active:bg-primary active:text-primary-foreground"
              >
                <Link href="/quotes/new">
                  <PlusIcon />
                  <span>Novo orçamento</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavItem key={item.href} item={item} active={isNavItemActive(pathname, item.href)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {SECONDARY_NAV.map((item) => (
                <NavItem key={item.href} item={item} active={isNavItemActive(pathname, item.href)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
