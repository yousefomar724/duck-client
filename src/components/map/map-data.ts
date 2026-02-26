export type ActivityType = "kayak" | "sup" | "waterbike"

export type DifficultyLevel = "easy" | "medium" | "hard"

export interface WaterActivityLocation {
  id: string
  name: string
  coordinates: [number, number]
  activities: ActivityType[]
  image: string
  /** Multiple images for carousel; falls back to `image` if absent */
  images?: string[]
  status: "open" | "coming_soon"
  description: string
  duration?: string
  price?: string
  operatingHours?: string
  difficulty?: DifficultyLevel
  highlights?: string[]
}

export interface ActivityFilter {
  id: ActivityType | "all"
  label: string
}

export const ACTIVITY_FILTERS: ActivityFilter[] = [
  { id: "all", label: "الكل" },
  { id: "kayak", label: "كاياك" },
  { id: "sup", label: "تجديف واقف" },
  { id: "waterbike", label: "دراجة مائية" },
]

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  kayak: "كاياك",
  sup: "تجديف واقف",
  waterbike: "دراجة مائية",
}

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
}

export const ASWAN_CENTER: [number, number] = [24.0889, 32.8998]
export const DEFAULT_ZOOM = 13
/** Zoom level when a pin is selected (zoom in to focus on the location) */
export const FOCUSED_ZOOM = 15

export const LOCATIONS: WaterActivityLocation[] = [
  {
    id: "elephantine",
    name: "جزيرة إلفنتين",
    coordinates: [24.0917, 32.8875],
    activities: ["kayak", "sup"],
    image: "/discover-card.webp",
    images: ["/discover-card.webp", "/offer.webp"],
    status: "open",
    description:
      "استمتع بالتجديف حول جزيرة إلفنتين التاريخية، واكتشف الآثار الفرعونية من على سطح الماء في تجربة فريدة تجمع بين الرياضة والتاريخ.",
    duration: "٤٥ - ٦٠ دقيقة",
    price: "من ٣٥٠ ج.م",
    operatingHours: "٨ ص - ٥ م",
    difficulty: "easy",
    highlights: [
      "إطلالة على الآثار الفرعونية",
      "مناسب للمبتدئين",
      "مرشد محلي متاح",
    ],
  },
  {
    id: "kitchener",
    name: "جزيرة النباتات",
    coordinates: [24.08, 32.88],
    activities: ["kayak", "sup", "waterbike"],
    image: "/offer.webp",
    images: ["/offer.webp", "/discover-card.webp"],
    status: "open",
    description:
      "اكتشف الحديقة النباتية الساحرة من على الماء، حيث تحيط بك النباتات الاستوائية النادرة في أجواء هادئة على ضفاف النيل.",
    duration: "١ - ٢ ساعة",
    price: "من ٤٠٠ ج.م",
    operatingHours: "٩ ص - ٤ م",
    difficulty: "easy",
    highlights: [
      "حديقة نباتية استوائية نادرة",
      "جميع المعدات متوفرة",
      "جولات جماعية أو خاصة",
    ],
  },
  {
    id: "philae",
    name: "معبد فيلة",
    coordinates: [24.0218, 32.8838],
    activities: ["kayak"],
    image: "/resort.webp",
    images: ["/resort.webp"],
    status: "coming_soon",
    description:
      "رحلة بالكاياك إلى معبد فيلة الأسطوري، حيث تمر بين الجزر الصغيرة وتشاهد المعبد من زاوية فريدة لا يراها أغلب الزوار.",
    duration: "٢ - ٣ ساعات",
    price: "قريباً",
    operatingHours: "٨ ص - ٢ م",
    difficulty: "medium",
    highlights: [
      "منظر فريد لمعبد فيلة",
      "رحلة ممتدة بين الجزر",
      "افتتاح قريب",
    ],
  },
  {
    id: "high-dam",
    name: "السد العالي",
    coordinates: [23.97041, 32.87675],
    activities: ["waterbike"],
    image: "/weather-season-bg.webp",
    images: ["/weather-season-bg.webp", "/discover-card.webp"],
    status: "coming_soon",
    description:
      "مغامرة مائية بالقرب من السد العالي، استمتع بمشاهدة هذا الإنجاز الهندسي العملاق من على دراجتك المائية.",
    duration: "١.٥ - ٢ ساعة",
    price: "قريباً",
    operatingHours: "٧ ص - ١٢ م",
    difficulty: "medium",
    highlights: [
      "مشاهدة السد العالي من الماء",
      "دراجات مائية حديثة",
      "افتتاح قريب",
    ],
  },
  {
    id: "nubian-village",
    name: "القرية النوبية",
    coordinates: [24.06141, 32.86419],
    activities: ["kayak", "sup", "waterbike"],
    image: "/discover-card.webp",
    images: ["/discover-card.webp", "/offer.webp", "/resort.webp"],
    status: "open",
    description:
      "تجربة فريدة بين ألوان القرية النوبية الزاهية، تجدّف بين البيوت الملونة وتتعرف على الثقافة النوبية الأصيلة من على الماء.",
    duration: "١ - ١.٥ ساعة",
    price: "من ٣٢٠ ج.م",
    operatingHours: "٨ ص - ٦ م",
    difficulty: "easy",
    highlights: [
      "بيوت نوبية ملونة",
      "ثقافة نوبية أصيلة",
      "تصوير فوتوغرافي مميز",
    ],
  },
  {
    id: "old-cataract",
    name: "فندق أولد كتراكت",
    coordinates: [24.0804, 32.8812],
    activities: ["sup"],
    image: "/offer.webp",
    images: ["/offer.webp"],
    status: "open",
    description:
      "تجديف واقف أمام الفندق التاريخي الشهير الذي استضاف ملوكاً وأدباء عالميين، مع إطلالة خلابة على النيل وجزيرة إلفنتين.",
    duration: "٤٥ دقيقة - ١ ساعة",
    price: "من ٣٨٠ ج.م",
    operatingHours: "٦ ص - ٦ م",
    difficulty: "easy",
    highlights: [
      "إطلالة على الفندق التاريخي",
      "مناسب للتصوير",
      "معدات احترافية",
    ],
  },
  {
    id: "ferial-garden",
    name: "حديقة الفريال",
    coordinates: [24.08348, 32.88914],
    activities: ["kayak", "waterbike"],
    image: "/resort.webp",
    images: ["/resort.webp", "/weather-season-bg.webp"],
    status: "coming_soon",
    description:
      "انطلق من حديقة الفريال على كورنيش أسوان في جولة مائية ممتعة، مع مشاهد بانورامية للنيل ومعالم أسوان.",
    duration: "١ ساعة",
    price: "قريباً",
    operatingHours: "٨ ص - ٥ م",
    difficulty: "easy",
    highlights: [
      "انطلاق من كورنيش أسوان",
      "مشاهد بانورامية",
      "افتتاح قريب",
    ],
  },
]
