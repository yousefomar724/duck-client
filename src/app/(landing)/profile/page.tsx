"use client"

import Link from "next/link"
import { LogOut, UserCircle2 } from "lucide-react"
import { ProtectedRoute } from "@/components/shared/protected-route"
import PageHeader from "@/components/shared/page-header"
import Footer from "@/components/landing/Footer"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/lib/auth/auth-context"

function ProfileContent() {
  const { user, logout } = useAuth()
  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username
    : "مستخدم"

  return (
    <>
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
          <PageHeader title="الملف الشخصي" description="إدارة حسابك وإعداداتك الأساسية" />

          <Card className="border border-black/5 shadow-xs">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-duck-cyan/10 text-duck-cyan flex items-center justify-center">
                  <UserCircle2 className="size-7" />
                </div>
                <div>
                  <CardTitle className="text-xl">{fullName}</CardTitle>
                  <CardDescription>حساب مستخدم</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-text-muted">اسم المستخدم</p>
                  <p className="font-medium">{user?.username || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-text-muted">البريد الإلكتروني</p>
                  <p className="font-medium" dir="ltr">
                    {user?.email || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-text-muted">رقم الجوال</p>
                  <p className="font-medium" dir="ltr">
                    {user?.phone_number || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-text-muted">نوع الحساب</p>
                  <p className="font-medium">مستخدم</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild className="bg-duck-cyan hover:bg-duck-cyan-light">
                  <Link href="/my-bookings">حجوزاتي</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/book">احجز الآن</Link>
                </Button>
                <Button
                  variant="destructive"
                  type="button"
                  onClick={logout}
                  className="gap-2"
                >
                  <LogOut className="size-4" />
                  تسجيل الخروج
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute allowedRoles={[0]}>
      <ProfileContent />
    </ProtectedRoute>
  )
}
