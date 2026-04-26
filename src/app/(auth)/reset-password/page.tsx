"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
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
import { useAuthErrorMessage } from "@/lib/auth/error-messages"
import * as authApi from "@/lib/api/auth"

function ResetPasswordContent() {
  const t = useTranslations("auth.resetPassword")
  const toMessage = useAuthErrorMessage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError(t("invalidToken"))
      return
    }

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"))
      return
    }

    if (password.length < 6) {
      setError(t("passwordTooShort"))
      return
    }

    setIsLoading(true)
    const { error: resetError } = await authApi.resetPassword(token, password)
    if (resetError) {
      setError(toMessage(resetError))
    } else {
      setSuccess(true)
      setTimeout(() => router.push("/login"), 2000)
    }
    setIsLoading(false)
  }

  if (success) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-duck-navy">
            {t("successTitle")}
          </CardTitle>
          <CardDescription className="text-center text-text-muted">
            {t("successDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-duck-cyan hover:text-duck-cyan-light font-medium transition-colors"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              {t("backToLogin")}
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!token) {
    return (
      <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-duck-navy">
            {t("invalidLinkTitle")}
          </CardTitle>
          <CardDescription className="text-center text-text-muted">
            {t("invalidLinkDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="inline-flex items-center text-sm text-duck-cyan hover:text-duck-cyan-light font-medium transition-colors"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              {t("requestNewLink")}
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center text-duck-navy">
          {t("title")}
        </CardTitle>
        <CardDescription className="text-center text-text-muted">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">{t("newPassword")}</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/50 border-gray-200 focus:border-duck-cyan focus:ring-duck-cyan/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-white/50 border-gray-200 focus:border-duck-cyan focus:ring-duck-cyan/20"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-bold shadow-md transition-all hover:shadow-lg"
          >
            {isLoading ? t("loading") : t("submit")}
          </Button>
        </form>

        <p className="text-center text-sm text-text-muted mt-4">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="text-duck-cyan hover:text-duck-cyan-light font-medium transition-colors"
          >
            {t("loginLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

function ResetPasswordFallback() {
  const t = useTranslations("auth.resetPassword")
  return (
    <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center text-duck-navy">
          {t("title")}
        </CardTitle>
        <CardDescription className="text-center text-text-muted">
          {t("fallbackLoading")}
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
