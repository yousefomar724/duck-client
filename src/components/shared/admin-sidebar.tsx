"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LogOut } from "lucide-react"
import { useAuth } from "@/lib/stores/auth-store"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Logo from "./logo"
import { adminNavItems } from "@/lib/constants"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export default function AdminSidebar() {
  const t = useTranslations("common")
  const locale = useLocale()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { isMobile, state, setOpenMobile } = useSidebar()
  const isCollapsedIcon = !isMobile && state === "collapsed"
  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.username
    : "مدير"
  const email = user?.email?.trim() || ""

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar side={locale === "ar" ? "right" : "left"} collapsible="icon">
      <SidebarHeader>
        <div
          className={cn(
            "flex flex-col items-stretch px-2",
            isCollapsedIcon ? "gap-2" : "gap-3",
          )}
        >
          <div
            className={cn(
              "flex justify-center",
              isCollapsedIcon ? "py-1.5" : "py-2",
            )}
          >
            <Logo
              width={isCollapsedIcon ? 36 : 100}
              height={isCollapsedIcon ? 18 : 50}
              className={cn(
                isCollapsedIcon &&
                  "max-h-8 w-auto max-w-11 object-contain",
              )}
            />
          </div>
          {isCollapsedIcon ? (
            <div className="flex justify-center pb-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md outline-none ring-sidebar-ring focus-visible:ring-2"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-duck-cyan text-sm text-white">
                        {displayName.charAt(0) || "أ"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side={locale === "ar" ? "left" : "right"}
                  className="max-w-[min(100vw-2rem,18rem)] text-right"
                >
                  <p className="font-medium">{displayName}</p>
                  <p className="text-muted-foreground text-xs">{email || "—"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-2 py-2.5">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-duck-cyan text-sm text-white">
                  {displayName.charAt(0) || "أ"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate text-sm font-medium leading-tight">
                  {displayName}
                </p>
                <p
                  className="truncate text-xs text-text-muted"
                  title={email || undefined}
                >
                  {email || "—"}
                </p>
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-semibold"
                >
                  <Link href="/" onClick={handleNavClick}>
                    <Home className="w-4 h-4" />
                    <span>{t("backToHome")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>لوحة الإدارة</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} onClick={handleNavClick}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="w-full"
              onClick={() => {
                logout()
                if (isMobile) setOpenMobile(false)
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
