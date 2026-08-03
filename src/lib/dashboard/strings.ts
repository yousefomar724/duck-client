/** Arabic-only copy for admin/supplier dashboards (see RtlPanel). */
export const dashboardStrings = {
  backToHome: "العودة إلى الصفحة الرئيسية",
  close: "إغلاق",
} as const

export const supplierProfileStrings = {
  title: "الملف الشخصي للمزود",
  loading: "جاري التحميل...",
  businessProfileTitle: "الملف التجاري",
  businessProfileHint: "حدّث اسمك ونبذةك وصورة الملف",
  businessName: "اسم النشاط",
  nameAr: "الاسم بالعربية",
  nameEn: "الاسم بالإنجليزية",
  about: "نبذة",
  aboutAr: "وصف بالعربية",
  aboutEn: "وصف بالإنجليزية",
  iconOptional: "صورة الملف (اختياري)",
  iconPreviewAlt: "معاينة صورة المزود",
  iconUploadHint: "قم برفع شعار صغير لتحسين مظهر الملف.",
  iconUploadError: "فشل رفع الصورة",
  iconUploadSuccess: "تم تحديث صورة الملف",
  saveProfile: "حفظ الملف",
  saving: "جاري الحفظ...",
  profileSaved: "تم تحديث الملف بنجاح",
  storageTitle: "سعة المعدات",
  storageHint: "حدّث الحد الأقصى لكل نوع معدات للحجز يومياً",
  storageAtLeastOneError: "أدخل سعة واحدة على الأقل لنوع المعدات",
  storageSaved: "تم تحديث سعة المعدات",
  saveStorage: "حفظ السعة",
} as const

/** Dashboard panels always read localized content in Arabic. */
export const DASHBOARD_LANG = "ar" as const
