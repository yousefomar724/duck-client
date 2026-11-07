import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { OfficialTripItem, BookingItem } from '../../types/erp';
import {
  Calendar,
  Compass,
  MapPin,
  Plus,
  Search,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  ShieldAlert,
  Percent,
  X,
  Phone,
  Tag,
  CreditCard,
  Building2,
  Sparkles,
} from 'lucide-react';

export const BookingsView: React.FC = () => {
  const {
    officialTrips,
    activityTypes,
    bookings,
    createBooking,
    updateBooking,
    convertBookingToInvoice,
    setActiveModule,
    formatMoney,
    lang,
    theme,
  } = useErp();

  const isLight = theme === 'light';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string>('Elephantine Island — Aswan');
  const [selectedActivity, setSelectedActivity] = useState<string>('Kayak');
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('09:00 AM');
  const [egyptianPax, setEgyptianPax] = useState<number>(2);
  const [foreignerPax, setForeignerPax] = useState<number>(0);
  const [customForeignerPrice, setCustomForeignerPrice] = useState<number | ''>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [depositPaid, setDepositPaid] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConvertingId, setIsConvertingId] = useState<string | null>(null);

  // Available trips for selected destination and activity
  const availableTrips = officialTrips.filter(
    (t) =>
      t.destination === selectedDestination &&
      (t.activityType === selectedActivity || selectedActivity === 'all') &&
      t.operationalStatus !== 'Inactive'
  );

  const selectedTrip = officialTrips.find((t) => t.id === selectedTripId) || availableTrips[0];

  // Price calculations
  const egpPrice = selectedTrip?.egyptianPrice || 0;
  const rawForPrice = selectedTrip?.foreignerPrice;
  const isForPricePending = selectedTrip?.isForeignerPricePending || rawForPrice === null;
  const effectiveForPrice = isForPricePending ? (customForeignerPrice !== '' ? Number(customForeignerPrice) : 0) : (rawForPrice || 0);

  const subtotal = egyptianPax * egpPrice + foreignerPax * effectiveForPrice;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const balanceDue = Math.max(0, totalAmount - depositPaid);

  const openNewBooking = () => {
    setSelectedDestination('Elephantine Island — Aswan');
    setSelectedActivity('Kayak');
    const defaultTrip = officialTrips.find((t) => t.destination === 'Elephantine Island — Aswan');
    setSelectedTripId(defaultTrip ? defaultTrip.id : (officialTrips[0]?.id || ''));
    setCustomerName('');
    setCustomerPhone('');
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingTime('09:00 AM');
    setEgyptianPax(2);
    setForeignerPax(0);
    setCustomForeignerPrice('');
    setDiscountAmount(0);
    setDiscountReason('');
    setDepositPaid(0);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) {
      alert(lang === 'ar' ? 'يرجى اختيار رحلة معتمدة من الكتالوج' : 'Please select an official trip');
      return;
    }

    if (foreignerPax > 0 && isForPricePending && (!customForeignerPrice || Number(customForeignerPrice) <= 0)) {
      alert(
        lang === 'ar'
          ? 'سعر الأجانب لهذه الرحلة قيد التدقيق، يجب إدخال واعتماد السعر يدوياً قبل تأكيد الحجز.'
          : 'Foreigner price is pending verification. Authorized employee must specify an approved rate.'
      );
      return;
    }

    try {
      await createBooking({
        tripId: selectedTrip.id,
        bookingDate,
        bookingTime,
        customerName,
        customerPhone,
        egyptianPax,
        foreignerPax,
        foreignerUnitPrice: effectiveForPrice,
        discountAmount,
        discountReason,
        depositPaid,
        notes,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Booking error: ${err?.message}`);
    }
  };

  const handleConvertToInvoice = async (booking: BookingItem) => {
    if (booking.status === 'Invoiced' && booking.invoiceNumber) {
      setActiveModule('invoices');
      return;
    }

    if (!window.confirm(
      lang === 'ar'
        ? `هل تريد تحويل الحجز ${booking.bookingNumber} إلى فاتورة مبيعات معتمدة وترحيل القيد المحاسبي؟`
        : `Convert booking ${booking.bookingNumber} to official sales invoice and post journal entry?`
    )) {
      return;
    }

    try {
      setIsConvertingId(booking.id);
      const inv = await convertBookingToInvoice(booking.id);
      alert(lang === 'ar' ? `تم إصدار الفاتورة بنجاح: ${inv.invoiceNumber}` : `Invoice created: ${inv.invoiceNumber}`);
    } catch (err: any) {
      alert(`Conversion error: ${err?.message}`);
    } finally {
      setIsConvertingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchSearch =
      b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tripName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-[#147d9f]/20 text-[#147d9f] border border-[#147d9f]/30">
              Operations & Front-Desk Engine
            </span>
            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'مرتبط بكتالوج الرحلات الرسمي' : 'Tied to Official Catalog'}
            </span>
          </div>
          <h1 className={`text-xl font-extrabold tracking-wide flex items-center gap-2.5 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Calendar className="w-6 h-6 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'شاشة الحجوزات والعمليات النيلية' : 'Bookings & Daily Operations'}</span>
          </h1>
          <p className={`text-xs max-w-3xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {lang === 'ar'
              ? 'إنشاء ومتابعة حجوزات الأنشطة المائية، حساب تسعير الجنسيات تلقائياً (مصريين وأجانب والمجموعات المشتركة)، وتحويل الحجز بضغطة زر إلى فاتورة مبيعات معتمدة.'
              : 'Register customer bookings, calculate nationality breakdown pricing, track deposits, and convert to posted sales invoices with 1 click.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveModule('trips_catalog')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded border transition-colors ${
              isLight ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'عرض كتالوج الرحلات' : 'Catalog Master'}</span>
          </button>

          {/* Bookings are created in Duck admin and synced here, so there is no "New Trip Booking" action. */}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs border transition-colors ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-2">
          {['all', 'Confirmed', 'Invoiced', 'Completed', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                statusFilter === st
                  ? 'bg-[#147d9f] text-white font-bold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'all'
                ? lang === 'ar'
                  ? 'كافة الحجوزات'
                  : 'All Bookings'
                : st === 'Invoiced'
                ? lang === 'ar'
                  ? 'تم إصدار فاتورة'
                  : 'Invoiced'
                : st === 'Confirmed'
                ? lang === 'ar'
                  ? 'مؤكد'
                  : 'Confirmed'
                : st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث برقم الحجز أو العميل...' : 'Search booking or guest...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-1 text-xs rounded border focus:outline-none focus:border-[#147d9f] ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
            }`}
          />
        </div>
      </div>

      {/* Bookings List Table */}
      <div
        className={`border rounded-lg overflow-hidden transition-colors ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`uppercase font-semibold border-b ${
                isLight ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-[#0c142b] text-slate-400 border-slate-800/80'
              }`}
            >
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'رقم الحجز والتاريخ' : 'Booking # & Date'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'الرحلة والوجهة' : 'Trip & Destination'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'تصنيف الجنسيات' : 'Nationality Group'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'الإجمالي والمدفوع' : 'Total & Paid'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الحالة المحاسبية' : 'Status'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'التحويل لفاتورة' : 'Invoice Action'}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/40 text-slate-200'}`}>
              {filteredBookings.map((bkg) => {
                const isInvoiced = bkg.status === 'Invoiced';
                return (
                  <tr key={bkg.id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-[#147d9f]">{bkg.bookingNumber}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{bkg.bookingDate} · {bkg.bookingTime}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold">{bkg.customerName}</div>
                      {bkg.customerPhone && (
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{bkg.customerPhone}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold">{bkg.tripName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#147d9f]" />
                        <span>{bkg.destination}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        bkg.nationalityCategory === 'Mixed Group'
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                          : bkg.nationalityCategory === 'Foreigner'
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {bkg.nationalityCategory}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        {bkg.egyptianPax > 0 && <span>{bkg.egyptianPax} Egp</span>}
                        {bkg.egyptianPax > 0 && bkg.foreignerPax > 0 && <span> + </span>}
                        {bkg.foreignerPax > 0 && <span>{bkg.foreignerPax} For</span>}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono">
                      <div className="font-bold text-white">{formatMoney(bkg.totalAmount)}</div>
                      <div className="text-[10px] text-slate-400">
                        {lang === 'ar' ? `المسدد: ${bkg.depositPaid}` : `Paid: ${bkg.depositPaid}`}
                        {bkg.balanceDue > 0 && (
                          <span className="text-amber-400 ml-1">({lang === 'ar' ? `متبقي: ${bkg.balanceDue}` : `Due: ${bkg.balanceDue}`})</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        isInvoiced
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {isInvoiced ? (lang === 'ar' ? 'مفوتر بالدفاتر' : 'Invoiced') : (lang === 'ar' ? 'حجز مؤكد' : 'Confirmed')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isInvoiced ? (
                        <button
                          onClick={() => setActiveModule('invoices')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded bg-blue-950/60 text-blue-300 border border-blue-800 hover:bg-blue-900 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{bkg.invoiceNumber}</span>
                        </button>
                      ) : bkg.duckSynced ? (
                        <span
                          className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded border border-slate-700 text-slate-400"
                          title={lang === 'ar' ? 'متزامن من Duck، للقراءة فقط' : 'Synced from Duck, read-only'}
                        >
                          {lang === 'ar' ? 'متزامن من Duck' : 'Synced from Duck'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConvertToInvoice(bkg)}
                          disabled={isConvertingId === bkg.id}
                          className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded bg-[#147d9f] hover:bg-sky-600 text-white shadow-xs transition-colors disabled:opacity-50"
                        >
                          {isConvertingId === bkg.id ? (
                            <span>{lang === 'ar' ? 'جاري الإصدار...' : 'Creating...'}</span>
                          ) : (
                            <>
                              <FileText className="w-3 h-3" />
                              <span>{lang === 'ar' ? 'إصدار فاتورة' : 'Create Invoice'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE BOOKING MODAL (WORKFLOW: DESTINATION -> ACTIVITY -> TRIP -> NATIONALITY BREAKDOWN) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`border w-full max-w-2xl rounded-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#147d9f]" />
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {lang === 'ar' ? 'تسجيل حجز نشاط مائي جديد (New Water Activity Booking)' : 'New Water Activity Booking'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
              {/* STEP 1 & 2: DESTINATION & ACTIVITY SELECTORS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الوجهة / المحطة' : 'Destination'}</label>
                  <select
                    value={selectedDestination}
                    onChange={(e) => {
                      setSelectedDestination(e.target.value);
                      const matching = officialTrips.find((t) => t.destination === e.target.value);
                      if (matching) setSelectedTripId(matching.id);
                    }}
                    className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="Elephantine Island — Aswan">Elephantine Island — Aswan</option>
                    <option value="Gharb Soheil Village — Aswan">Gharb Soheil Village — Aswan</option>
                    <option value="Marsa Matrouh">Marsa Matrouh</option>
                    <option value="Giza">Giza</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'نوع النشاط' : 'Activity Type'}</label>
                  <select
                    value={selectedActivity}
                    onChange={(e) => setSelectedActivity(e.target.value)}
                    className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  >
                    {activityTypes.map((act) => (
                      <option key={act.id} value={act.name}>
                        {act.name} {act.nameAr ? `(${act.nameAr})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* STEP 3: OFFICIAL TRIP SELECTION */}
              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الرحلة الرسمية المعتمدة' : 'Official Trip Selection'}</label>
                <select
                  required
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className={`w-full rounded p-2 font-semibold border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                >
                  {availableTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.name} — {trip.nameAr} [Egp: {trip.egyptianPrice} EGP | For: {trip.foreignerPrice ? `${trip.foreignerPrice} EGP` : 'Pending'}]
                    </option>
                  ))}
                </select>
              </div>

              {/* STEP 4: CUSTOMER & DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم العميل / مسؤول الحجز' : 'Guest / Contact Name'}</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Omar Hassan"
                    className={`w-full rounded p-2 font-semibold border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. +20 100 123 4567"
                    className={`w-full rounded p-2 font-mono border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'تاريخ الحجز' : 'Booking Date'}</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'وقت الانطلاق' : 'Time'}</label>
                  <input
                    type="text"
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    placeholder="e.g. 09:00 AM or 04:30 PM"
                    className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              {/* STEP 5: NATIONALITY BREAKDOWN PRICING (EGYPTIAN & FOREIGNER) */}
              <div className="p-3.5 rounded-lg border bg-sky-950/20 border-sky-800/40 space-y-3">
                <div className="font-bold text-sky-400 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'توزيع الضيوف والتسعير حسب الجنسية' : 'Nationality-Based Guest Breakdown'}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {lang === 'ar' ? `إجمالي الركاب: ${egyptianPax + foreignerPax} فرد` : `Total Pax: ${egyptianPax + foreignerPax}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Egyptian Pax */}
                  <div className={`p-2.5 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-emerald-400">{lang === 'ar' ? 'ضيوف مصريين (Egyptian)' : 'Egyptian Guests'}</span>
                      <span className="font-mono font-bold text-xs">{egpPrice} EGP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-400">{lang === 'ar' ? 'العدد:' : 'Count:'}</label>
                      <input
                        type="number"
                        min={0}
                        value={egyptianPax}
                        onChange={(e) => setEgyptianPax(Math.max(0, Number(e.target.value)))}
                        className={`w-20 rounded p-1 font-mono font-bold text-center border focus:outline-none focus:border-[#147d9f] ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-100'
                        }`}
                      />
                      <span className="text-slate-400 font-mono text-[11px] ml-auto">
                        = {(egyptianPax * egpPrice).toLocaleString()} EGP
                      </span>
                    </div>
                  </div>

                  {/* Foreigner Pax */}
                  <div className={`p-2.5 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sky-400">{lang === 'ar' ? 'ضيوف أجانب (Foreigner)' : 'Foreigner Guests'}</span>
                      <span className="font-mono font-bold text-xs">
                        {isForPricePending ? (
                          <span className="text-amber-400 text-[11px]">{lang === 'ar' ? 'قيد التدقيق' : 'Pending Verification'}</span>
                        ) : (
                          `${rawForPrice} EGP`
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-400">{lang === 'ar' ? 'العدد:' : 'Count:'}</label>
                      <input
                        type="number"
                        min={0}
                        value={foreignerPax}
                        onChange={(e) => setForeignerPax(Math.max(0, Number(e.target.value)))}
                        className={`w-20 rounded p-1 font-mono font-bold text-center border focus:outline-none focus:border-[#147d9f] ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-100'
                        }`}
                      />
                      <span className="text-slate-400 font-mono text-[11px] ml-auto">
                        = {(foreignerPax * effectiveForPrice).toLocaleString()} EGP
                      </span>
                    </div>

                    {/* Warning & manual rate override if foreigner price pending */}
                    {foreignerPax > 0 && isForPricePending && (
                      <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
                        <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{lang === 'ar' ? 'سعر الأجانب غير محدد بالكتالوج! ادخل السعر المعتمد:' : 'Foreigner price is pending. Enter approved price:'}</span>
                        </div>
                        <input
                          type="number"
                          required
                          min={1}
                          placeholder="e.g. 850 EGP"
                          value={customForeignerPrice}
                          onChange={(e) => setCustomForeignerPrice(e.target.value ? Number(e.target.value) : '')}
                          className="w-full rounded p-1 text-xs font-mono font-bold bg-amber-950/40 border border-amber-600 text-amber-200"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtotal preview */}
                <div className="flex items-center justify-between pt-2 border-t border-sky-800/40 text-xs">
                  <span className="text-slate-400">{lang === 'ar' ? 'المجموع الفرعي للرحلة:' : 'Trip Subtotal:'}</span>
                  <span className="font-mono font-bold text-white text-sm">{subtotal.toLocaleString()} EGP</span>
                </div>
              </div>

              {/* DISCOUNTS & DEPOSITS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'قيمة الخصم المعتمد (ج.م)' : 'Discount Amount (EGP)'}</label>
                  <input
                    type="number"
                    min={0}
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                    className={`w-full rounded p-2 font-mono border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'العربون المسدد مقدماً (ج.م)' : 'Deposit Paid (EGP)'}</label>
                  <input
                    type="number"
                    min={0}
                    value={depositPaid}
                    onChange={(e) => setDepositPaid(Math.max(0, Number(e.target.value)))}
                    className={`w-full rounded p-2 font-mono font-bold text-emerald-400 border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              {/* SUMMARY BOX */}
              <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <div>
                  <span className="text-slate-400 block">{lang === 'ar' ? 'المبلغ الإجمالي النهائي' : 'Total Amount'}</span>
                  <span className="text-base font-black text-white">{totalAmount.toLocaleString()} EGP</span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block">{lang === 'ar' ? 'المتبقي عند الوصول' : 'Balance Due'}</span>
                  <span className={`text-base font-black ${balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {balanceDue.toLocaleString()} EGP
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'ملاحظات وتوجيهات الكابتن' : 'Notes & Special Requests'}</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Life jackets size M & L requested"
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
                >
                  {lang === 'ar' ? 'تأكيد الحجز الرسمي' : 'Confirm Official Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
