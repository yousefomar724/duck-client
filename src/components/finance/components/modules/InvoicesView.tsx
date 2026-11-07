import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { Invoice, InvoiceLine, InvoiceStatus } from '../../types/erp';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Printer,
  DollarSign,
  CheckCircle,
  X,
  Trash2,
  Calendar,
  UserCheck,
  Ship,
  Sparkles,
  Layers,
} from 'lucide-react';

export const InvoicesView: React.FC = () => {
  const { invoices, customers, settings, createInvoice, createReceipt, formatMoney, lang, t } = useErp();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedCaptain, setSelectedCaptain] = useState<string>('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [quickReceiptInvoice, setQuickReceiptInvoice] = useState<Invoice | null>(null);
  const [quickReceiptAmount, setQuickReceiptAmount] = useState<number>(0);

  // New Invoice Form State
  const [newInvoiceData, setNewInvoiceData] = useState<{
    invoiceNumber: string;
    bookingRef: string;
    date: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerType: 'Individual' | 'Company';
    paymentMethod: string;
    channel: string;
    location: string;
    captain: string;
    activity: string;
    tripType: string;
    responsibleEmployee: string;
    taxRate: number;
    paidUpfront: number;
    notes: string;
    lines: {
      tourType: string;
      service: string;
      pax: number;
      unitPrice: number;
      discount: number;
      captain: string;
      notes: string;
      revenueAccountCode: string;
      costCenter: string;
    }[];
  }>({
    invoiceNumber: `INV-2026-${String(invoices.length + 101).padStart(3, '0')}`,
    bookingRef: `WEB-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerType: 'Individual',
    paymentMethod: 'Cash on Hand',
    channel: 'Walk-in Station Direct',
    location: 'Elephantine Island Dock',
    captain: 'Captain Hamada',
    activity: 'Kayak Tours',
    tripType: 'Early Morning Nile Tour',
    responsibleEmployee: 'Captain Hamada',
    taxRate: 0,
    paidUpfront: 0,
    notes: '',
    lines: [
      {
        tourType: 'Early Morning Nile Tour',
        service: 'Single Kayak',
        pax: 2,
        unitPrice: 350,
        discount: 0,
        captain: 'Captain Hamada',
        notes: '',
        revenueAccountCode: '4110',
        costCenter: 'CC-ELPH',
      },
    ],
  });

  // Calculate totals for new invoice
  const subtotal = newInvoiceData.lines.reduce((s, l) => s + l.pax * l.unitPrice, 0);
  const totalDiscount = newInvoiceData.lines.reduce((s, l) => s + l.discount, 0);
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxAmount = (taxableAmount * newInvoiceData.taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;
  const remainingBalance = Math.max(0, grandTotal - newInvoiceData.paidUpfront);

  const handleAddLine = () => {
    setNewInvoiceData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          tourType: 'Golden Sunset Nile Tour',
          service: 'Double Kayak',
          pax: 2,
          unitPrice: 600,
          discount: 0,
          captain: prev.captain,
          notes: '',
          revenueAccountCode: '4110',
          costCenter: 'CC-ELPH',
        },
      ],
    }));
  };

  const handleRemoveLine = (index: number) => {
    if (newInvoiceData.lines.length <= 1) return;
    setNewInvoiceData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    setNewInvoiceData((prev) => {
      const updatedLines = [...prev.lines];
      const cur = { ...updatedLines[index], [field]: value };

      // Auto update unit price if service changes
      if (field === 'service') {
        const srv = settings.services?.find((s: any) => s.nameEn === value);
        if (srv) {
          cur.unitPrice = srv.defaultPrice;
          cur.revenueAccountCode = srv.revenueAccountCode;
        }
      }
      updatedLines[index] = cur;
      return { ...prev, lines: updatedLines };
    });
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const invoicePayload: Partial<Invoice> = {
        invoiceNumber: newInvoiceData.invoiceNumber,
        bookingRef: newInvoiceData.bookingRef,
        date: newInvoiceData.date,
        dueDate: newInvoiceData.date,
        customerId: newInvoiceData.customerId || 'c-001',
        customerName: newInvoiceData.customerName || 'Walk-in Customer',
        customerPhone: newInvoiceData.customerPhone,
        customerType: newInvoiceData.customerType,
        paymentMethod: newInvoiceData.paymentMethod,
        channel: newInvoiceData.channel,
        location: newInvoiceData.location,
        captain: newInvoiceData.captain,
        activity: newInvoiceData.activity,
        tripType: newInvoiceData.tripType,
        responsibleEmployee: newInvoiceData.responsibleEmployee,
        notes: newInvoiceData.notes,
        status: newInvoiceData.paidUpfront >= grandTotal ? 'paid' : newInvoiceData.paidUpfront > 0 ? 'partially_paid' : 'issued',
        paidAmount: newInvoiceData.paidUpfront,
        balance: remainingBalance,
        taxAmount,
        lines: newInvoiceData.lines.map((l, i) => ({
          id: `ln-${Date.now()}-${i}`,
          tourType: l.tourType,
          service: l.service,
          pax: Number(l.pax),
          unitPrice: Number(l.unitPrice),
          grossAmount: Number(l.pax) * Number(l.unitPrice),
          discount: Number(l.discount),
          netAmount: Number(l.pax) * Number(l.unitPrice) - Number(l.discount),
          captain: l.captain,
          notes: l.notes,
          revenueAccountCode: l.revenueAccountCode,
          costCenter: l.costCenter,
          activity: l.service.includes('SUP') ? 'SUP' : l.service.includes('Bike') ? 'Water Bike' : 'Kayak',
          location: newInvoiceData.location,
        })),
      };

      await createInvoice(invoicePayload);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert(`Error saving invoice: ${err?.message}`);
    }
  };

  const handleQuickReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReceiptInvoice) return;
    try {
      await createReceipt({
        customerId: quickReceiptInvoice.customerId,
        customerName: quickReceiptInvoice.customerName,
        invoiceId: quickReceiptInvoice.id,
        invoiceNumber: quickReceiptInvoice.invoiceNumber,
        bookingRef: quickReceiptInvoice.bookingRef,
        amount: Number(quickReceiptAmount),
        paymentMethod: 'Cash on Hand',
        receivingAccountCode: '1111',
        notes: `Quick collection for ${quickReceiptInvoice.invoiceNumber}`,
      });
      setQuickReceiptInvoice(null);
    } catch (err: any) {
      alert(`Receipt error: ${err?.message}`);
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'paid'
        ? inv.status === 'paid'
        : activeTab === 'partially_paid'
        ? inv.status === 'partially_paid'
        : activeTab === 'issued'
        ? inv.status === 'issued' || inv.status === 'approved'
        : true;

    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.bookingRef && inv.bookingRef.toLowerCase().includes(searchQuery.toLowerCase())) ||
      inv.captain.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLoc = selectedLocation === 'all' || inv.location.includes(selectedLocation);
    const matchesCapt = selectedCaptain === 'all' || inv.captain.includes(selectedCaptain);

    return matchesTab && matchesSearch && matchesLoc && matchesCapt;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'فواتير المبيعات وحجوزات النيل' : 'Sales Invoices & Nile Bookings'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'إنشاء ومتابعة الفواتير متعددة البنود مع الترحيل الآلي لقيود الإيراد والذمم المدينة'
              : 'Multi-line invoice creation, captain assignments, discounts, and automated accounting journal postings.'}
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4 text-[#0c1226]" />
          <span>{lang === 'ar' ? 'إنشاء فاتورة جديدة' : 'New Sales Invoice'}</span>
        </button>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-[#0a0f21] border border-slate-800/80 p-4 rounded-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded border border-slate-800">
            {[
              { id: 'all', labelEn: 'All Invoices', labelAr: 'كافة الفواتير' },
              { id: 'paid', labelEn: 'Paid', labelAr: 'مدفوعة بالكامل' },
              { id: 'partially_paid', labelEn: 'Partially Paid', labelAr: 'مدفوعة جزئياً' },
              { id: 'issued', labelEn: 'Issued / Unpaid', labelAr: 'صادرة وغير مدفوعة' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  activeTab === tab.id ? 'bg-[#147d9f] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'ar' ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'بحث برقم الفاتورة أو العميل...' : 'Search invoice, customer, booking...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-[#147d9f]"
            />
          </div>
        </div>

        {/* Analytical Dimension Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-400 font-medium">{lang === 'ar' ? 'تصفية حسب:' : 'Filter by:'}</span>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none"
          >
            <option value="all">{lang === 'ar' ? 'كافة المواقع النيلية' : 'All Nile Locations'}</option>
            <option value="Elephantine">جزيرة إلفنتين (Elephantine)</option>
            <option value="Gharb Soheil">غرب سهيل (Gharb Soheil)</option>
            <option value="Base Station">المحطة الرئيسية (Base Station)</option>
          </select>

          <select
            value={selectedCaptain}
            onChange={(e) => setSelectedCaptain(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-300 focus:outline-none"
          >
            <option value="all">{lang === 'ar' ? 'كافة الكباتن' : 'All Captains'}</option>
            {settings.captains?.map((c: any) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="text-slate-400 font-mono text-[11px] ml-auto">
            {filteredInvoices.length} {lang === 'ar' ? 'فاتورة مطابقة' : 'matching invoices'}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c142b] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'العميل' : 'Customer'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'الموقع والكابتن' : 'Location & Captain'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'البنود' : 'Items'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'المحصل' : 'Paid'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'المتبقي' : 'Balance'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-200">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-[#147d9f]">{inv.invoiceNumber}</div>
                    {inv.bookingRef && <div className="text-[10px] text-slate-400 font-mono">{inv.bookingRef}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{inv.customerName}</div>
                    <div className="text-[11px] text-slate-400">{inv.customerPhone || inv.customerType}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono">{inv.date}</td>
                  <td className="py-3 px-4">
                    <div className="text-slate-200">{inv.location}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span>{inv.captain}</span>
                      <span>·</span>
                      <span className="text-[#147d9f]">{inv.channel}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-300 font-medium">
                      {inv.lines.length} {lang === 'ar' ? 'بند خدمة' : 'service lines'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                      {inv.lines.map((l) => `${l.service} (${l.pax})`).join(', ')}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-white">{formatMoney(inv.total)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">{formatMoney(inv.paidAmount)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">
                    {formatMoney(inv.balance)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-[11px] font-bold ${
                        inv.status === 'paid'
                          ? 'text-emerald-400'
                          : inv.status === 'partially_paid'
                          ? 'text-amber-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {inv.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setPrintInvoice(inv)}
                        className="p-1.5 text-slate-400 hover:text-[#fdfb45] bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 transition-colors"
                        title={lang === 'ar' ? 'عرض وطباعة الفاتورة' : 'Print Invoice'}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {inv.balance > 0 && (
                        <button
                          onClick={() => {
                            setQuickReceiptInvoice(inv);
                            setQuickReceiptAmount(inv.balance);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-200 bg-slate-800 hover:bg-[#147d9f] hover:text-white rounded border border-slate-700/60 transition-colors flex items-center gap-1"
                          title={lang === 'ar' ? 'تسجيل سند قبض للمتبقي' : 'Add Receipt'}
                        >
                          <DollarSign className="w-3 h-3 text-[#fdfb45]" />
                          <span>{lang === 'ar' ? 'قبض' : 'Pay'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MULTI-LINE INVOICE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-4xl rounded-lg shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🦆</span>
                <h2 className="text-base font-bold text-white tracking-wide">
                  {lang === 'ar' ? 'إنشاء فاتورة مبيعات نيلية جديدة' : 'Create Nile Sales Invoice'}
                </h2>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4">
              {/* Header Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}</label>
                  <input
                    type="text"
                    required
                    value={newInvoiceData.invoiceNumber}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'رقم حجز الموقع' : 'Booking Ref'}</label>
                  <input
                    type="text"
                    value={newInvoiceData.bookingRef}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, bookingRef: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'تاريخ الفاتورة' : 'Date'}</label>
                  <input
                    type="date"
                    required
                    value={newInvoiceData.date}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'قناة الحجز' : 'Booking Channel'}</label>
                  <select
                    value={newInvoiceData.channel}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, channel: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  >
                    <option value="Duckegy.com Website">Duckegy.com Website</option>
                    <option value="Walk-in Station Direct">Walk-in Station Direct</option>
                    <option value="WhatsApp & Direct Call">WhatsApp & Direct Call</option>
                    <option value="Partner Tourism Agency">Partner Tourism Agency</option>
                  </select>
                </div>
              </div>

              {/* Customer Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-900/60 p-3 rounded border border-slate-800/60">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم العميل' : 'Customer Name'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins or Nile Explorer Agency"
                    value={newInvoiceData.customerName}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, customerName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'رقم الهاتف' : 'Customer Phone'}</label>
                  <input
                    type="text"
                    placeholder="+20 100 000 0000"
                    value={newInvoiceData.customerPhone}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, customerPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'نوع العميل' : 'Customer Type'}</label>
                  <select
                    value={newInvoiceData.customerType}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, customerType: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  >
                    <option value="Individual">Individual (فرد)</option>
                    <option value="Company">Company / Agency (شركة / وكالة)</option>
                  </select>
                </div>
              </div>

              {/* Operational Location & Captain */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الموقع التشغيلي' : 'Operational Location'}</label>
                  <select
                    value={newInvoiceData.location}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, location: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  >
                    <option value="Elephantine Island Dock">Elephantine Island Dock (مرسى إلفنتين)</option>
                    <option value="Gharb Soheil Nubian House">Gharb Soheil Nubian House (غرب سهيل)</option>
                    <option value="DUCK Main Base Station">DUCK Main Base Station (المحطة الرئيسية)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الكابتن المسؤول' : 'Assigned Captain'}</label>
                  <select
                    value={newInvoiceData.captain}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, captain: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  >
                    {settings.captains?.map((c: any) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الموظف / المحاسب المسؤول' : 'Responsible Staff'}</label>
                  <input
                    type="text"
                    value={newInvoiceData.responsibleEmployee}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, responsibleEmployee: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  />
                </div>
              </div>

              {/* Multi-Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    {lang === 'ar' ? 'بنود الخدمات والرحلات (Multi-line Items)' : 'Service & Tour Lines'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-2.5 py-1 text-xs font-semibold text-[#147d9f] bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إضافة بند رحلة' : 'Add Line'}</span>
                  </button>
                </div>

                <div className="border border-slate-800 rounded overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0c142b] text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="p-2">{lang === 'ar' ? 'نوع الرحلة' : 'Tour Type'}</th>
                        <th className="p-2">{lang === 'ar' ? 'الخدمة' : 'Service'}</th>
                        <th className="p-2 w-16">{lang === 'ar' ? 'العدد' : 'Pax'}</th>
                        <th className="p-2 w-24">{lang === 'ar' ? 'سعر الوحدة' : 'Price'}</th>
                        <th className="p-2 w-20">{lang === 'ar' ? 'الخصم' : 'Disc.'}</th>
                        <th className="p-2 text-right">{lang === 'ar' ? 'الصافي' : 'Net Total'}</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {newInvoiceData.lines.map((line, idx) => {
                        const lineGross = line.pax * line.unitPrice;
                        const lineNet = lineGross - line.discount;
                        return (
                          <tr key={idx} className="bg-slate-900/30">
                            <td className="p-2">
                              <select
                                value={line.tourType}
                                onChange={(e) => handleLineChange(idx, 'tourType', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                              >
                                {settings.tourTypes?.map((t: any) => (
                                  <option key={t.id} value={t.nameEn}>
                                    {t.nameEn}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <select
                                value={line.service}
                                onChange={(e) => handleLineChange(idx, 'service', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                              >
                                {settings.services?.map((s: any) => (
                                  <option key={s.id} value={s.nameEn}>
                                    {s.nameEn} ({s.defaultPrice} EGP)
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                value={line.pax}
                                onChange={(e) => handleLineChange(idx, 'pax', Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200 font-mono text-center"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                value={line.unitPrice}
                                onChange={(e) => handleLineChange(idx, 'unitPrice', Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200 font-mono text-right"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                value={line.discount}
                                onChange={(e) => handleLineChange(idx, 'discount', Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200 font-mono text-right"
                              />
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-white">
                              {formatMoney(lineNet)}
                            </td>
                            <td className="p-2 text-center">
                              {newInvoiceData.lines.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(idx)}
                                  className="text-slate-400 hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

              {/* Totals & Immediate Payment Collection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'ملاحظات الفاتورة' : 'Invoice Notes'}</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. VIP group, includes Nubian tea and sunset photography"
                    value={newInvoiceData.notes}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, notes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100"
                  ></textarea>

                  <div className="mt-2 flex items-center gap-3">
                    <label className="text-slate-400">{lang === 'ar' ? 'نسبة الضريبة (VAT):' : 'Tax Rate (%):'}</label>
                    <select
                      value={newInvoiceData.taxRate}
                      onChange={(e) => setNewInvoiceData({ ...newInvoiceData, taxRate: Number(e.target.value) })}
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100"
                    >
                      <option value="0">0% (Exempt)</option>
                      <option value="14">14% VAT (ضريبة قيمة مضافة)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded border border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>{lang === 'ar' ? 'المجموع الإجمالي:' : 'Subtotal:'}</span>
                    <span className="font-mono">{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>{lang === 'ar' ? 'إجمالي الخصم:' : 'Discount Total:'}</span>
                    <span className="font-mono text-red-400">-{formatMoney(totalDiscount)}</span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>{lang === 'ar' ? 'ضريبة القيمة المضافة:' : 'VAT (14%):'}</span>
                      <span className="font-mono">{formatMoney(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                    <span>{lang === 'ar' ? 'صافي الفاتورة:' : 'Invoice Grand Total:'}</span>
                    <span className="font-mono text-[#fdfb45]">{formatMoney(grandTotal)}</span>
                  </div>

                  {/* Immediate upfront payment */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-semibold">{lang === 'ar' ? 'المسدد مقدماً الآن:' : 'Paid Upfront Now:'}</span>
                      <input
                        type="number"
                        min="0"
                        max={grandTotal}
                        value={newInvoiceData.paidUpfront}
                        onChange={(e) => setNewInvoiceData({ ...newInvoiceData, paidUpfront: Number(e.target.value) })}
                        className="w-28 bg-slate-900 border border-slate-700 rounded p-1 text-right font-mono text-emerald-400 font-bold"
                      />
                    </div>
                    <div className="flex items-center justify-between text-amber-300 font-semibold">
                      <span>{lang === 'ar' ? 'المتبقي كذمة مدينة:' : 'Remaining Receivable:'}</span>
                      <span className="font-mono">{formatMoney(remainingBalance)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 rounded"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm"
                >
                  {lang === 'ar' ? 'حفظ وإصدار الفاتورة وتوليد القيد' : 'Save, Issue & Post Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RECEIPT MODAL */}
      {quickReceiptInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-md rounded-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white">
                {lang === 'ar' ? 'سند قبض سريع للفاتورة' : 'Record Receipt for Invoice'}
              </h3>
              <button onClick={() => setQuickReceiptInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div>{lang === 'ar' ? 'الفاتورة:' : 'Invoice:'} <span className="font-mono font-bold text-[#147d9f]">{quickReceiptInvoice.invoiceNumber}</span></div>
              <div>{lang === 'ar' ? 'العميل:' : 'Customer:'} <span className="font-semibold text-white">{quickReceiptInvoice.customerName}</span></div>
              <div>{lang === 'ar' ? 'المتبقي:' : 'Outstanding Balance:'} <span className="font-mono font-bold text-amber-300">{formatMoney(quickReceiptInvoice.balance)}</span></div>
            </div>

            <form onSubmit={handleQuickReceiptSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'مبلغ التحصيل' : 'Collection Amount'}</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={quickReceiptInvoice.balance}
                  value={quickReceiptAmount}
                  onChange={(e) => setQuickReceiptAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'طريقة الاستلام' : 'Payment Method'}</label>
                <select className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100">
                  <option value="Cash on Hand">Cash on Hand (الخزينة النقدية)</option>
                  <option value="InstaPay">InstaPay (إنستاباي)</option>
                  <option value="Vodafone Cash">Vodafone Cash (فودافون كاش)</option>
                  <option value="CIB Bank">CIB Bank Transfer (تحويل بنكي CIB)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickReceiptInvoice(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded"
                >
                  {lang === 'ar' ? 'تأكيد القبض وإقفال الذمة' : 'Confirm Receipt & Clear Receivable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE BILINGUAL INVOICE MODAL */}
      {printInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 w-full max-w-3xl rounded-lg shadow-2xl p-8 space-y-6 my-8 font-sans">
            {/* Invoice Printable Header */}
            <div className="flex items-start justify-between border-b-2 border-[#147d9f] pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">🦆</span>
                  <div>
                    <h1 className="text-2xl font-black text-[#0c1226] tracking-wider uppercase">DUCK</h1>
                    <p className="text-xs text-[#147d9f] font-bold">Nile Water Activities & Sports · Egypt</p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 mt-2 space-y-0.5">
                  <p>Elephantine Island Dock & Gharb Soheil, Aswan, Egypt</p>
                  <p>Duckegy.com · Tel: +20 100 234 5678</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-black text-[#0c1226] uppercase">TAX INVOICE / فاتورة ضريبية</div>
                <div className="text-sm font-mono font-bold text-[#147d9f] mt-1">{printInvoice.invoiceNumber}</div>
                {printInvoice.bookingRef && (
                  <div className="text-xs text-slate-500 font-mono">Ref: {printInvoice.bookingRef}</div>
                )}
                <div className="text-xs text-slate-600 mt-1">Date: {printInvoice.date}</div>
              </div>
            </div>

            {/* Bill To & Nile Details */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded text-xs">
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Billed To / العميل:</span>
                <div className="font-bold text-sm text-slate-900 mt-1">{printInvoice.customerName}</div>
                <div className="text-slate-600">{printInvoice.customerPhone || 'Direct Traveler'}</div>
                <div className="text-slate-600">{printInvoice.customerType}</div>
              </div>

              <div className="space-y-1">
                <div><span className="text-slate-500">Location:</span> <span className="font-semibold">{printInvoice.location}</span></div>
                <div><span className="text-slate-500">Assigned Captain:</span> <span className="font-semibold">{printInvoice.captain}</span></div>
                <div><span className="text-slate-500">Payment Channel:</span> <span className="font-semibold">{printInvoice.paymentMethod}</span></div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c1226] text-white">
                  <tr>
                    <th className="py-2.5 px-3">Service & Activity Description</th>
                    <th className="py-2.5 px-3 text-center">Pax</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">Total (EGP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printInvoice.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800">{l.service}</div>
                        <div className="text-[11px] text-slate-500">{l.tourType} {l.notes ? `· ${l.notes}` : ''}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold">{l.pax}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{l.unitPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-red-600">{l.discount > 0 ? `-${l.discount.toFixed(2)}` : '0.00'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{l.netAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Box */}
            <div className="flex justify-between items-start text-xs">
              <div className="max-w-xs space-y-1 text-slate-500">
                <p className="font-bold text-slate-700">Thank you for paddling with DUCK on the Nile!</p>
                <p>All tours comply with Egyptian Nile tourism and maritime safety regulations.</p>
                {printInvoice.notes && <p className="italic text-slate-600">Notes: {printInvoice.notes}</p>}
              </div>

              <div className="w-64 space-y-1.5 text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{printInvoice.subtotal.toFixed(2)} EGP</span>
                </div>
                {printInvoice.discountTotal > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span className="font-mono">-{printInvoice.discountTotal.toFixed(2)} EGP</span>
                  </div>
                )}
                {printInvoice.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>VAT (14%):</span>
                    <span className="font-mono">{printInvoice.taxAmount.toFixed(2)} EGP</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-[#0c1226] pt-2 border-t-2 border-slate-900">
                  <span>Total Amount:</span>
                  <span className="font-mono">{printInvoice.total.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-emerald-700">
                  <span>Amount Paid:</span>
                  <span className="font-mono">{printInvoice.paidAmount.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-amber-700">
                  <span>Balance Due:</span>
                  <span className="font-mono">{printInvoice.balance.toFixed(2)} EGP</span>
                </div>
              </div>
            </div>

            {/* Modal Controls (Not printed) */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPrintInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold text-white bg-[#0c1226] hover:bg-slate-800 rounded flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
