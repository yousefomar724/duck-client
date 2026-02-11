import type { User, Supplier, Trip, Booking, Destination, Payout } from "./types"

export const mockUsers: User[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@duck.com",
    role: 2,
    first_name: "أحمد",
    last_name: "محمد",
    phone_number: "+20 123 456 7890",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    username: "supplier1",
    email: "supplier1@example.com",
    role: 1,
    first_name: "محمود",
    last_name: "علي",
    phone_number: "+20 123 456 7891",
    supplier_id: 1,
    created_at: "2024-02-01T10:00:00Z",
  },
  {
    id: 3,
    username: "supplier2",
    email: "supplier2@example.com",
    role: 1,
    first_name: "خالد",
    last_name: "حسن",
    phone_number: "+20 123 456 7892",
    supplier_id: 2,
    created_at: "2024-02-10T10:00:00Z",
  },
]

export const mockSuppliers: Supplier[] = [
  {
    id: 1,
    user_id: 2,
    name: { ar: "دوك إنترتينمنت", en: "Duck Entertainment" },
    about: {
      ar: "نقدم أفضل تجارب الرياضات المائية في أسوان على نهر النيل",
      en: "We provide the best water sports experiences in Aswan on the Nile",
    },
    icon: "/logo-transparent.png",
    rate: 5,
  },
  {
    id: 2,
    user_id: 3,
    name: { ar: "مغامرات النيل", en: "Nile Adventures" },
    about: {
      ar: "رحلات مائية مثيرة وآمنة للعائلات والأفراد",
      en: "Exciting and safe water trips for families and individuals",
    },
    icon: "/logo-transparent.png",
    rate: 4,
  },
]

export const mockTrips: Trip[] = [
  {
    id: 1,
    supplier_id: 1,
    price: 180,
    currency: "EGP",
    rate: 5,
    destination: true,
    location: true,
    from: "2024-03-01",
    to: "2024-12-31",
    itinerary: [
      { ar: "الاجتماع في نقطة البداية", en: "Meet at starting point" },
      { ar: "جولة بالكاياك لمدة ساعتين", en: "2-hour kayaking tour" },
      { ar: "استراحة وتصوير", en: "Break and photography" },
    ],
    name: { ar: "جولة الكاياك على النيل", en: "Nile Kayaking Tour" },
    description: {
      ar: "استمتع بجولة كاياك رائعة على نهر النيل في أسوان مع مناظر خلابة",
      en: "Enjoy an amazing kayak tour on the Nile River in Aswan with stunning views",
    },
    availability: [
      { date: "2024-03-15", slots: 10 },
      { date: "2024-03-16", slots: 8 },
    ],
    max_guests: 10,
    images: ["/hero.mp4", "/resort.webp"],
    cancelation_policy: {
      ar: "يمكن الإلغاء قبل 24 ساعة من موعد الرحلة",
      en: "Can be cancelled 24 hours before the trip",
    },
    refundable: true,
    created_at: "2024-02-15T10:00:00Z",
  },
  {
    id: 2,
    supplier_id: 1,
    price: 150,
    currency: "EGP",
    rate: 5,
    destination: true,
    location: true,
    from: "2024-03-01",
    to: "2024-12-31",
    itinerary: [
      { ar: "جلسة ستاند اب بادل", en: "Stand-up paddle session" },
      { ar: "تعليم الأساسيات", en: "Basic training" },
    ],
    name: { ar: "ستاند اب بادل على النيل", en: "Nile Stand-Up Paddle" },
    description: {
      ar: "تجربة ستاند اب بادل مميزة على مياه النيل الهادئة",
      en: "Unique stand-up paddle experience on the calm Nile waters",
    },
    availability: [
      { date: "2024-03-15", slots: 15 },
      { date: "2024-03-16", slots: 12 },
    ],
    max_guests: 15,
    images: ["/offer.webp", "/discover-card.webp"],
    cancelation_policy: {
      ar: "يمكن الإلغاء قبل 24 ساعة من موعد الرحلة",
      en: "Can be cancelled 24 hours before the trip",
    },
    refundable: true,
    created_at: "2024-02-20T10:00:00Z",
  },
  {
    id: 3,
    supplier_id: 1,
    price: 120,
    currency: "EGP",
    rate: 4,
    destination: true,
    location: true,
    from: "2024-03-01",
    to: "2024-12-31",
    itinerary: [
      { ar: "جولة بالدراجة المائية", en: "Water bike tour" },
      { ar: "استكشاف النيل", en: "Explore the Nile" },
    ],
    name: { ar: "دراجة مائية على النيل", en: "Nile Water Bike" },
    description: {
      ar: "جولة ممتعة بالدراجة المائية مناسبة للعائلات",
      en: "Fun water bike tour suitable for families",
    },
    availability: [
      { date: "2024-03-15", slots: 20 },
      { date: "2024-03-16", slots: 18 },
    ],
    max_guests: 20,
    images: ["/resort.webp"],
    cancelation_policy: {
      ar: "يمكن الإلغاء قبل 12 ساعة من موعد الرحلة",
      en: "Can be cancelled 12 hours before the trip",
    },
    refundable: false,
    created_at: "2024-02-25T10:00:00Z",
  },
]

