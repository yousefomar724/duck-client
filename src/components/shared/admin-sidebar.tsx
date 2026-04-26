"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LogOut, User } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Logo from "./logo"
import { adminNavItems } from "@/lib/constants"
import { useLocale, useTranslations } from "next-intl"

export default function AdminSidebar() {
  const t = useTranslations("common")
  const locale = useLocale()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()
  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.username
    : "مدير"

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar side={locale === "ar" ? "right" : "left"} collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-center py-4">
          <Logo width={100} height={50} />
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
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild className="h-full!">
                <SidebarMenuButton className="w-full">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-duck-cyan text-white">
                      {displayName.charAt(0) || "أ"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-right">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className="text-xs text-text-muted">مدير</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuItem>
                  <User className="w-4 h-4 ms-2" />
                  <span>الملف الشخصي</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => logout()}>
                  <LogOut className="w-4 h-4 ms-2" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
