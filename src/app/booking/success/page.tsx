"use client"

import Link from "next/link"
import { CheckCircle, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-duck-cyan/5 to-duck-yellow/5">
      <div className="w-full max-w-md">
        <Card className="border-duck-cyan/30 bg-white shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-duck-cyan" />
            </div>
            <CardTitle className="text-3xl text-duck-navy">تم الحجز بنجاح!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-text-dark font-medium">
                شكراً لك على حجزك معنا
              </p>
              <p className="text-text-body text-sm">
                تم استلام طلبك وسيتم معالجته قريباً. ستتلقى تأكيد عبر البريد الإلكتروني.
              </p>
            </div>

            <div className="bg-off-white rounded-lg p-4 border border-duck-cyan/20 space-y-3">
              <h3 className="font-semibold text-duck-navy">ماذا بعد؟</h3>
              <ul className="space-y-2 text-sm text-text-body">
                <li className="flex gap-2">
                  <span className="text-duck-cyan">✓</span>
                  <span>سيتم إرسال تأكيد الحجز إلى بريدك الإلكتروني</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-duck-cyan">✓</span>
                  <span>سنتصل بك قبل الرحلة بيوم واحد</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-duck-cyan">✓</span>
                  <span>استمتع بتجربتك على نهر النيل</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                asChild
                className="w-full bg-duck-yellow text-duck-navy hover:bg-duck-yellow-hover font-medium rounded-full"
              >
                <Link href="/">
                  العودة إلى الصفحة الرئيسية
                  <ArrowRight className="w-4 h-4 ms-1" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-duck-navy/30 text-duck-navy hover:bg-duck-navy/5 rounded-full"
              >
                <Link href="/book">احجز رحلة أخرى</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
