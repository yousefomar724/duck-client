"use client"

import Link from "next/link"
import { LayoutDashboard, LogOut, User } from "lucide-react"
import { useTranslations } from "next-intl"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/stores/auth-store"
import { cn } from "@/lib/utils"

type UserMenuProps = {
  variant?: "dashboard" | "landing"
  isNavbarSolid?: boolean
  onNavigate?: () => void
}

export function UserMenu({
  variant = "dashboard",
  isNavbarSolid = true,
  onNavigate,
}: UserMenuProps) {
  const t = useTranslations("navbar")
  const { user, logout, effectiveRole } = useAuth()
  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.username ||
      user.email ||
      ""
    : ""
  const initial = (displayName.charAt(0) || "?").toUpperCase()
  const dashboardHref =
    effectiveRole === 2
      ? "/admin/bookings"
      : effectiveRole === 1
        ? "/supplier/bookings"
        : null
  // `/profile` is guarded by ProtectedRoute allowedRoles={[0]}, so suppliers get
  // their own page and admins (who have none) get no profile entry at all.
  const profileHref =
    effectiveRole === 1
      ? "/supplier/profile"
      : effectiveRole === 2
        ? null
        : "/profile"

  const labels = {
    profile: variant === "dashboard" ? "الملف الشخصي" : t("profile"),
    dashboard: variant === "dashboard" ? "لوحة التحكم" : t("dashboard"),
    logout: variant === "dashboard" ? "تسجيل الخروج" : t("logout"),
  }

  const handleLogout = () => {
    onNavigate?.()
    logout({ redirectTo: variant === "landing" ? "/" : "/login" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="px-0!">
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-10! min-w-10 gap-2 px-1.5 md:h-11! md:min-w-11 md:px-2",
            variant === "landing" &&
              !isNavbarSolid &&
              "text-white hover:bg-white/10 hover:text-white",
            variant === "landing" &&
              isNavbarSolid &&
              "text-text-dark hover:bg-black/5",
          )}
          aria-label={displayName || labels.profile}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-duck-cyan text-sm text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "max-w-[8rem] truncate text-sm font-medium",
              variant === "landing" ? "hidden md:inline" : "hidden sm:inline",
            )}
          >
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={15}
        className={cn("min-w-56", variant === "landing" && "z-[1000]")}
      >
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-medium">{displayName || "—"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.email || "—"}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profileHref ? (
          <DropdownMenuItem asChild>
            <Link href={profileHref} onClick={onNavigate}>
              <User />
              {labels.profile}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {dashboardHref ? (
          <DropdownMenuItem asChild>
            <Link href={dashboardHref} onClick={onNavigate}>
              <LayoutDashboard />
              {labels.dashboard}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          {labels.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
