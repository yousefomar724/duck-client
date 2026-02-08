"use client"

import Image from "next/image"

const accessInfo = [
  { time: "4", unit: "مواقع", desc: "متاحة على النيل" },
  { time: "1", unit: "ساعة", desc: "طيران من القاهرة" },
  { time: "4", unit: "ساعات", desc: "بالقطار من القاهرة" },
  { time: "3", unit: "ساعات", desc: "بالسيارة من الأقصر" },
]

const regions = [
  "الكل",
  "كاياك",
  "ستاند اب",
  "واتر بايك",
]

export default function LocationSection() {
  return (
    <section className="bg-off-white py-20">
      <div className="max-w-[1920px] mx-auto px-4 md:px-10">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-teal-primary text-base block mb-3">الموقع</span>
          <h2 className="text-text-dark text-4xl md:text-5xl font-bold mb-4">
            اكتشف المكان المثالي لمغامرتك المائية
          </h2>
          <p className="text-text-body mb-8 max-w-2xl mx-auto">
            اختر النشاط لرؤية المواقع المتاحة على الخريطة
          </p>

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

          {/* Mock Overlay Elements for Map Visualization */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Aswan/Nile Badge */}
            <div className="absolute top-[45%] left-[55%] -translate-x-1/2 -translate-y-1/2 bg-teal-primary text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
              أسوان، مصر - نهر النيل
            </div>
          </div>
        </div>

        {/* Access Info */}
        <div className="flex flex-wrap justify-center gap-4 mb-8" dir="rtl">
          {accessInfo.map((item, index) => (
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
          4 مواقع متاحة للرياضات المائية على نهر النيل في أسوان.
        </p>
      </div>
    </section>
  )
}
