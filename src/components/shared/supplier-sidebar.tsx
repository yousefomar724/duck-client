"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Package, User } from "lucide-react"
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
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Logo from "./logo"
import { supplierNavItems } from "@/lib/constants"
import * as suppliersApi from "@/lib/api/suppliers"
import { resolveImageUrl } from "@/lib/image-utils"

function getLocalizedName(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (!value || typeof value !== "object" || Array.isArray(value)) return ""

  const localized = value as { ar?: unknown; en?: unknown }
  const ar = typeof localized.ar === "string" ? localized.ar.trim() : ""
  const en = typeof localized.en === "string" ? localized.en.trim() : ""
  return ar || en || ""
}

export default function SupplierSidebar() {
  const pathname = usePathname()
  const { user, logout, onboardingComplete } = useAuth()
  const supplierId = user?.supplier_id
  const [supplierName, setSupplierName] = useState("")
  const [supplierIcon, setSupplierIcon] = useState("")
  const [refreshTick, setRefreshTick] = useState(0)

  const fallbackDisplayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.username
    : "مزود خدمة"
  const displayName = (supplierId ? supplierName : "") || fallbackDisplayName
  const secondaryText = user?.username || "مزود خدمة"
  const avatarSrc = useMemo(
    () => resolveImageUrl(supplierId ? supplierIcon : "") ?? undefined,
    [supplierIcon, supplierId],
  )

  const needsSetup = onboardingComplete === false

  useEffect(() => {
    let cancelled = false
    if (!supplierId) return

    suppliersApi.getSupplier(supplierId, "ar").then(({ data }) => {
      if (cancelled || !data) return
      setSupplierName(getLocalizedName(data.name))
      setSupplierIcon((data.icon ?? "").trim())
    })

    return () => {
      cancelled = true
    }
  }, [supplierId, pathname, refreshTick])

  useEffect(() => {
    const handleSupplierUpdated = () => {
      setRefreshTick((prev) => prev + 1)
    }

    window.addEventListener(
      "duck:supplier-profile-updated",
      handleSupplierUpdated,
    )
    return () => {
      window.removeEventListener(
        "duck:supplier-profile-updated",
        handleSupplierUpdated,
      )
    }
  }, [])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-center py-4">
          <Logo width={100} height={50} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>لوحة المزود</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supplierNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}

              {onboardingComplete !== true && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/supplier/onboarding"}
                  >
                    <Link href="/supplier/onboarding">
                      <Package className="w-4 h-4" />
                      <span className="flex items-center gap-2">
                        إكمال الإعداد
                        {needsSetup && (
                          <span className="w-2 h-2 rounded-full bg-duck-yellow" />
                        )}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger
                asChild
                className="h-full! bg-gray-100 cursor-pointer"
              >
                <SidebarMenuButton className="w-full">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={avatarSrc} alt={displayName} />
                    <AvatarFallback className="bg-duck-cyan text-white">
                      {displayName.charAt(0) || "م"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-right">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className="text-xs text-text-muted">
                      {secondaryText}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/supplier/profile">
                    <User className="w-4 h-4 ml-2" />
                    <span>الملف الشخصي</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => logout()}>
                  <LogOut className="w-4 h-4 ml-2" />
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
