"use client";

import Image from "next/image";
import { ArrowUp, Mail, Phone, Instagram, Twitter, Facebook, Linkedin } from "lucide-react";

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-dark-bg text-white">
      {/* Newsletter Section */}
      <div className="py-16 px-4 md:px-10 border-b border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">ابقَ على اطلاع</h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
            اشترك في النشرة البريدية؛ لتكون أول من يعلم بآخر أخبار الوجهات، وأحدث التجارب، وأفضل العروض
          </p>
          <button className="px-8 py-3 rounded-full border border-white text-white hover:bg-white hover:text-dark-bg transition-colors mb-12">
            اشترك الآن
          </button>
          
          <div className="flex justify-center">
            <button 
              onClick={scrollToTop}
              className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="py-16 px-4 md:px-10 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12" dir="rtl">
          
          {/* Column 1: Logo & Social */}
          <div>
            <div className="mb-8">
               <div className="text-white font-serif mb-2">
                  <div className="text-xs tracking-[0.2em] uppercase">VISIT</div>
                  <div className="text-xl font-bold tracking-wider">RED SEA</div>
               </div>
               <div className="text-lg font-bold">البحر الأحمر</div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-sm font-bold mb-4">تواصل معنا</h4>
              <div className="text-xs text-white/60 mb-2">The Red Sea</div>
              <div className="flex gap-4 mb-6">
                <Linkedin className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
                <Instagram className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
                <Twitter className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
                <Facebook className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
              </div>
              
              <div className="text-xs text-white/60 mb-2">AMAALA</div>
              <div className="flex gap-4">
                <Instagram className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
                <Twitter className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
                <Facebook className="w-5 h-5 text-white/80 hover:text-white cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-base font-bold mb-6">الروابط السريعة</h4>
            <ul className="space-y-3 text-white/70 text-sm">
              {["الوجهات", "المنتجعات", "التجارب والفعاليات", "عروض حصرية", "خطط رحلتك", "الوحدات السكنية", "تتبع أمتعتي"].map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact Form Link */}
          <div>
            <h4 className="text-base font-bold mb-6">تواصل معنا</h4>
            <button className="px-6 py-2 rounded-full border border-white/30 text-sm hover:bg-white/10 transition-colors">
              تواصل معنا
            </button>
          </div>

          {/* Column 4: Contact Info & Apps */}
          <div>
            <div className="flex items-center gap-3 mb-4 text-sm">
              <Phone className="w-4 h-4 text-white/60" />
              <span dir="ltr">+966 11222 2222</span>
            </div>
            <div className="flex items-center gap-3 mb-8 text-sm">
              <Mail className="w-4 h-4 text-white/60" />
              <span>info@visitredsea.com</span>
            </div>

            <div className="mb-2 text-sm font-bold">حمّل التطبيق</div>
            <div className="flex gap-2">
              <div className="relative w-32 h-10 bg-black rounded-lg border border-white/20 overflow-hidden">
                 <Image src="/google-play-new.png" alt="Google Play" fill className="object-contain" />
              </div>
              <div className="relative w-32 h-10 bg-black rounded-lg border border-white/20 overflow-hidden">
                 <Image src="/apple-store-new.png" alt="App Store" fill className="object-contain" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Bottom */}
      <div className="bg-dark-bg-deeper py-6 px-4 md:px-10 border-t border-white/5">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/50">
          
          <div className="flex flex-wrap gap-4 md:gap-8 justify-center md:justify-start">
            <span>الشروط والأحكام</span>
            <span>سياسة الخصوصية</span>
            <span>ترخيص وزارة السياحة: 73104512</span>
            <span>رقم السجل التجاري: 1010916245</span>
          </div>

          <div className="flex items-center gap-4">
             <span>20.8°C ☀️</span>
             <span>09:34 ص 🕒</span>
          </div>

          <div className="text-center md:text-left" dir="ltr">
            Visit Red Sea © 2026. جميع الحقوق محفوظة.
          </div>

        </div>
      </div>
    </footer>
  );
}
