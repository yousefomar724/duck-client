import nodemailer from 'nodemailer';
import { formatCurrency } from '@/lib/constants';
import { SITE_TIME_ZONE } from '@/lib/time';

interface BookingEmailData {
  id: string;
  full_name: string;
  phone_number: string;
  booking_date: Date;
  updated_at: Date;
  quantity: number;
  adults?: number;
  kids_1_6?: number;
  kids_7_12?: number;
  wants_guide: boolean;
  played_before?: boolean | null;
  hear_about_us?: string;
  amount: number;
  currency: string;
  declared_amount?: number;
  status: string;
  user_email?: string;
  destination_names: string[];
  trip_name_en: string;
  trip_name_ar: string;
  is_tour?: boolean;
}

const SUPPLIER_BOOKINGS_URL = 'https://duckegy.com/supplier/bookings';

function formatBookingStatusAr(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'قيد الانتظار',
    CONFIRMED: 'مؤكد',
    CANCELLED: 'ملغى',
    REFUNDED: 'مسترد',
    REFUND_PENDING: 'في انتظار الاسترداد',
    REFUND_FAILED: 'فشل الاسترداد',
  };
  return map[status] ?? status;
}

function formatBookingDateAr(date: Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    numberingSystem: 'latn',
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatBookingTimeAr(date: Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    numberingSystem: 'latn',
    timeZone: SITE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function formatDateTimeAr(date: Date): string {
  return `${formatBookingDateAr(date)} ${formatBookingTimeAr(date)}`;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  const email = process.env.SMTP_EMAIL;
  const password = process.env.SMTP_PASSWORD;
  if (!email || !password) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: email, pass: password },
    });
  }
  return transporter;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.warn(`SMTP not configured — skipping email "${subject}" to ${to}`);
    return;
  }
  try {
    await t.sendMail({ from: process.env.SMTP_EMAIL, to, subject, html });
  } catch (err) {
    // Fire-and-forget, matching the Go API: mail failures never surface to the caller.
    console.warn('Failed to send email', subject, err);
  }
}

export async function sendResetPasswordEmail(to: string, token: string): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const resetLink = `${siteUrl}/reset-password?token=${token}`;
  const body = `
    <html><body>
      <h3>Reset Password</h3>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
    </body></html>
  `;
  await send(to, 'Reset Your Password', body);
}

