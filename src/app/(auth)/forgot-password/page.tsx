"use client"

import { useState } from "react"
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

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword")
  const toMessage = useAuthErrorMessage()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { error: forgotError } = await authApi.forgotPassword(email)
    if (forgotError) {
      setError(toMessage(forgotError))
    } else {
      setSuccess(true)
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
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

        <div className="text-center mt-4">
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
