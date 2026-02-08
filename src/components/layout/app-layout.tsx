"use client"

import * as React from "react"
import {
  GalleryVerticalEnd,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
  History,
  BarChart,
  User,
  Receipt,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset,
  SidebarTrigger,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { onAuthStateChange, getUser, supabase } from "@/lib/supabase/client"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { NotificationBell } from "@/components/layout/notification-bell"

export type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

const defaultNavItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
  },
  {
    title: "Billing Invoice",
    url: "/billing-invoice",
    icon: FileText,
  },
  {
    title: "Journal Entries",
    url: "/journal-entries",
    icon: FileText,
  },
  {
    title: "General Voucher",
    url: "/general-voucher",
    icon: Receipt,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart,
  },
  {
    title: "Logs",
    url: "/logs",
    icon: History,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

interface AppLayoutProps {
  children: React.ReactNode
  navItems?: NavItem[]
  showThemeToggle?: boolean
}

export function AppLayout({
  children,
  navItems = defaultNavItems,
  showThemeToggle = false,
}: AppLayoutProps) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null)
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    // Use timeout to avoid synchronous setState in effect (prevents cascading renders)
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    getUser()
      .then((userData) => {
        setUser(userData)
        // Fetch user profile for full_name
        if (userData && typeof userData === 'object' && 'id' in userData) {
          supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', (userData as { id: string }).id)
            .single()
            .then(({ data }) => {
              setUserProfile(data)
            })
        } else {
          // No user - redirect to login
          window.location.replace('/login')
        }
      })
      .catch(() => {
        // Error getting user - redirect to login
        window.location.replace('/login')
      })
      .finally(() => {
        setAuthLoading(false)
      })

    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserProfile(null)
        window.location.replace('/login')
      } else if (session?.user) {
        setUser(session.user)
        supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setUserProfile(data)
          })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = () => {
    // Use form submission to properly handle the redirect
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/logout'
    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
  }

  const getFirstName = () => {
    const userData = user as Record<string, unknown> | null
    const fullName = userProfile?.full_name
    const name = fullName ? fullName.split(' ')[0] : (userData?.email as string | undefined)?.split('@')[0] || ""

    // Title case
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  }

  // Show loading state while checking auth - prevents flash of dashboard
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If no user after auth check, don't render (redirect will happen)
  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="/dashboard">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">Scholarly</span>
                    <span className="">Accounting</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="relative h-auto w-full justify-start rounded-md px-3 py-2 shadow-sm">
                {mounted ? (
                  <>
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarImage src={(user as { user_metadata?: { avatar_url?: string } })?.user_metadata?.avatar_url || ""} alt="User" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(user as { email?: string })?.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-sm">{getFirstName()}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {(user as { email?: string })?.email}
                      </span>
                    </div>
                    <User className="ml-auto h-4 w-4 text-muted-foreground" />
                  </>
                ) : (
                  <>
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback className="bg-primary/10 text-primary">U</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-sm">Loading...</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">...</span>
                    </div>
                    <User className="ml-auto h-4 w-4 text-muted-foreground" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            {mounted && (
              <DropdownMenuContent side="top" align="start" sideOffset={4} className="w-full min-w-[var(--radix-popper-anchor-width)]">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getFirstName()}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {(user as { email?: string })?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <button
                    onClick={handleLogout}
                    className="w-full cursor-pointer text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-end gap-2">
            {user && (
              <NotificationBell userId={(user as { id?: string }).id || ""} />
            )}
            {showThemeToggle && mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            )}
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
