"use client"

import {
  ArrowUp,
  Mail,
  Phone,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
} from "lucide-react"

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer className="bg-dark-bg text-white">
      {/* Newsletter Section */}
      <div className="py-4 px-4 md:px-10 border-b border-white/10">
        <div className="flex justify-center">
          <button
            onClick={scrollToTop}
            className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="py-16 px-4 md:px-10 max-w-[1920px] mx-auto">
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12"
          dir="rtl"
        >
          {/* Column 1: Logo & Brand */}
          <div>
            <div className="mb-8">
              <div className="text-white font-serif mb-2">
                <div className="text-xl font-bold">Duck Entertainment</div>
                <div className="text-lg font-bold">دوك إنترتينمنت</div>
              </div>
              <p className="text-white/80 text-sm mt-2">
                اصنع مغامرتك المائية التي لا تُنسى على نهر النيل الأسطوري.
                استمتع بسحر أسوان من منظور فريد.
              </p>
            </div>

            <div className="flex gap-4">
              <Linkedin className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
              <Instagram className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
              <Twitter className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
              <Facebook className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
            </div>
          </div>

          {/* Column 2: الشركة */}
          <div>
            <h4 className="text-base font-bold mb-6">الشركة</h4>
            <ul className="space-y-3 text-white/70 text-sm">
              {["من نحن", "فريقنا", "الوظائف", "الصحافة"].map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: الخدمات */}
          <div>
            <h4 className="text-base font-bold mb-6">الخدمات</h4>
            <ul className="space-y-3 text-white/70 text-sm">
              {[
                "جولات الكاياك",
                "الستاند اب",
                "الواتر بايك",
                "الجولات الخاصة",
              ].map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: الدعم & Contact */}
          <div>
            <h4 className="text-base font-bold mb-6">الدعم</h4>
            <ul className="space-y-3 text-white/70 text-sm mb-6">
              {[
                "الأسئلة الشائعة",
                "اتصل بنا",
                "معلومات السلامة",
                "سياسة الحجز",
              ].map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3 mb-2 text-sm">
              <Phone className="w-4 h-4 text-white/60" />
              <span dir="ltr">+20 123 456 7890</span>
            </div>
            <div className="flex items-center gap-3 mb-2 text-sm">
              <Mail className="w-4 h-4 text-white/60" />
              <a href="mailto:info@duck.com" className="hover:text-white">
                info@duck.com
              </a>
            </div>
            <div className="text-sm text-white/70">Aswan, Egypt</div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="bg-dark-bg-deeper py-6 px-4 md:px-10 border-t border-white/5">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <div className="flex flex-wrap gap-4 md:gap-8 justify-center md:justify-start">
            <a href="#" className="hover:text-white/80">
              سياسة الخصوصية
            </a>
            <a href="#" className="hover:text-white/80">
              شروط الخدمة
            </a>
            <a href="#" className="hover:text-white/80">
              سياسة ملفات تعريف الارتباط
            </a>
          </div>

          <div className="flex items-center gap-4">
            <span>20.8°C ☀️</span>
            <span>09:34 ص 🕒</span>
          </div>

          <div className="text-center md:text-left">
            © 2026 دوك إنترتينمنت. جميع الحقوق محفوظة.
          </div>
        </div>
      </div>
    </footer>
  )
}
