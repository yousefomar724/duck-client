"use client"

import Link from "next/link"
import { CheckCircle, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

export default function BookingSuccessPage() {
  const t = useTranslations("bookingSuccess")

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-duck-cyan/5 to-duck-yellow/5">
      <div className="w-full max-w-md">
        <Card className="border-duck-cyan/30 bg-white shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-duck-cyan" />
            </div>
            <CardTitle className="text-3xl text-duck-navy">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-text-dark font-medium">
                {t("thankYou")}
              </p>
              <p className="text-text-body text-sm">
                {t("description")}
              </p>
            </div>

            <div className="bg-off-white rounded-lg p-4 border border-duck-cyan/20 space-y-3">
              <h3 className="font-semibold text-duck-navy">{t("whatNext")}</h3>
              <ul className="space-y-2 text-sm text-text-body">
                <li className="flex gap-2">
                  <span className="text-duck-cyan">✓</span>
                  <span>{t("step1")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-duck-cyan">✓</span>
                  <span>{t("step2")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-duck-cyan">✓</span>
                  <span>{t("step3")}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                asChild
                className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-medium rounded-full"
              >
                <Link href="/">
                  {t("backToHome")}
                  <ArrowRight className="w-4 h-4 ms-1" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-duck-navy/30 text-duck-navy hover:bg-duck-navy/5 rounded-full"
              >
                <Link href="/book">{t("bookAnother")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
