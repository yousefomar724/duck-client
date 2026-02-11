"use client"

import Link from "next/link"
import { CheckCircle, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-duck-cyan/5 to-duck-yellow/5">
      <div className="w-full max-w-md">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-900">تم الحجز بنجاح!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-green-800 font-medium">
                شكراً لك على حجزك معنا
              </p>
              <p className="text-green-700 text-sm">
                تم استلام طلبك وسيتم معالجته قريباً. ستتلقى تأكيد عبر البريد الإلكتروني.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200 space-y-3">
              <h3 className="font-semibold text-green-900">ماذا بعد؟</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>سيتم إرسال تأكيد الحجز إلى بريدك الإلكتروني</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>ستتمكن من متابعة حالة حجزك من حسابك</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-600">✓</span>
                  <span>سنتصل بك قبل الرحلة بيوم واحد</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                asChild
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                <Link href="/supplier/bookings">
                  عرض حجوزاتي
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-green-200 text-green-900 hover:bg-green-50"
              >
                <Link href="/">العودة إلى الصفحة الرئيسية</Link>
              </Button>
            </div>

            <div className="text-center text-xs text-green-700">
              <p>رقم مرجع الحجز: #{'RB' + Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
