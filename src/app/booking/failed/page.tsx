"use client"

import Link from "next/link"
import { AlertCircle, ArrowRight, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BookingFailedPage() {
  const handleRetry = () => {
    window.history.back()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-red-100">
      <div className="w-full max-w-md">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-red-600" />
            </div>
            <CardTitle className="text-3xl text-red-900">فشل الحجز</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-red-800 font-medium">
                للأسف، لم يتمكن النظام من معالجة حجزك
              </p>
              <p className="text-red-700 text-sm">
                قد يكون هناك مشكلة في عملية الدفع أو انقطاع في الاتصال. يرجى المحاولة مرة أخرى.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-red-200 space-y-3">
              <h3 className="font-semibold text-red-900">أسباب محتملة:</h3>
              <ul className="space-y-2 text-sm text-red-800">
                <li className="flex gap-2">
                  <span className="text-red-600">⚠</span>
                  <span>بيانات بطاقة الائتمان غير صحيحة</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600">⚠</span>
                  <span>عدم توفر رصيد كافي</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600">⚠</span>
                  <span>انقطاع في الاتصال بالإنترنت</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600">⚠</span>
                  <span>انقضاء صلاحية الجلسة</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                <RefreshCw className="w-4 h-4 ml-1" />
                حاول مجددا
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-red-200 text-red-900 hover:bg-red-50"
              >
                <Link href="/">
                  العودة إلى الصفحة الرئيسية
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>

            <div className="text-center space-y-2 text-xs text-red-700 border-t border-red-200 pt-4">
              <p>هل تحتاج إلى مساعدة؟</p>
              <a
                href="https://wa.me/201550061006"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:text-red-700 font-medium"
              >
                اتصل بنا عبر WhatsApp
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
