'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, ExternalLink, LogOut, PackageCheck, Store } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function AdminShell({
  name,
  role,
  children,
}: {
  name: string
  role: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isDetail = pathname !== '/admin/orders'

  async function logout() {
    await fetch('/api/admin/session', { method: 'DELETE' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <SidebarProvider
      data-admin-shell
      className="min-h-svh bg-[#f5f7fb] text-slate-900"
      style={{ '--sidebar-width': '17rem', '--sidebar-width-icon': '4.5rem' } as React.CSSProperties}
    >
      <Sidebar
        collapsible="icon"
        className="border-r-0 bg-[#111827] text-slate-200"
      >
        <SidebarHeader className="px-3 py-4">
          <Link
            href="/admin/orders"
            className="flex h-12 items-center gap-3 overflow-hidden rounded-xl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-brand-500 font-black text-slate-950 shadow-[0_8px_24px_rgba(103,232,249,0.18)]">
              CP
            </span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <strong className="block truncate text-[15px] text-white">Chick &amp; Piggy</strong>
              <span className="block truncate text-xs text-slate-400">Commerce operations</span>
            </span>
          </Link>
        </SidebarHeader>

        <SidebarSeparator className="bg-white/10" />

        <SidebarContent className="px-2 py-3">
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 uppercase tracking-[0.16em] text-slate-500">
              Operaciones
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/admin/orders')}
                    tooltip="Órdenes"
                    size="lg"
                    className="h-11 rounded-xl px-3 text-slate-300 hover:bg-white/8 hover:text-white data-[active=true]:bg-cyan-300/12 data-[active=true]:font-semibold data-[active=true]:text-cyan-200"
                  >
                    <Link href="/admin/orders">
                      <PackageCheck className="size-5" />
                      <span>Órdenes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel className="px-3 uppercase tracking-[0.16em] text-slate-500">
              Accesos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Ver tienda"
                    size="lg"
                    className="h-11 rounded-xl px-3 text-slate-400 hover:bg-white/8 hover:text-white"
                  >
                    <Link href="/" target="_blank" rel="noopener noreferrer">
                      <Store className="size-5" />
                      <span>Ver tienda</span>
                      <ExternalLink className="ml-auto size-3.5 opacity-60" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-14 w-full items-center gap-3 overflow-hidden rounded-xl border border-white/8 bg-white/5 px-2 text-left transition hover:bg-white/9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-700 text-sm font-bold text-white">
                  {initials(name)}
                </span>
                <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <strong className="block truncate text-sm text-white">{name}</strong>
                  <span className="block truncate text-xs capitalize text-slate-400">{role}</span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-slate-500 group-data-[collapsible=icon]:hidden" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-60 rounded-xl p-2 shadow-xl">
              <DropdownMenuLabel>
                <span className="block truncate">{name}</span>
                <span className="block truncate text-xs font-normal text-slate-500">{role}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout} className="rounded-lg py-2.5 text-red-600 focus:text-red-700">
                <LogOut /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh overflow-hidden bg-[#f5f7fb]">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="size-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" />
            <span className="h-5 w-px bg-slate-200" />
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-500">Operaciones / Órdenes</p>
              <h1 className="truncate text-base font-semibold text-slate-900">
                {isDetail ? 'Detalle de orden' : 'Gestión de órdenes'}
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex">
            <span className="size-2 rounded-full bg-emerald-500" />
            Operaciones activas
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1500px] p-4 md:p-7 lg:p-8">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
