"use client";

import Image from "next/image";
import { useState } from "react";

const seasons = ["الربيع", "الصيف", "الخريف", "الشتاء"];

export default function WeatherSection() {
  const [activeSeason, setActiveSeason] = useState("الربيع");
  const [activeDest, setActiveDest] = useState("redsea");

  return (
    <section className="bg-off-white py-12 sm:py-16 md:py-20 pb-24 sm:pb-32 md:pb-40">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-10">
        
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-teal-primary text-sm sm:text-base block mb-2 sm:mb-3">الطقس</span>
          <h2 className="text-text-dark text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8">أسوان على مدار العام</h2>
          
          {/* Destination Toggle */}
          <div className="inline-flex bg-white rounded-full p-1 shadow-sm mb-8 sm:mb-12">
            <button
              onClick={() => setActiveDest("redsea")}
              className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                activeDest === "redsea"
                  ? "bg-text-dark text-white"
                  : "bg-transparent text-text-dark hover:bg-gray-50"
              }`}
            >
              أسوان
            </button>
            <button
              onClick={() => setActiveDest("amaala")}
              className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                activeDest === "amaala"
                  ? "bg-text-dark text-white"
                  : "bg-transparent text-text-dark hover:bg-gray-50"
              }`}
            >
              نهر النيل
            </button>
          </div>
        </div>

        {/* Weather Banner */}
        <div className="relative w-full h-[260px] sm:h-[320px] md:h-[380px] lg:h-[450px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg">
          <Image
            src="/weather-season-bg.webp"
            alt="Weather Background"
            fill
            className="object-cover"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />

          {/* Bottom overlays: stack on small screens, side-by-side on md+ */}
          <div className="absolute bottom-3 sm:bottom-6 md:bottom-8 start-3 end-3 sm:start-6 sm:end-6 md:start-8 md:end-8 flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
            {/* Weather Data Boxes (Temp + Wind) */}
            <div className="flex gap-2 sm:gap-4 justify-center md:justify-end rtl:md:justify-start shrink-0">
              <div className="bg-black/30 backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-5 text-white min-w-[100px] sm:min-w-[120px] md:min-w-[140px] text-right">
                <div className="flex items-baseline justify-end gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold">23</span>
                  <span className="text-base sm:text-lg md:text-xl">°م</span>
                </div>
                <div className="text-[10px] sm:text-xs text-white/70">درجة الحرارة</div>
              </div>
              <div className="bg-black/30 backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-5 text-white min-w-[100px] sm:min-w-[120px] md:min-w-[140px] text-right">
                <div className="flex items-baseline justify-end gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                  <span className="text-sm sm:text-base md:text-lg">كم/س</span>
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold">9-16</span>
                </div>
                <div className="text-[10px] sm:text-xs text-white/70">سرعة الرياح</div>
              </div>
            </div>

            {/* Season Tabs */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center md:justify-end rtl:md:justify-start bg-black/20 backdrop-blur-sm p-1 rounded-full w-fit mx-auto md:mx-0">
              {seasons.map((season) => (
                <button
                  key={season}
                  onClick={() => setActiveSeason(season)}
                  className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
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

      </div>
    </section>
  );
}
