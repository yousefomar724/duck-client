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

/** Meeting point & booking refs for Nagaa El Kabila / Elephantine (client-provided). */
const ASWAN_NAQUA_MAP =
  "https://maps.app.goo.gl/t4GVSBzuXVRoqhRs5"
const ASWAN_BOOKING_FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLSdYj5G1qRP41ItoPceA_NK8E-ztDP1xmqC0yz0s0SQ-gyajCg/viewform"
const ASWAN_INSTAPAY =
  "https://ipn.eg/S/ahmedragab9491/instapay/8XekIs"

export const mockTrips: Trip[] = [
  {
    id: 1,
    supplier_id: 1,
    price: 180,
    foreigner_price: 500,
    guide_mandatory: false,
    guide_price: 0,
    display_order: 0,
    currency: "EGP",
    rate: 5,
    duration: 120,
    is_tour: false,
    destination: true,
    location: true,
    from: "2024-03-01",
    to: "2027-12-31",
    itinerary: [
      { ar: "الالتقاء في معدية النجع القبلي (جزيرة أسوان)", en: "Meet at Nagaa El Kabila ferry (Elephantine)" },
      { ar: "جولة كاياك حرة على النيل", en: "Free-style kayaking on the Nile" },
      { ar: "استراحة وتصوير", en: "Break and photography" },
    ],
    name: { ar: "جولة الكاياك الحرة على النيل", en: "Free-style Nile kayaking" },
    description: {
      ar: `أسعار: ١٨٠ ج للمصريين، ٥٠٠ ج للأجانب. متاح من الفجر للمغرب بالحجز المسبق – جميع أيام الأسبوع. نقطة اللقاء: جزيرة أسوان – معدية النجع القبلي بجوار مكاني كافيه. الخريطة: ${ASWAN_NAQUA_MAP}. للتواصل: ٠١٥٥٠٠٦١٠٠٦ – ٠١١٠٠٢٥٥٠٥٣. تأكيد الحجز: ${ASWAN_BOOKING_FORM}. الدفع عبر إنستا باي: ${ASWAN_INSTAPAY}`,
      en: `EGP 180 for Egyptians, EGP 500 for foreigners. Dawn to sunset by advance booking, seven days a week. Meet at Elephantine Island – Nagaa El Kabila ferry beside Makani Cafe. Map: ${ASWAN_NAQUA_MAP}. Phones: 01550061006 – 01100255053. Booking form: ${ASWAN_BOOKING_FORM}. InstaPay: ${ASWAN_INSTAPAY}`,
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
    destinations: [
      {
        id: 5,
        name: {
          ar: "معدية النجع القبلي – جزيرة أسوان",
          en: "Nagaa El Kabila Ferry – Elephantine Island",
        },
        description: {
          ar: "نقطة اللقاء الرئيسية للكاياك (بجوار مكاني كافيه)",
          en: "Main kayak meeting point (beside Makani Cafe)",
        },
        image: "/resort.webp",
        status: "active",
      },
    ],
  },
  {
    id: 2,
    supplier_id: 1,
    price: 150,
    foreigner_price: 0,
    guide_mandatory: false,
    guide_price: 0,
    display_order: 0,
    currency: "EGP",
    rate: 5,
    duration: 90,
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
    foreigner_price: 0,
    guide_mandatory: false,
    guide_price: 0,
    display_order: 0,
    currency: "EGP",
    rate: 4,
    duration: 60,
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
  {
    id: 4,
    supplier_id: 1,
    price: 275,
    foreigner_price: 850,
    guide_mandatory: false,
    guide_price: 0,
    display_order: 1,
    currency: "EGP",
    rate: 5,
    duration: 0,
    is_tour: true,
    destination: true,
    location: true,
    from: "2024-03-01",
    to: "2027-12-31",
    itinerary: [
      {
        ar: "التق مع الكابتن في معدية النجع القبلي",
        en: "Meet your captain at Nagaa El Kabila ferry",
      },
      {
        ar: "جولة خاصة لأماكن مخفية وسط النيل مع تصوير احترافي",
        en: "Private tour to hidden spots on the Nile with photography",
      },
      {
        ar: "تسليم الصور خلال ٢٤ ساعة بعد الشعار والتعديلات",
        en: "Photos delivered within 24 hours after branding and edits",
      },
    ],
    name: {
      ar: "جولة خاصة مع كابتن (أماكن مخفية + تصوير)",
      en: "Private captain tour (hidden spots + photography)",
    },
    description: {
      ar: `مع كابتن لأماكن مخفية وسط النيل وتصوير؛ تسليم الصور خلال ٢٤ ساعة بعد إضافة الشعار والتعديلات. المصريون: ٢٧٥ ج للفرد (فرد واحد: ٣٠٠ ج). الأجانب: ٨٥٠ ج. مواعيد من الفجر للمغرب بالحجز المسبق. الخريطة: ${ASWAN_NAQUA_MAP}. حجز: ${ASWAN_BOOKING_FORM}. إنستا باي: ${ASWAN_INSTAPAY} – ٠١٥٥٠٠٦١٠٠٦ / ٠١١٠٠٢٥٥٠٥٣`,
      en: `Captain-led route to hidden Nile spots with photography; photos within 24 hours after logo and edits. Egyptians: EGP 275 per person (solo: EGP 300). Foreigners: EGP 850. Dawn–sunset by booking. Map: ${ASWAN_NAQUA_MAP}. Form: ${ASWAN_BOOKING_FORM}. InstaPay: ${ASWAN_INSTAPAY}. Tel: 01550061006 / 01100255053`,
    },
    availability: [],
    max_guests: 8,
    images: ["/resort.webp", "/offer.webp"],
    cancelation_policy: {
      ar: "الإلغاء وفق سياسة المورد؛ تأكيد الحجز عبر النموذج أو الهاتف",
      en: "Cancellation per supplier policy; confirm via form or phone",
    },
    refundable: true,
    created_at: "2025-04-01T10:00:00Z",
    destinations: [
      {
        id: 5,
        name: {
          ar: "معدية النجع القبلي – جزيرة أسوان",
          en: "Nagaa El Kabila Ferry – Elephantine Island",
        },
        description: {
          ar: "نقطة اللقاء الرئيسية للكاياك (بجوار مكاني كافيه)",
          en: "Main kayak meeting point (beside Makani Cafe)",
        },
        image: "/resort.webp",
        status: "active",
      },
    ],
  },
]

export const mockBookings: Booking[] = [
  {
    ID: 1,
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
    ID: 2,
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
    ID: 3,
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
    ID: 4,
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
  {
    id: 5,
    name: {
      ar: "معدية النجع القبلي – جزيرة أسوان",
      en: "Nagaa El Kabila Ferry – Elephantine Island, Aswan",
    },
    description: {
      ar: `نقطة اللقاء للكاياك والجولات الخاصة بجوار مكاني كافيه على جزيرة أسوان. الخريطة: ${ASWAN_NAQUA_MAP}. تأكيد الحجز عبر النموذج: ${ASWAN_BOOKING_FORM}. الدفع إنستا باي: ${ASWAN_INSTAPAY}. للتواصل: ٠١٥٥٠٠٦١٠٠٦ – ٠١١٠٠٢٥٥٠٥٣`,
      en: `Kayak and private-tour meeting point beside Makani Cafe on Elephantine Island. Map: ${ASWAN_NAQUA_MAP}. Booking: ${ASWAN_BOOKING_FORM}. InstaPay: ${ASWAN_INSTAPAY}. Phone: 01550061006 – 01100255053`,
    },
    image: "/resort.webp",
    images: ["/resort.webp", "/offer.webp"],
    status: "active",
    lat: 24.0867,
    lng: 32.8895,
    activities: ["kayak"],
    public_status: "open",
    operating_hours:
      "متاح من الفجر للمغرب بالحجز المسبق – جميع أيام الأسبوع",
    trip_count: 2,
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
    ID: 1,
    supplier_id: 1,
    amount: 5400,
    currency: "EGP",
    status: "paid",
    date: "2024-03-01T00:00:00Z",
  },
  {
    ID: 2,
    supplier_id: 1,
    amount: 3200,
    currency: "EGP",
    status: "pending",
    date: "2024-03-10T00:00:00Z",
  },
  {
    ID: 3,
    supplier_id: 2,
    amount: 2800,
    currency: "EGP",
    status: "paid",
    date: "2024-03-05T00:00:00Z",
  },
  {
    ID: 4,
    supplier_id: 1,
    amount: 1500,
    currency: "EGP",
    status: "failed",
    date: "2024-02-28T00:00:00Z",
  },
]
