"use client";

import Image from "next/image";
import { useState } from "react";

const seasons = ["الربيع", "الصيف", "الخريف", "الشتاء"];

export default function WeatherSection() {
  const [activeSeason, setActiveSeason] = useState("الربيع");
  const [activeDest, setActiveDest] = useState("redsea");

  return (
    <section className="bg-off-white py-20 pb-40">
      <div className="max-w-[1920px] mx-auto px-4 md:px-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-teal-primary text-base block mb-3">الطقس والفصول</span>
          <h2 className="text-text-dark text-4xl md:text-5xl font-bold mb-8">وجهة على مدار العام</h2>
          
          {/* Destination Toggle */}
          <div className="inline-flex bg-white rounded-full p-1 shadow-sm mb-12">
            <button
              onClick={() => setActiveDest("redsea")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activeDest === "redsea"
                  ? "bg-text-dark text-white"
                  : "bg-transparent text-text-dark hover:bg-gray-50"
              }`}
            >
              وجهة البحر الأحمر
            </button>
            <button
              onClick={() => setActiveDest("amaala")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                activeDest === "amaala"
                  ? "bg-text-dark text-white"
                  : "bg-transparent text-text-dark hover:bg-gray-50"
              }`}
            >
              تريل باي، أمالا
            </button>
          </div>
        </div>

        {/* Weather Banner */}
        <div className="relative w-full h-[450px] rounded-3xl overflow-hidden shadow-lg">
          <Image
            src="/weather-season-bg.webp"
            alt="Weather Background"
            fill
            className="object-cover"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Weather Data Overlay (Bottom Left visually -> Bottom End in RTL) */}
          <div className="absolute bottom-8 left-8 right-auto md:left-auto md:right-8 flex gap-4 rtl:right-auto rtl:left-8">
             {/* PRD says "Bottom-left of image". In RTL, Left is End.
                 So we position it at left: 8.
             */}
             
             {/* But wait, RTL layout flips things.
                 If I use `left-8` in RTL, it stays on the left visually?
                 Yes, physical properties like left/right don't flip automatically unless using logical properties (inset-inline-end).
                 Tailwind `left-8` is `left: 2rem`.
                 PRD: "Box 1 (Right in RTL): Temp... Box 2 (Left in RTL): Wind"
                 So visually: [Wind Box] [Temp Box] (on the left side of screen)
             */}
             
             <div className="flex gap-4">
                {/* Box 1: Temp */}
                <div className="bg-black/30 backdrop-blur-md rounded-xl p-5 text-white min-w-[140px] text-right">
                  <div className="flex items-baseline justify-end gap-1 mb-1">
                    <span className="text-4xl font-bold">23</span>
                    <span className="text-xl">°م</span>
                  </div>
                  <div className="text-xs text-white/70">درجة الحرارة</div>
                </div>

                {/* Box 2: Wind */}
                <div className="bg-black/30 backdrop-blur-md rounded-xl p-5 text-white min-w-[140px] text-right">
                  <div className="flex items-baseline justify-end gap-1 mb-1">
                    <span className="text-lg">كم/س</span>
                    <span className="text-3xl font-bold">9-16</span>
                  </div>
                  <div className="text-xs text-white/70">سرعة الرياح</div>
                </div>
             </div>
          </div>

          {/* Season Tabs (Bottom Center/Right) */}
          <div className="absolute bottom-8 right-8 rtl:left-auto rtl:right-8 flex gap-2 bg-black/20 backdrop-blur-sm p-1 rounded-full">
            {seasons.map((season) => (
              <button
                key={season}
                onClick={() => setActiveSeason(season)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeSeason === season
                    ? "bg-white text-text-dark shadow-sm"
                    : "bg-transparent text-white hover:bg-white/10"
                }`}
              >
                {season}
              </button>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
