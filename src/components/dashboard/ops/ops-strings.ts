import type { DemandBand, HeatLevel } from './heat'

export const opsStrings = {
  home: 'الرئيسية',
  calendar: 'التقويم',
  bookings: 'الحجوزات',
  notifications: 'التنبيهات',
  more: 'المزيد',
  todayLoad: 'حمل اليوم',
  nextSlot: 'الساعة التالية',
  upcoming: 'قادمون',
  unread: 'تنبيهات غير مقروءة',
  walkIn: 'حجز حضوري',
  arrived: 'وصل',
  inProgress: 'جارية',
  completed: 'منتهية',
  noShow: 'لم يحضر',
  unitsDispatched: 'وحدات أُرسلت اليوم',
  peakConcurrency: 'أقصى تزامن في الساعة',
  kayaksUsed: 'كاياك مستخدم',
  noBookings: 'لا حجوزات في هذه الساعة',
  invalidTime: 'وقت غير صالح — تم فتح عرض اليوم',
  reports: 'التقارير',
  customers: 'العملاء',
  equipment: 'المعدات',
  activities: 'الأنشطة',
  call: 'اتصال',
  whatsapp: 'واتساب',
  markAllRead: 'تعيين الكل كمقروء',
  pendingConfirmation: 'حجوزات بانتظار التأكيد',
  newBooking: 'حجز جديد',
  slotAlmostFull: 'ساعة شبه ممتلئة',
  equipmentMaintenance: 'معدات في الصيانة',
  total: 'الإجمالي',
  inUse: 'قيد الاستخدام',
  available: 'متاح',
  maintenance: 'صيانة',
  turnaround: 'وقت التجهيز (دقائق)',
  activityMinutes: 'مدة النشاط (دقائق)',
  sourceWalkIn: 'حضوري',
  sourceOnline: 'إلكتروني',
  local: 'مصري',
  foreign: 'أجنبي',
  mixed: 'مختلط',
  unknownNationality: '—',
}

export const heatLabels: Record<HeatLevel, string> = {
  grey: 'فارغ',
  green: 'هادئ',
  yellow: 'متوسط',
  orange: 'مزدحم',
  red: 'ضغط',
}

export const bandLabels: Record<DemandBand, string> = {
  available: 'متاح',
  moderate: 'متوسط',
  high: 'ضغط عالي',
  full: 'مكتمل — لا مزيد من الحجوزات',
}

export type NationalityKind = 'local' | 'foreign' | 'mixed' | 'unknown'

export function bookingNationality(booking: {
  local_guests?: number
  foreigner_guests?: number
}): NationalityKind {
  const local = booking.local_guests ?? 0
  const foreign = booking.foreigner_guests ?? 0
  if (local > 0 && foreign > 0) return 'mixed'
  if (foreign > 0) return 'foreign'
  if (local > 0) return 'local'
  return 'unknown'
}

export const nationalityLabels: Record<NationalityKind, string> = {
  local: opsStrings.local,
  foreign: opsStrings.foreign,
  mixed: opsStrings.mixed,
  unknown: opsStrings.unknownNationality,
}
