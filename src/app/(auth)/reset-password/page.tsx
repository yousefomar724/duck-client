"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight } from "lucide-react"
import * as authApi from "@/lib/api/auth"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError("رابط إعادة التعيين غير صالح أو انتهى")
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError("رابط إعادة التعيين غير صالح")
      return
    }

    if (password !== confirmPassword) {
      setError("كلمات المرور غير متطابقة")
      return
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
      return
    }

    setIsLoading(true)
    const { error: resetError } = await authApi.resetPassword(token, password)
    if (resetError) {
      setError(resetError)
    } else {
      setSuccess(true)
      setTimeout(() => router.push("/login"), 2000)
    }
    setIsLoading(false)
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">تم إعادة التعيين بنجاح</CardTitle>
          <CardDescription className="text-center">
            تم تحديث كلمة المرور بنجاح، سيتم نقلك إلى صفحة تسجيل الدخول
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-duck-cyan hover:text-duck-cyan-light"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!token) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">رابط غير صالح</CardTitle>
          <CardDescription className="text-center">
            رابط إعادة تعيين كلمة المرور غير صالح أو انتهى
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="inline-flex items-center text-sm text-duck-cyan hover:text-duck-cyan-light"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              طلب رابط جديد
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          إعادة تعيين كلمة المرور
        </CardTitle>
        <CardDescription className="text-center">
          أدخل كلمة المرور الجديدة لحسابك
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور الجديدة</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <Input
              id="confirmPassword"
              type="password"
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-medium"
          >
            {isLoading ? "جاري إعادة التعيين..." : "إعادة تعيين كلمة المرور"}
          </Button>
        </form>

        <p className="text-center text-sm text-text-muted">
          هل لديك حساب؟{" "}
          <Link
            href="/login"
            className="text-duck-cyan hover:text-duck-cyan-light font-medium"
          >
            تسجيل الدخول
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

function ResetPasswordFallback() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">
          إعادة تعيين كلمة المرور
        </CardTitle>
        <CardDescription className="text-center">
          جاري التحميل...
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-10 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