function formatBookingEmailBody(
  booking: BookingEmailData,
  title: string,
  headerIcon: string,
  introText: string,
  options?: { showConfirmLink?: boolean },
): string {
  const email = booking.user_email || 'غير متوفر';
  const destination = booking.destination_names[0]?.trim() || '';
  const destinationRow = destination
    ? `<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold;">الوجهة</td><td style="padding: 15px 0; color: #333333;">${destination}</td></tr>`
    : '';
  const tripLabel = booking.is_tour ? 'الجولة' : 'الرحلة';
  const tripName =
    booking.trip_name_ar || booking.trip_name_en || 'غير محدد';
  const requirements = booking.wants_guide ? 'يريد مرشداً' : 'لا يوجد';
  const hearAboutUs = booking.hear_about_us?.trim() || 'غير محدد';
  const playedBefore =
    booking.played_before == null
      ? 'غير محدد'
      : booking.played_before
        ? 'نعم'
        : 'لا';
  const guestsLabel =
    booking.quantity === 1 ? 'ضيف واحد' : `${booking.quantity} ضيوف`;
  const kids = (booking.kids_1_6 ?? 0) + (booking.kids_7_12 ?? 0);
  const kidsRow =
    kids > 0
      ? `<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold;">تفصيل الأعمار</td><td style="padding: 15px 0; color: #333333;">${booking.adults ?? Math.max(0, booking.quantity - kids)} بالغ · ${booking.kids_1_6 ?? 0} أطفال (1–6) · ${booking.kids_7_12 ?? 0} أطفال (7–12)</td></tr>`
      : '';
  const confirmLinkBlock =
    options?.showConfirmLink !== false
      ? `
            <div style="margin-top: 24px; text-align: center;">
              <a href="${SUPPLIER_BOOKINGS_URL}" style="display: inline-block; background-color: #f5c518; color: #1a2b4c; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
                تأكيد الحجز من لوحة المورد
              </a>
              <p style="margin-top: 10px; font-size: 12px; color: #777;">
                <a href="${SUPPLIER_BOOKINGS_URL}" style="color: #4a90e2;">${SUPPLIER_BOOKINGS_URL}</a>
              </p>
            </div>`
      : '';

  return `
    <html dir="rtl" lang="ar">
      <body style="background-color: #f4f4f4; padding: 20px; font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <div style="border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px; margin: 0 auto; background-color: #ffffff; overflow: hidden;">
          <div style="background-color: #1a2b4c; color: #ffffff; padding: 20px; font-size: 20px; font-weight: bold; text-align: right;">
            ${headerIcon} ${title}
          </div>
          <div style="padding: 20px;">
            <p style="color: #555555; font-size: 14px; margin-bottom: 20px; line-height: 1.6;">${introText}</p>
            <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold; width: 35%;">الاسم</td><td style="padding: 15px 0; color: #333333;">${booking.full_name}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold;">البريد الإلكتروني</td><td style="padding: 15px 0; color: #4a90e2;" dir="ltr">${email}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold;">الهاتف</td><td style="padding: 15px 0; color: #333333;" dir="ltr">${booking.phone_number}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold;">${tripLabel}</td><td style="padding: 15px 0; color: #333333;">${tripName}</td></tr>
              ${destinationRow}
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold;">تاريخ الحجز</td><td style="padding: 15px 0; color: #333333;">${formatBookingDateAr(booking.booking_date)}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold;">وقت الحجز</td><td style="padding: 15px 0; color: #333333;">${formatBookingTimeAr(booking.booking_date)}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold;">تاريخ الإنشاء</td><td style="padding: 15px 0; color: #333333;">${formatDateTimeAr(booking.updated_at)}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold;">عدد الضيوف</td><td style="padding: 15px 0; color: #333333;">${guestsLabel}</td></tr>
              ${kidsRow}
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold;">المتطلبات</td><td style="padding: 15px 0; color: #333333;">${requirements}</td></tr>
              <tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 15px 0; color: #555555; font-weight: bold;">سبق التجربة</td><td style="padding: 15px 0; color: #333333;">${playedBefore}</td></tr>
              <tr><td style="padding: 15px 0; color: #555555; font-weight: bold;">كيف سمع عنا</td><td style="padding: 15px 0; color: #333333;">${hearAboutUs}</td></tr>
            </table>
            <div style="margin-top: 20px; font-size: 14px; color: #777; border-top: 1px solid #f0f0f0; padding-top: 15px; line-height: 1.8;">
              <strong>رقم الحجز:</strong> <span dir="ltr">${booking.id}</span><br>
              <strong>المبلغ الإجمالي:</strong> ${formatCurrency(booking.amount, booking.currency, 'ar')}<br>
              ${
                booking.declared_amount && booking.declared_amount > 0 && booking.declared_amount < booking.amount
                  ? `<strong>المبلغ المعلن من العميل:</strong> ${formatCurrency(booking.declared_amount, booking.currency, 'ar')}<br>
              <strong>المتبقي المتوقع:</strong> ${formatCurrency(booking.amount - booking.declared_amount, booking.currency, 'ar')}<br>`
                  : ''
              }
              <strong>الحالة:</strong> ${formatBookingStatusAr(booking.status)}
            </div>
            ${confirmLinkBlock}
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendSupplierBookingEmail(to: string, booking: BookingEmailData): Promise<void> {
  const body = formatBookingEmailBody(
    booking,
    'تم تأكيد حجز جديد',
    '✅',
    'تم تأكيد حجز رحلة/جولة وتحديث رصيدك.',
    { showConfirmLink: false },
  );
  await send(to, 'تم تأكيد دفع حجز جديد', body);
}

export async function sendSupplierNewManualBookingEmail(to: string, booking: BookingEmailData): Promise<void> {
  const body = formatBookingEmailBody(
    booking,
    'طلب حجز جديد',
    '✈️',
    'تم استلام طلب حجز يدوي/خارجي جديد. الحالة حالياً قيد الانتظار. يرجى التنسيق مع العميل لاستلام الدفع ثم تأكيد الحجز من لوحة المورد.',
    { showConfirmLink: true },
  );
  await send(to, 'طلب حجز يدوي جديد', body);
}
