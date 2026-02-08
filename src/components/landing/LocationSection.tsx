"use client"

import Image from "next/image"

const flightTimes = [
  { time: "1:30", unit: "ساعة", desc: "من الرياض/جدة" },
  { time: "3", unit: "ساعات", desc: "من العلا (بالسيارة)" },
  { time: "3", unit: "ساعات", desc: "من دول الخليج العربي والشرق الأوسط" },
  { time: "4-7", unit: "ساعات", desc: "من أوروبا وأفريقيا والهند" },
  { time: "10", unit: "ساعات", desc: "من الصين وروسيا" },
]

const regions = [
  "الكل",
  "السعودية",
  "دول الخليج العربي",
  "آسيا",
  "أوروبا",
  "أمريكا الشمالية",
]

export default function LocationSection() {
  return (
    <section className="bg-off-white py-20">
      <div className="max-w-[1920px] mx-auto px-4 md:px-10">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-teal-primary text-base block mb-3">الموقع</span>
          <h2 className="text-text-dark text-4xl md:text-5xl font-bold mb-8">
            يقع عند التقاء القارات
          </h2>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12">
            {regions.map((region, index) => (
              <button
                key={region}
                className={`text-sm md:text-base font-medium transition-colors pb-2 ${
                  index === 0
                    ? "text-text-dark border-b-2 border-text-dark"
                    : "text-text-muted hover:text-text-body"
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div className="relative w-full aspect-[16/9] max-h-[600px] mb-12 bg-white rounded-3xl shadow-sm overflow-hidden flex items-center justify-center">
          <Image
            src="/world-map.svg"
            alt="World Map"
            width={1200}
            height={600}
            className="w-full h-full object-contain opacity-80"
          />

          {/* Mock Overlay Elements for Map Visualization (since SVG might be static) */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Red Sea Badge */}
            <div className="absolute top-[45%] left-[55%] -translate-x-1/2 -translate-y-1/2 bg-teal-primary text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
              وجهة البحر الأحمر
            </div>

            {/* Europe Badge */}
            <div className="absolute top-[30%] left-[50%] bg-dark-bg text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
              أوروبا
            </div>

            {/* Asia Badge */}
            <div className="absolute top-[35%] left-[70%] bg-dark-bg text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
              آسيا
            </div>
          </div>
        </div>

        {/* Flight Times */}
        <div className="flex flex-wrap justify-center gap-4 mb-8" dir="rtl">
          {flightTimes.map((item, index) => (
            <div
              key={index}
              className="flex-1 min-w-[200px] max-w-[240px] bg-text-body text-white p-6 rounded-xl text-center flex flex-col items-center justify-center"
            >
              <div className="text-4xl font-bold mb-1">{item.time}</div>
              <div className="text-lg mb-2">{item.unit}</div>
              <div className="text-white/70 text-xs">{item.desc}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-text-muted text-xs">
          مدة الرحلات تقريبية وقد تختلف حسب نوع الطائرة والظروف.
        </p>
      </div>
    </section>
  )
}
