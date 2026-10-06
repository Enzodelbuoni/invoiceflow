import {
  FileTextIcon,
  LayoutDashboardIcon,
  PackageIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"

// Navegação da área privada. Os ícones são componentes, então este arquivo
// só pode ser importado por Client Components (ou Server Components que
// renderizem o ícone diretamente, sem repassá-lo a um Client Component).
export const NAV_GROUPS = [
  {
    label: "Visão geral",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon }],
  },
  {
    label: "Gestão",
    items: [
      { title: "Orçamentos", href: "/quotes", icon: FileTextIcon },
      { title: "Clientes", href: "/clients", icon: UsersIcon },
      { title: "Serviços", href: "/services", icon: PackageIcon },
    ],
  },
]

export const SECONDARY_NAV = [{ title: "Configurações", href: "/settings", icon: SettingsIcon }]

const ALL_ITEMS = [...NAV_GROUPS.flatMap((group) => group.items), ...SECONDARY_NAV]

export function isNavItemActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Item de navegação correspondente à rota atual (ou `undefined`). */
export function findNavItem(pathname) {
  return ALL_ITEMS.find((item) => isNavItemActive(pathname, item.href))
}