export const mockBookings: Booking[] = [
  {
    id: 1,
    session_id: "sess_123abc",
    user_id: 1,
    trip_id: 1,
    supplier_id: 1,
    amount: 180,
    currency: "EGP",
    full_name: "عمر أحمد",
    phone_number: "+20 100 123 4567",
    status: "CONFIRMED",
    created_at: "2024-03-10T14:30:00Z",
  },
  {
    id: 2,
    session_id: "sess_456def",
    user_id: 2,
    trip_id: 2,
    supplier_id: 1,
    amount: 150,
    currency: "EGP",
    full_name: "سارة محمد",
    phone_number: "+20 101 234 5678",
    status: "PENDING",
    created_at: "2024-03-11T10:15:00Z",
  },
  {
    id: 3,
    session_id: "sess_789ghi",
    user_id: 3,
    trip_id: 1,
    supplier_id: 1,
    amount: 360,
    currency: "EGP",
    full_name: "محمد علي",
    phone_number: "+20 102 345 6789",
    status: "SUCCESS",
    created_at: "2024-03-05T16:45:00Z",
  },
  {
    id: 4,
    session_id: "sess_101jkl",
    user_id: 1,
    trip_id: 3,
    supplier_id: 1,
    amount: 120,
    currency: "EGP",
    full_name: "فاطمة حسن",
    phone_number: "+20 103 456 7890",
    status: "CANCELLED",
    created_at: "2024-03-08T11:20:00Z",
  },
]

export const mockDestinations: Destination[] = [
  {
    id: 1,
    name: { ar: "جزيرة الفنتين", en: "Elephantine Island" },
    description: {
      ar: "جزيرة تاريخية على نهر النيل مع مناظر خلابة",
      en: "Historic island on the Nile with stunning views",
    },
    image: "/resort.webp",
    status: "active",
    trip_count: 12,
  },
  {
    id: 2,
    name: { ar: "كورنيش أسوان", en: "Aswan Corniche" },
    description: {
      ar: "كورنيش النيل في قلب أسوان",
      en: "Nile Corniche in the heart of Aswan",
    },
    image: "/offer.webp",
    status: "active",
    trip_count: 8,
  },
  {
    id: 3,
    name: { ar: "جزيرة النباتات", en: "Botanical Island" },
    description: {
      ar: "جزيرة جميلة مليئة بالنباتات النادرة",
      en: "Beautiful island full of rare plants",
    },
    image: "/discover-card.webp",
    status: "active",
    trip_count: 5,
  },
  {
    id: 4,
    name: { ar: "شاطئ النيل", en: "Nile Beach" },
    description: {
      ar: "شاطئ هادئ مثالي للعائلات والواتر بايك",
      en: "Peaceful beach ideal for families and water biking",
    },
    image: "/resort.webp",
    status: "active",
    trip_count: 6,
  },
]

export const mockTestimonials = [
  {
    id: 1,
    name: "Sarah Mitchell",
    location: "London, UK",
    quote:
      "Absolutely magical experience! The sunset kayak tour around Elephantine Island was the highlight of our Egypt trip. The guides were professional and the equipment was top-notch.",
  },
  {
    id: 2,
    name: "Ahmed Hassan",
    location: "Cairo, Egypt",
    quote:
      "As a local, I've always wanted to experience the Nile differently. Duck Entertainment made it happen! The SUP session was incredibly peaceful and well-organized.",
  },
  {
    id: 3,
    name: "Maria Garcia",
    location: "Barcelona, Spain",
    quote:
      "The water bike experience was so much fun! Perfect for families. My kids loved it and the staff was very patient with beginners. Highly recommend!",
  },
]

export const mockPayouts: Payout[] = [
  {
    id: 1,
    supplier_id: 1,
    amount: 5400,
    currency: "EGP",
    status: "paid",
    date: "2024-03-01T00:00:00Z",
  },
  {
    id: 2,
    supplier_id: 1,
    amount: 3200,
    currency: "EGP",
    status: "pending",
    date: "2024-03-10T00:00:00Z",
  },
  {
    id: 3,
    supplier_id: 2,
    amount: 2800,
    currency: "EGP",
    status: "paid",
    date: "2024-03-05T00:00:00Z",
  },
  {
    id: 4,
    supplier_id: 1,
    amount: 1500,
    currency: "EGP",
    status: "failed",
    date: "2024-02-28T00:00:00Z",
  },
]
