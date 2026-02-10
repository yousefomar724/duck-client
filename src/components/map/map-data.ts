export type ActivityType = "kayak" | "sup" | "waterbike"

export interface WaterActivityLocation {
  id: string
  name: string
  coordinates: [number, number]
  activities: ActivityType[]
  image: string
  status: "open" | "coming_soon"
  description: string
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

export const ASWAN_CENTER: [number, number] = [24.0889, 32.8998]
export const DEFAULT_ZOOM = 13

export const LOCATIONS: WaterActivityLocation[] = [
  {
    id: "elephantine",
    name: "جزيرة إلفنتين",
    coordinates: [24.0917, 32.8875],
    activities: ["kayak", "sup"],
    image: "/discover-card.webp",
    status: "open",
    description:
      "استمتع بالتجديف حول جزيرة إلفنتين التاريخية، واكتشف الآثار الفرعونية من على سطح الماء في تجربة فريدة تجمع بين الرياضة والتاريخ.",
  },
  {
    id: "kitchener",
    name: "جزيرة النباتات",
    coordinates: [24.08, 32.88],
    activities: ["kayak", "sup", "waterbike"],
    image: "/offer.webp",
    status: "open",
    description:
      "اكتشف الحديقة النباتية الساحرة من على الماء، حيث تحيط بك النباتات الاستوائية النادرة في أجواء هادئة على ضفاف النيل.",
  },
  {
    id: "philae",
    name: "معبد فيلة",
    coordinates: [24.0218, 32.8838],
    activities: ["kayak"],
    image: "/resort.webp",
    status: "coming_soon",
    description:
      "رحلة بالكاياك إلى معبد فيلة الأسطوري، حيث تمر بين الجزر الصغيرة وتشاهد المعبد من زاوية فريدة لا يراها أغلب الزوار.",
  },
  {
    id: "high-dam",
    name: "السد العالي",
    coordinates: [23.97041, 32.87675],
    activities: ["waterbike"],
    image: "/weather-season-bg.webp",
    status: "coming_soon",
    description:
      "مغامرة مائية بالقرب من السد العالي، استمتع بمشاهدة هذا الإنجاز الهندسي العملاق من على دراجتك المائية.",
  },
  {
    id: "nubian-village",
    name: "القرية النوبية",
    coordinates: [24.06141, 32.86419],
    activities: ["kayak", "sup", "waterbike"],
    image: "/discover-card.webp",
    status: "open",
    description:
      "تجربة فريدة بين ألوان القرية النوبية الزاهية، تجدّف بين البيوت الملونة وتتعرف على الثقافة النوبية الأصيلة من على الماء.",
  },
  {
    id: "old-cataract",
    name: "فندق أولد كتراكت",
    coordinates: [24.0804, 32.8812],
    activities: ["sup"],
    image: "/offer.webp",
    status: "open",
    description:
      "تجديف واقف أمام الفندق التاريخي الشهير الذي استضاف ملوكاً وأدباء عالميين، مع إطلالة خلابة على النيل وجزيرة إلفنتين.",
  },
  {
    id: "ferial-garden",
    name: "حديقة الفريال",
    coordinates: [24.08348, 32.88914],
    activities: ["kayak", "waterbike"],
    image: "/resort.webp",
    status: "coming_soon",
    description:
      "انطلق من حديقة الفريال على كورنيش أسوان في جولة مائية ممتعة، مع مشاهد بانورامية للنيل ومعالم أسوان.",
  },
]
