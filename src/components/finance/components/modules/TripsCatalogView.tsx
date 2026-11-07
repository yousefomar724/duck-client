import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { OfficialTripItem, ActivityTypeItem, ServiceItem } from '../../types/erp';
import {
  Compass,
  MapPin,
  Plus,
  Search,
  Filter,
  DollarSign,
  Clock,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  History,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  Globe,
  Tag,
  Ship,
  Camera,
  Coffee,
  HelpCircle,
} from 'lucide-react';

export const TripsCatalogView: React.FC = () => {
  const {
    officialTrips,
    activityTypes,
    services,
    createOfficialTrip,
    updateOfficialTrip,
    deleteOfficialTrip,
    schedulePriceChange,
    createActivityType,
    updateActivityType,
    deleteActivityType,
    createService,
    deleteService,
    setActiveModule,
    formatMoney,
    lang,
    theme,
  } = useErp();

  const isLight = theme === 'light';

  // Navigation sub-tabs
  type CatalogTab = 'trips' | 'activity_types' | 'extra_services' | 'duckegy_sync';
  const [activeTab, setActiveTab] = useState<CatalogTab>('trips');

  // Filters
  const [destinationFilter, setDestinationFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<OfficialTripItem | null>(null);

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityTypeItem | null>(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedAuditTrip, setSelectedAuditTrip] = useState<OfficialTripItem | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [schedulingTrip, setSchedulingTrip] = useState<OfficialTripItem | null>(null);

  // Form states
  const [tripForm, setTripForm] = useState<Partial<OfficialTripItem>>({
    name: '',
    nameAr: '',
    tripCode: '',
    destination: 'Elephantine Island — Aswan',
    operationalLocation: 'Elephantine Island Dock',
    activityType: 'Kayak',
    description: '',
    descriptionAr: '',
    egyptianPrice: 200,
    foreignerPrice: null,
    isForeignerPricePending: false,
    pricingUnit: 'Per Person',
    duration: '2 Hours',
    captainIncluded: true,
    equipmentRequired: ['Kayak', 'ISO Life Jacket', 'Paddle'],
    maxParticipants: 12,
    bookingAvailability: 'Available',
    operationalStatus: 'Active',
    websiteDisplayStatus: 'Published',
    websiteTripId: '',
    internalNotes: '',
  });

  const [activityForm, setActivityForm] = useState<Partial<ActivityTypeItem>>({
    name: '',
    nameAr: '',
    description: '',
    active: true,
  });

  const [serviceForm, setServiceForm] = useState<Partial<ServiceItem>>({
    nameEn: '',
    nameAr: '',
    defaultPrice: 150,
    revenueAccountCode: '4150',
  });

  const [scheduleForm, setScheduleForm] = useState<{
    effectiveDate: string;
    egyptianPrice: number;
    foreignerPrice: number | '';
    reason: string;
  }>({
    effectiveDate: '',
    egyptianPrice: 0,
    foreignerPrice: '',
    reason: '',
  });

  // Destinations list
  const destinations = [
    'all',
    'Elephantine Island — Aswan',
    'Gharb Soheil Village — Aswan',
    'Marsa Matrouh',
    'Giza',
  ];

  // Filtered trips
  const filteredTrips = officialTrips.filter((t) => {
    const matchDest = destinationFilter === 'all' || t.destination === destinationFilter;
    const matchAct = activityFilter === 'all' || t.activityType === activityFilter;
    const matchSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nameAr.includes(searchQuery) ||
      t.tripCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDest && matchAct && matchSearch;
  });

  // Open Edit Trip Modal
  const openEditTrip = (trip: OfficialTripItem) => {
    setEditingTrip(trip);
    setTripForm({
      ...trip,
    });
    setIsTripModalOpen(true);
  };

  // Open Add Trip Modal
  const openAddTrip = () => {
    setEditingTrip(null);
    setTripForm({
      name: '',
      nameAr: '',
      tripCode: `TRIP-${Math.floor(100 + Math.random() * 900)}`,
      destination: destinationFilter !== 'all' ? destinationFilter : 'Elephantine Island — Aswan',
      operationalLocation: 'Elephantine Island Dock',
      activityType: 'Kayak',
      description: '',
      descriptionAr: '',
      egyptianPrice: 250,
      foreignerPrice: 750,
      isForeignerPricePending: false,
      pricingUnit: 'Per Person',
      duration: '2 Hours',
      captainIncluded: true,
      equipmentRequired: ['Kayak', 'ISO Life Jacket', 'Paddle'],
      maxParticipants: 12,
      bookingAvailability: 'Available',
      operationalStatus: 'Active',
      websiteDisplayStatus: 'Published',
      websiteTripId: '',
      internalNotes: '',
    });
    setIsTripModalOpen(true);
  };

  // Save Trip (Create or Update)
  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTrip) {
        await updateOfficialTrip(editingTrip.id, tripForm);
      } else {
        await createOfficialTrip(tripForm);
      }
      setIsTripModalOpen(false);
      setEditingTrip(null);
    } catch (err: any) {
      alert(`Trip catalog error: ${err?.message}`);
    }
  };

  // Delete Trip
  const handleDeleteTrip = async (id: string, name: string) => {
    if (!window.confirm(lang === 'ar' ? `هل أنت متأكد من حذف رحلة "${name}"؟` : `Are you sure you want to delete "${name}"?`)) {
      return;
    }
    try {
      await deleteOfficialTrip(id);
    } catch (err: any) {
      alert(`Delete error: ${err?.message}`);
    }
  };

  // Open Schedule Price Modal
  const openScheduleModal = (trip: OfficialTripItem) => {
    setSchedulingTrip(trip);
    setScheduleForm({
      effectiveDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      egyptianPrice: trip.egyptianPrice,
      foreignerPrice: trip.foreignerPrice || '',
      reason: 'Seasonal high season rate adjustment',
    });
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedulePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingTrip) return;
    try {
      await schedulePriceChange(schedulingTrip.id, {
        effectiveDate: scheduleForm.effectiveDate,
        egyptianPrice: Number(scheduleForm.egyptianPrice),
        foreignerPrice: scheduleForm.foreignerPrice !== '' ? Number(scheduleForm.foreignerPrice) : null,
      });
      setIsScheduleModalOpen(false);
      setSchedulingTrip(null);
    } catch (err: any) {
      alert(`Scheduling error: ${err?.message}`);
    }
  };

  // Save Activity Type
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingActivity) {
        await updateActivityType(editingActivity.id, activityForm);
      } else {
        await createActivityType(activityForm);
      }
      setIsActivityModalOpen(false);
      setEditingActivity(null);
    } catch (err: any) {
      alert(`Activity Type error: ${err?.message}`);
    }
  };

  // Save Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createService(serviceForm);
      setIsServiceModalOpen(false);
      setServiceForm({
        nameEn: '',
        nameAr: '',
        defaultPrice: 150,
        revenueAccountCode: '4150',
      });
    } catch (err: any) {
      alert(`Service error: ${err?.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-[#147d9f]/20 text-[#147d9f] border border-[#147d9f]/30">
              DUCK Water Activity Platform
            </span>
            <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'المصدر المعتمد لأسعار الأنشطة' : 'Official Source of Truth'}
            </span>
          </div>
          <h1 className={`text-xl font-extrabold tracking-wide flex items-center gap-2.5 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Compass className="w-6 h-6 text-[#147d9f]" />
            <span>{lang === 'ar' ? 'كتالوج الرحلات الرسمية والأنشطة والأسعار' : 'Official Trips, Activities & Pricing Catalog'}</span>
          </h1>
          <p className={`text-xs max-w-3xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {lang === 'ar'
              ? 'الكتالوج المركزي المعتمد لكافة وجهات وأنشطة DUCK (إلفنتين، غرب سهيل، مرسى مطروح، الجيزة) مع تسعير الجنسيات، التكامل المحاسبي، وربط حجوزات Duckegy.com.'
              : 'Centralized master catalog for all DUCK water experiences across Aswan, Marsa Matrouh, and Giza with dual-pricing, invoice generation, and website sync.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveModule('bookings')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded border transition-colors bg-[#147d9f] text-white hover:bg-sky-600 shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5 text-[#fdfb45]" />
            <span>{lang === 'ar' ? 'شاشة الحجوزات والعمليات' : 'Open Bookings & Ops'}</span>
          </button>

          <button
            onClick={openAddTrip}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-[#0c1226]" />
            <span>{lang === 'ar' ? 'إضافة رحلة رسمية جديدة' : 'Add Official Trip'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        className={`flex items-center gap-1 border-b pb-2 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <button
          onClick={() => setActiveTab('trips')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'trips'
              ? 'bg-[#147d9f] text-white shadow-xs'
              : isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>{lang === 'ar' ? 'دليل الرحلات والوجهات (10)' : 'Trips & Destinations (10)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('activity_types')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'activity_types'
              ? 'bg-[#147d9f] text-white shadow-xs'
              : isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{lang === 'ar' ? 'فئات الأنشطة المعتمدة (Activity Types)' : 'Activity Types Master'}</span>
        </button>

        <button
          onClick={() => setActiveTab('extra_services')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'extra_services'
              ? 'bg-[#147d9f] text-white shadow-xs'
              : isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#fdfb45]" />
          <span>{lang === 'ar' ? 'الخدمات الإضافية والترقيات (Extra Services)' : 'Extra Services & Add-ons'}</span>
        </button>

        <button
          onClick={() => setActiveTab('duckegy_sync')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'duckegy_sync'
              ? 'bg-[#147d9f] text-white shadow-xs'
              : isLight
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>{lang === 'ar' ? 'ربط موقع دك (Duckegy.com Sync)' : 'Duckegy.com Integration'}</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: OFFICIAL TRIPS & PRICING CATALOG              */}
      {/* ==================================================== */}
      {activeTab === 'trips' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div
            className={`p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs border transition-colors ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-800/80'
            }`}
          >
            {/* Destination Pill Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className={`text-[11px] font-semibold flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <MapPin className="w-3.5 h-3.5 text-[#147d9f]" />
                {lang === 'ar' ? 'الوجهة:' : 'Destination:'}
              </span>
              {destinations.map((d) => (
                <button
                  key={d}
                  onClick={() => setDestinationFilter(d)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors shrink-0 ${
                    destinationFilter === d
                      ? 'bg-[#147d9f] text-white font-bold'
                      : isLight
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {d === 'all'
                    ? lang === 'ar'
                      ? 'كافة الوجهات'
                      : 'All Destinations'
                    : d}
                </button>
              ))}
            </div>

            {/* Activity Type Filter & Search Box */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className={`py-1 px-2 text-xs rounded border focus:outline-none focus:border-[#147d9f] ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <option value="all">{lang === 'ar' ? 'جميع الأنشطة' : 'All Activities'}</option>
                {activityTypes.map((act) => (
                  <option key={act.id} value={act.name}>
                    {act.name} {act.nameAr ? `(${act.nameAr})` : ''}
                  </option>
                ))}
              </select>

              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'بحث بالاسم، الكود، الوجهة...' : 'Search trips, code, notes...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1 text-xs rounded border focus:outline-none focus:border-[#147d9f] ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                      : 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Cards Grid of Official Trips */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTrips.map((trip) => {
              const isPending = trip.isForeignerPricePending || trip.foreignerPrice === null;
              return (
                <div
                  key={trip.id}
                  className={`border rounded-lg p-5 flex flex-col justify-between transition-colors shadow-xs ${
                    isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-[#0a0f21] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Code, Badges, Name */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-[#147d9f] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                            {trip.tripCode}
                          </span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                            trip.operationalStatus === 'Active'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}>
                            {trip.operationalStatus}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {trip.activityType}
                          </span>
                        </div>

                        <h3 className={`text-base font-bold mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {trip.name}
                        </h3>
                        <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {trip.nameAr}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                          <MapPin className="w-3 h-3 text-[#147d9f]" />
                          {trip.destination}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {trip.operationalLocation}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      {lang === 'ar' ? (trip.descriptionAr || trip.description) : trip.description}
                    </p>

                    {/* Dual Pricing Box (Nationality Based) */}
                    <div className={`p-3 rounded-md border grid grid-cols-2 gap-3 text-xs ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                    }`}>
                      {/* Egyptian Price */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          {lang === 'ar' ? 'سعر المصريين (EGP)' : 'Egyptian Price'}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {trip.egyptianPrice.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {trip.currency} / {trip.pricingUnit === 'Per Hour' ? (lang === 'ar' ? 'ساعة' : 'Hour') : (lang === 'ar' ? 'فرد' : 'Person')}
                          </span>
                        </div>
                      </div>

                      {/* Foreigner Price */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          {lang === 'ar' ? 'سعر الأجانب (Foreigner)' : 'Foreigner Price'}
                        </span>
                        {isPending ? (
                          <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-xs mt-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{lang === 'ar' ? 'قيد التدقيق (Pending)' : 'Pending Verification'}</span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-sky-500 font-mono">
                              {trip.foreignerPrice?.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {trip.currency} / {lang === 'ar' ? 'فرد' : 'Person'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Operational Details: Duration, Captain, Equipment */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{trip.duration}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>{trip.captainIncluded ? (lang === 'ar' ? 'كابتن مشمول' : 'Captain Included') : (lang === 'ar' ? 'تأجير معدات فقط' : 'Gear Only')}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        <span>{lang === 'ar' ? `الحد الأقصى: ${trip.maxParticipants} فرد` : `Max: ${trip.maxParticipants} guests`}</span>
                      </div>
                    </div>

                    {/* Internal Notes / Warnings */}
                    {trip.internalNotes && (
                      <div className={`p-2 rounded text-[11px] border ${
                        isPending
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-600'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}>
                        <span className="font-semibold">{lang === 'ar' ? 'ملاحظات تشغيلية:' : 'Operational Note:'}</span> {trip.internalNotes}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 text-xs ${
                    isLight ? 'border-slate-200' : 'border-slate-800'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openScheduleModal(trip)}
                        disabled={trip.duckSynced}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                        title={
                          trip.duckSynced
                            ? lang === 'ar' ? 'الأسعار تُدار من لوحة Duck' : 'Prices are managed in Duck admin'
                            : lang === 'ar' ? 'جدولة تعديل مستقبلي للأسعار' : 'Schedule Future Price Change'
                        }
                      >
                        <Calendar className="w-3 h-3 text-sky-400" />
                        <span>{lang === 'ar' ? 'جدولة سعر' : 'Schedule Rate'}</span>
                      </button>

                      {trip.priceAuditTrail && trip.priceAuditTrail.length > 0 && (
                        <button
                          onClick={() => {
                            setSelectedAuditTrip(trip);
                            setIsAuditModalOpen(true);
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium border transition-colors ${
                            isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                          title={lang === 'ar' ? 'سجل تدقيق وتاريخ تغير الأسعار' : 'View Price Audit Log'}
                        >
                          <History className="w-3 h-3 text-amber-400" />
                          <span>{lang === 'ar' ? `التاريخ (${trip.priceAuditTrail.length})` : `History (${trip.priceAuditTrail.length})`}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditTrip(trip)}
                        className={`flex items-center gap-1 px-3 py-1 rounded font-semibold border transition-colors ${
                          isLight
                            ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-[#147d9f] hover:text-white hover:border-[#147d9f]'
                            : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-[#147d9f] hover:text-white'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'تعديل السعر والبيانات' : 'Edit Price & Details'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTrip(trip.id, trip.name)}
                        disabled={trip.duckSynced}
                        className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title={
                          trip.duckSynced
                            ? lang === 'ar' ? 'رحلة متزامنة من Duck ولا يمكن حذفها هنا' : 'Synced from Duck: cannot be deleted here'
                            : lang === 'ar' ? 'حذف الرحلة' : 'Delete Trip'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: ACTIVITY TYPES MASTER LIST                     */}
      {/* ==================================================== */}
      {activeTab === 'activity_types' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {lang === 'ar' ? 'قائمة فئات الأنشطة المعتمدة (Activity Types Master)' : 'Activity Types Master List'}
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {lang === 'ar'
                  ? 'إدارة أنواع الأنشطة النيلية والبحرية بشكل مستقل عن أسماء الرحلات، مع إمكانية إضافة أنشطة جديدة بدون تعديل كود المصدر.'
                  : 'Independent water activity classifications (Kayak, SUP, Water Bike) fully configurable at runtime.'}
              </p>
            </div>

            <button
              onClick={() => {
                setEditingActivity(null);
                setActivityForm({ name: '', nameAr: '', description: '', active: true });
                setIsActivityModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إضافة نوع نشاط جديد' : 'New Activity Type'}</span>
            </button>
          </div>

          <div
            className={`border rounded-lg overflow-hidden ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-800/80'
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead className={`uppercase font-semibold border-b ${isLight ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-[#0c142b] text-slate-400 border-slate-800/80'}`}>
                <tr>
                  <th className="py-3 px-4">{lang === 'ar' ? 'اسم النشاط بالإنجليزي' : 'Activity Name (EN)'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'اسم النشاط بالعربي' : 'Activity Name (AR)'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'الوصف والتجهيزات' : 'Description'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/40 text-slate-200'}`}>
                {activityTypes.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#147d9f]">{act.name}</td>
                    <td className="py-3 px-4 font-medium">{act.nameAr || '—'}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-md">{act.description || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        act.active ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {act.active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'معطل' : 'Inactive')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingActivity(act);
                            setActivityForm(act);
                            setIsActivityModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(lang === 'ar' ? `حذف فئة النشاط "${act.name}"؟` : `Delete activity "${act.name}"?`)) {
                              await deleteActivityType(act.id);
                            }
                          }}
                          className="p-1 rounded text-red-400 hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: EXTRA SERVICES & ADD-ONS                      */}
      {/* ==================================================== */}
      {activeTab === 'extra_services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {lang === 'ar' ? 'قائمة الخدمات النيلية الإضافية والترقيات (Extra Services)' : 'Additional Water Services & Upgrades'}
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {lang === 'ar'
                  ? 'خدمات الضيافة، التصوير المقاوم للماء، النقل، والمعدات الإضافية المتاحة للإضافة على الفواتير مع تحديد حساب الإيراد المحاسبي.'
                  : 'Add-on services (GoPro Photography, Nubian Tea, Marina Transfers) with mapped General Ledger revenue accounts.'}
              </p>
            </div>

            <button
              onClick={() => setIsServiceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إضافة خدمة جديدة' : 'Add New Service'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map((srv) => (
              <div
                key={srv.id}
                className={`p-4 rounded-lg border flex flex-col justify-between transition-colors ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400 uppercase">
                      Acc: {srv.revenueAccountCode}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-500 font-mono">
                      {formatMoney(srv.defaultPrice)}
                    </span>
                  </div>
                  <h4 className={`text-sm font-bold mt-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {srv.nameEn}
                  </h4>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {srv.nameAr}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t flex items-center justify-between text-[11px] text-slate-400">
                  <span>{lang === 'ar' ? 'حساب الإيراد: 4150' : 'Revenue Account: 4150'}</span>
                  <button
                    onClick={async () => {
                      if (window.confirm(lang === 'ar' ? `حذف خدمة "${srv.nameEn}"؟` : `Delete service "${srv.nameEn}"?`)) {
                        await deleteService(srv.id);
                      }
                    }}
                    className="text-red-400 hover:text-red-500"
                  >
                    {lang === 'ar' ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: DUCKEGY.COM WEBSITE INTEGRATION READY         */}
      {/* ==================================================== */}
      {activeTab === 'duckegy_sync' && (
        <div className={`p-6 rounded-lg border space-y-6 ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'ar' ? 'معمارية جاهزة للتكامل مع موقع دك الرسمي (Duckegy.com)' : 'Duckegy.com Integration-Ready Architecture'}</span>
            </div>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {lang === 'ar'
                ? 'النظام مزود بآلية ربط متكاملة تفصل بين رقم حجز الموقع (Website Booking Ref) ورقم الفاتورة المحاسبية (Invoice Number)، وتمنع تكرار القيود مع تسجيل سجل الأخطاء والتعارضات.'
                : 'Architected for live booking synchronization, mapping Duckegy.com IDs to internal catalog IDs, preventing duplicates, and queuing incoming payloads.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className={`p-3 rounded border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="font-bold mb-1 text-[#147d9f]">{lang === 'ar' ? 'حالة الرابط السحابي' : 'Webhook & API Endpoint'}</div>
              <p className="text-slate-400 font-mono text-[11px]">/api/integrations/duckegy/webhook</p>
              <div className="mt-2 text-[11px] text-emerald-400 font-medium">Ready (Status: Idle / Listening)</div>
            </div>

            <div className={`p-3 rounded border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="font-bold mb-1 text-[#147d9f]">{lang === 'ar' ? 'سياسة مزامنة الأسعار' : 'Price Sync Policy'}</div>
              <p className="text-slate-400">{lang === 'ar' ? 'ERP هو المصدر المعتمد؛ تعديلات الموقع تتطلب اعتماد المراقب المالي.' : 'ERP is Authoritative Master. Web changes require approval.'}</p>
            </div>

            <div className={`p-3 rounded border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
              <div className="font-bold mb-1 text-[#147d9f]">{lang === 'ar' ? 'سجل التعارضات والأخطاء' : 'Sync Error Log'}</div>
              <p className="text-slate-400">{lang === 'ar' ? '0 تعارضات مسجلة. تم التحقق من سلامة الأرقام المرجعية.' : '0 conflicts. Idempotent booking references verified.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT OFFICIAL TRIP                     */}
      {/* ==================================================== */}
      {isTripModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`border w-full max-w-2xl rounded-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#147d9f]" />
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {editingTrip
                    ? (lang === 'ar' ? `تعديل بيانات رحلة (${editingTrip.tripCode})` : `Edit Trip (${editingTrip.tripCode})`)
                    : (lang === 'ar' ? 'إضافة رحلة جديدة إلى الكتالوج' : 'Add New Trip to Catalog')}
                </h2>
              </div>
              <button onClick={() => setIsTripModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrip} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'كود الرحلة' : 'Trip Code'}</label>
                  <input
                    type="text"
                    required
                    value={tripForm.tripCode}
                    onChange={(e) => setTripForm({ ...tripForm, tripCode: e.target.value })}
                    className={`w-full rounded p-2 font-mono font-bold border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الوجهة الرسمية' : 'Destination'}</label>
                  <select
                    value={tripForm.destination}
                    onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
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
                    value={tripForm.activityType}
                    onChange={(e) => setTripForm({ ...tripForm, activityType: e.target.value })}
                    className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  >
                    {activityTypes.map((act) => (
                      <option key={act.id} value={act.name}>
                        {act.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم الرحلة بالإنجليزي' : 'Trip Name (English)'}</label>
                  <input
                    type="text"
                    required
                    value={tripForm.name}
                    onChange={(e) => setTripForm({ ...tripForm, name: e.target.value })}
                    className={`w-full rounded p-2 font-semibold border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم الرحلة بالعربي' : 'Trip Name (Arabic)'}</label>
                  <input
                    type="text"
                    required
                    value={tripForm.nameAr}
                    onChange={(e) => setTripForm({ ...tripForm, nameAr: e.target.value })}
                    className={`w-full rounded p-2 font-medium border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              {/* DUAL PRICING (EGYPTIAN & FOREIGENER) */}
              <div className="p-3 rounded-lg border bg-sky-950/20 border-sky-800/40 space-y-3">
                <div className="font-bold text-sky-400 text-xs flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'تسعير الجنسيات (Nationality-Based Pricing)' : 'Nationality-Based Pricing Settings'}</span>
                </div>
                {editingTrip?.duckSynced && (
                  <p className="text-[11px] text-amber-400">
                    {lang === 'ar'
                      ? 'هذه الرحلة متزامنة من Duck: الأسعار تُعدَّل من لوحة Duck فقط.'
                      : 'Synced from Duck: prices are changed in Duck admin only.'}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'سعر المصريين (ج.م)' : 'Egyptian Price (EGP)'}</label>
                    <input
                      type="number"
                      required
                      min={0}
                      disabled={editingTrip?.duckSynced}
                      value={tripForm.egyptianPrice}
                      onChange={(e) => setTripForm({ ...tripForm, egyptianPrice: Number(e.target.value) })}
                      className={`w-full rounded p-2 font-mono font-bold border disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-[#147d9f] ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'سعر الأجانب (ج.م)' : 'Foreigner Price (EGP)'}</label>
                    <input
                      type="number"
                      min={0}
                      disabled={tripForm.isForeignerPricePending || editingTrip?.duckSynced}
                      value={tripForm.isForeignerPricePending ? '' : (tripForm.foreignerPrice || '')}
                      onChange={(e) => setTripForm({ ...tripForm, foreignerPrice: e.target.value ? Number(e.target.value) : null })}
                      placeholder={tripForm.isForeignerPricePending ? 'Pending Verification' : 'e.g. 850'}
                      className={`w-full rounded p-2 font-mono font-bold border focus:outline-none focus:border-[#147d9f] ${
                        tripForm.isForeignerPricePending
                          ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border-slate-700'
                          : isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-900 border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'وحدة التسعير' : 'Pricing Unit'}</label>
                    <select
                      value={tripForm.pricingUnit}
                      onChange={(e) => setTripForm({ ...tripForm, pricingUnit: e.target.value as any })}
                      className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                      }`}
                    >
                      <option value="Per Person">Per Person (للفرد)</option>
                      <option value="Per Hour">Per Hour (للساعة)</option>
                      <option value="Per Equipment">Per Equipment (للمعدة)</option>
                      <option value="Per Group">Per Group (للمجموعة)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isPendingCheck"
                    disabled={editingTrip?.duckSynced}
                    checked={tripForm.isForeignerPricePending}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setTripForm({
                        ...tripForm,
                        isForeignerPricePending: checked,
                        foreignerPrice: checked ? null : tripForm.foreignerPrice,
                      });
                    }}
                    className="w-4 h-4 text-[#147d9f] rounded focus:ring-0"
                  />
                  <label htmlFor="isPendingCheck" className="text-slate-300 cursor-pointer text-xs">
                    {lang === 'ar'
                      ? 'سعر الأجانب قيد التدقيق (Pending Verification - لا تستخدم سعر المصريين تلقائياً)'
                      : 'Foreigner price is pending verification (Do NOT silently use Egyptian price)'}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'مدة الجولة' : 'Duration'}</label>
                  <input
                    type="text"
                    value={tripForm.duration}
                    onChange={(e) => setTripForm({ ...tripForm, duration: e.target.value })}
                    className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الحد الأقصى للمشاركين' : 'Max Participants'}</label>
                  <input
                    type="number"
                    min={1}
                    value={tripForm.maxParticipants}
                    onChange={(e) => setTripForm({ ...tripForm, maxParticipants: Number(e.target.value) })}
                    className={`w-full rounded p-2 font-mono border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'تضمين كابتن' : 'Captain Included'}</label>
                  <select
                    value={tripForm.captainIncluded ? 'true' : 'false'}
                    onChange={(e) => setTripForm({ ...tripForm, captainIncluded: e.target.value === 'true' })}
                    className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="true">{lang === 'ar' ? 'نعم - كابتن مخصص مشمول' : 'Yes - Dedicated Captain'}</option>
                    <option value="false">{lang === 'ar' ? 'لا - تأجير حر فقط' : 'No - Free Rental Gear'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الوصف بالإنجليزية' : 'Description (English)'}</label>
                <textarea
                  rows={2}
                  value={tripForm.description}
                  onChange={(e) => setTripForm({ ...tripForm, description: e.target.value })}
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'ملاحظات تشغيلية داخلية' : 'Internal Notes'}</label>
                <input
                  type="text"
                  value={tripForm.internalNotes}
                  onChange={(e) => setTripForm({ ...tripForm, internalNotes: e.target.value })}
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsTripModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
                >
                  {lang === 'ar' ? 'حفظ في الكتالوج' : 'Save to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: SCHEDULE FUTURE PRICE CHANGE                  */}
      {/* ==================================================== */}
      {isScheduleModalOpen && schedulingTrip && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-lg shadow-2xl p-6 space-y-4 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-700'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-400" />
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {lang === 'ar' ? `جدولة سعر جديد (${schedulingTrip.name})` : `Schedule Price Change (${schedulingTrip.name})`}
                </h2>
              </div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedulePrice} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'تاريخ سريان السعر الجديد' : 'Effective Date'}</label>
                <input
                  type="date"
                  required
                  value={scheduleForm.effectiveDate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, effectiveDate: e.target.value })}
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'سعر المصريين الجديد' : 'New Egyptian Price'}</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={scheduleForm.egyptianPrice}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, egyptianPrice: Number(e.target.value) })}
                    className={`w-full rounded p-2 font-mono font-bold border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'سعر الأجانب الجديد' : 'New Foreigner Price'}</label>
                  <input
                    type="number"
                    min={0}
                    value={scheduleForm.foreignerPrice}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, foreignerPrice: e.target.value ? Number(e.target.value) : '' })}
                    className={`w-full rounded p-2 font-mono font-bold border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'سبب التعديل والاعتماد' : 'Reason / Approval Note'}</label>
                <input
                  type="text"
                  required
                  value={scheduleForm.reason}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, reason: e.target.value })}
                  placeholder="e.g. Winter season rate adjustment approved by CFO"
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
                >
                  {lang === 'ar' ? 'تأكيد الجدولة' : 'Schedule Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: PRICE AUDIT HISTORY TRAIL                    */}
      {/* ==================================================== */}
      {isAuditModalOpen && selectedAuditTrip && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border w-full max-w-lg rounded-lg shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-700'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {lang === 'ar' ? `سجل تدقيق وتغيرات الأسعار: ${selectedAuditTrip.name}` : `Price Audit Trail: ${selectedAuditTrip.name}`}
                </h2>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedAuditTrip.priceAuditTrail.map((log) => (
                <div key={log.id} className={`p-3 rounded border text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="font-semibold">{log.changedBy}</span>
                    <span className="font-mono text-[11px]">{log.date}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px] my-1">
                    <div>
                      <span className="text-slate-500 block">Egyptian:</span>
                      <span className="line-through text-red-400 mr-1">{log.oldEgyptianPrice}</span> → <span className="text-emerald-400 font-bold">{log.newEgyptianPrice} EGP</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Foreigner:</span>
                      <span className="line-through text-red-400 mr-1">{log.oldForeignerPrice || 'N/A'}</span> → <span className="text-sky-400 font-bold">{log.newForeignerPrice || 'Pending'} EGP</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic mt-1">"{log.reason}"</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t text-right">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT ACTIVITY TYPE                     */}
      {/* ==================================================== */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-lg shadow-2xl p-6 space-y-4 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-700'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {editingActivity ? (lang === 'ar' ? 'تعديل فئة النشاط' : 'Edit Activity Type') : (lang === 'ar' ? 'إضافة فئة نشاط جديدة' : 'Add Activity Type')}
              </h2>
              <button onClick={() => setIsActivityModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم النشاط بالإنجليزي' : 'Activity Name (EN)'}</label>
                <input
                  type="text"
                  required
                  value={activityForm.name}
                  onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                  placeholder="e.g. Water Bike"
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم النشاط بالعربي' : 'Activity Name (AR)'}</label>
                <input
                  type="text"
                  value={activityForm.nameAr}
                  onChange={(e) => setActivityForm({ ...activityForm, nameAr: e.target.value })}
                  placeholder="e.g. دراجات مائية نيلية"
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الوصف والتجهيزات المطلوبة' : 'Description'}</label>
                <textarea
                  rows={2}
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
                >
                  {lang === 'ar' ? 'حفظ النشاط' : 'Save Activity Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD EXTRA SERVICE                            */}
      {/* ==================================================== */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border w-full max-w-md rounded-lg shadow-2xl p-6 space-y-4 ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-700'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {lang === 'ar' ? 'إضافة خدمة نيلية جديدة' : 'Add New Additional Service'}
              </h2>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم الخدمة بالإنجليزي' : 'Service Name (EN)'}</label>
                <input
                  type="text"
                  required
                  value={serviceForm.nameEn}
                  onChange={(e) => setServiceForm({ ...serviceForm, nameEn: e.target.value })}
                  placeholder="e.g. Drone Video Footage"
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم الخدمة بالعربي' : 'Service Name (AR)'}</label>
                <input
                  type="text"
                  required
                  value={serviceForm.nameAr}
                  onChange={(e) => setServiceForm({ ...serviceForm, nameAr: e.target.value })}
                  placeholder="e.g. تصوير جوي بالدرون"
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'السعر الافتراضي (ج.م)' : 'Default Price (EGP)'}</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={serviceForm.defaultPrice}
                    onChange={(e) => setServiceForm({ ...serviceForm, defaultPrice: Number(e.target.value) })}
                    className={`w-full rounded p-2 font-mono font-bold border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'حساب الإيراد' : 'Revenue Account'}</label>
                  <input
                    type="text"
                    required
                    value={serviceForm.revenueAccountCode}
                    onChange={(e) => setServiceForm({ ...serviceForm, revenueAccountCode: e.target.value })}
                    className={`w-full rounded p-2 font-mono border focus:outline-none focus:border-[#147d9f] ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
                >
                  {lang === 'ar' ? 'حفظ الخدمة' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
