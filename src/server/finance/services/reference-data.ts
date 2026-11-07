// Generated from the ERP defaults (marsaegy1-beep/DUCK- src/server/defaultData.ts):
// reference data only. Account balances are not seeded: they come from journals.
import type {
  ActivityTypeItem,
  AssetCategoryItem,
  ChannelItem,
  CostCenter,
  CustomRoleItem,
  ExpenseCategoryMapping,
  LocationItem,
  PaymentMethodItem,
  ServiceItem,
} from '@/lib/finance/erp-types';
import type { AccountDoc } from '../models/accounting';

type SeedAccount = Omit<AccountDoc, '_id'>;

export const ACCOUNTS: SeedAccount[] = [
  // 1000 ASSETS
  { code: '1000', nameAr: 'الأصول', nameEn: 'Assets', type: 'Asset', normalBalance: 'Debit', isPosting: false, currency: 'EGP', active: true },
  { code: '1100', nameAr: 'الأصول المتداولة', nameEn: 'Current Assets', type: 'Asset', parentCode: '1000', normalBalance: 'Debit', isPosting: false, currency: 'EGP', active: true },
  { code: '1110', nameAr: 'النقدية وما في حكمها', nameEn: 'Cash & Cash Equivalents', type: 'Asset', parentCode: '1100', normalBalance: 'Debit', isPosting: false, currency: 'EGP', active: true },
  { code: '1111', nameAr: 'الخزينة النقدية الرئيسية', nameEn: 'Main Cash on Hand', type: 'Asset', parentCode: '1110', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '1112', nameAr: 'حساب بنك CIB مصر', nameEn: 'CIB Bank Account', type: 'Asset', parentCode: '1110', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '1113', nameAr: 'محفظة فودافون كاش', nameEn: 'Vodafone Cash Wallet', type: 'Asset', parentCode: '1110', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '1114', nameAr: 'حساب إنستاباي - InstaPay', nameEn: 'InstaPay Account', type: 'Asset', parentCode: '1110', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '1115', nameAr: 'حساب وسيط بوابات الدفع الإلكتروني', nameEn: 'Payment Gateway Clearing', type: 'Asset', parentCode: '1110', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },

  { code: '1120', nameAr: 'المدينون والعملاء', nameEn: 'Receivables & Debtors', type: 'Asset', parentCode: '1100', normalBalance: 'Debit', isPosting: false, currency: 'EGP', active: true },
  { code: '1121', nameAr: 'حسابات العملاء المدينين', nameEn: 'Accounts Receivable - Customers', type: 'Asset', parentCode: '1120', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '1122', nameAr: 'دفعات وسلف موردين مقدماً', nameEn: 'Supplier Advances', type: 'Asset', parentCode: '1120', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '1123', nameAr: 'سلف كباتن وموظفين', nameEn: 'Staff & Captain Advances', type: 'Asset', parentCode: '1120', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },

  { code: '1130', nameAr: 'مصروفات مدفوعة مقدماً', nameEn: 'Prepaid Expenses', type: 'Asset', parentCode: '1100', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },

  // Fixed Assets
  { code: '1200', nameAr: 'الأصول الثابتة', nameEn: 'Fixed Assets', type: 'Asset', parentCode: '1000', normalBalance: 'Debit', isPosting: false, currency: 'EGP', active: true },
  { code: '1210', nameAr: 'معدات وأسطول الأنشطة النيلية', nameEn: 'Nile Water Fleet Equipment', type: 'Asset', parentCode: '1200', normalBalance: 'Debit', isPosting: false, currency: 'EGP', active: true },
  { code: '1211', nameAr: 'أسطول قوارب الكاياك (فردي ومزدوج)', nameEn: 'Kayaks Fleet (Single & Double)', type: 'Asset', parentCode: '1210', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '1212', nameAr: 'ألواح التجديف واقفاً (SUP)', nameEn: 'Stand-Up Paddleboards (SUP)', type: 'Asset', parentCode: '1210', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '1213', nameAr: 'أسطول الدراجات المائية (Water Bikes)', nameEn: 'Water Bikes Fleet', type: 'Asset', parentCode: '1210', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '1214', nameAr: 'قوارب الدعم والإنقاذ والمحركات', nameEn: 'Rescue Boats & Outboard Motors', type: 'Asset', parentCode: '1210', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '1215', nameAr: 'سترات النجاة ومعدات الأمان النيلي', nameEn: 'Life Jackets & Safety Gear', type: 'Asset', parentCode: '1210', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },

  { code: '1220', nameAr: 'مجمع الإهلاك المتراكم', nameEn: 'Accumulated Depreciation', type: 'Asset', parentCode: '1200', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },

  // 2000 LIABILITIES
  { code: '2000', nameAr: 'الالتزامات', nameEn: 'Liabilities', type: 'Liability', normalBalance: 'Credit', isPosting: false, currency: 'EGP', active: true },
  { code: '2100', nameAr: 'الالتزامات المتداولة', nameEn: 'Current Liabilities', type: 'Liability', parentCode: '2000', normalBalance: 'Credit', isPosting: false, currency: 'EGP', active: true },
  { code: '2110', nameAr: 'الموردون وحسابات الدائنين', nameEn: 'Accounts Payable - Suppliers', type: 'Liability', parentCode: '2100', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '2120', nameAr: 'مستحقات وعمولات الكباتن والمقدمين', nameEn: 'Provider & Captain Payables', type: 'Liability', parentCode: '2100', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '2130', nameAr: 'دفعات مقدمة من العملاء (التزام عقود)', nameEn: 'Customer Advances / Contract Liability', type: 'Liability', parentCode: '2100', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '2140', nameAr: 'مصروفات وأجور مستحقة', nameEn: 'Accrued Expenses & Salaries', type: 'Liability', parentCode: '2100', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '2150', nameAr: 'ضريبة القيمة المضافة والمبيعات المستحقة', nameEn: 'VAT / Taxes Payable', type: 'Liability', parentCode: '2100', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },

  // 3000 EQUITY
  { code: '3000', nameAr: 'حقوق الملكية', nameEn: 'Equity', type: 'Equity', normalBalance: 'Credit', isPosting: false, currency: 'EGP', active: true },
  { code: '3100', nameAr: 'رأس مال الشركة المدفوع', nameEn: 'Paid-in Share Capital', type: 'Equity', parentCode: '3000', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '3200', nameAr: 'الأرباح المرحلة من سنوات سابقة', nameEn: 'Retained Earnings', type: 'Equity', parentCode: '3000', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '3300', nameAr: 'أرباح / (خسائر) الفترة الحالية', nameEn: 'Current Year Profit / Loss', type: 'Equity', parentCode: '3000', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '3400', nameAr: 'مسحوبات وتوزيعات الشركاء', nameEn: 'Owner Drawings & Distributions', type: 'Equity', parentCode: '3000', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '3500', nameAr: 'حساب تسوية الأرصدة الافتتاحية', nameEn: 'Opening Balance Equity', type: 'Equity', parentCode: '3000', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },

  // 4000 REVENUE
  { code: '4000', nameAr: 'الإيرادات', nameEn: 'Revenue', type: 'Revenue', normalBalance: 'Credit', isPosting: false, currency: 'EGP', active: true },
  { code: '4100', nameAr: 'إيرادات الأنشطة والرحلات النيلية', nameEn: 'Nile Tours & Activities Revenue', type: 'Revenue', parentCode: '4000', normalBalance: 'Credit', isPosting: false, currency: 'EGP', active: true },
  { code: '4110', nameAr: 'إيرادات رحلات وتأجير الكاياك', nameEn: 'Kayak Tours & Rentals Revenue', type: 'Revenue', parentCode: '4100', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '4120', nameAr: 'إيرادات ألواح التجديف واقفاً (SUP)', nameEn: 'Stand-Up Paddleboard (SUP) Revenue', type: 'Revenue', parentCode: '4100', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '4130', nameAr: 'إيرادات الدراجات المائية النيلية', nameEn: 'Water Bike Tours Revenue', type: 'Revenue', parentCode: '4100', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '4140', nameAr: 'إيرادات رحلات القوارب الخاصة والفلوكة', nameEn: 'Private Boat & Felucca Tours Revenue', type: 'Revenue', parentCode: '4100', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '4150', nameAr: 'إيرادات الفعاليات والرحلات الجماعية والشركات', nameEn: 'Corporate & Group Events Revenue', type: 'Revenue', parentCode: '4100', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '4200', nameAr: 'إيرادات العمولات وخدمات الوساطة', nameEn: 'Commission & Agency Revenue', type: 'Revenue', parentCode: '4000', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '4300', nameAr: 'إيرادات تشغيلية أخرى (مشروبات وتصوير)', nameEn: 'Other Operating Revenue (Photos & Drinks)', type: 'Revenue', parentCode: '4000', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },
  { code: '4400', nameAr: 'أرباح بيع واستبعاد أصول ثابتة', nameEn: 'Gain on Fixed Asset Disposal', type: 'Revenue', parentCode: '4000', normalBalance: 'Credit', isPosting: true, currency: 'EGP', active: true },

  // 5000 EXPENSES
  { code: '5000', nameAr: 'المصروفات', nameEn: 'Expenses', type: 'Expense', normalBalance: 'Debit', isPosting: false, currency: 'EGP', active: true },
  { code: '5100', nameAr: 'تكاليف التشغيل المباشرة', nameEn: 'Direct Operating Costs', type: 'Expense', parentCode: '5000', normalBalance: 'Debit', isPosting: false, currency: 'EGP', active: true },
  { code: '5110', nameAr: 'عمولات وأجور الكباتن المباشرة', nameEn: 'Captain Direct Wages & Commissions', type: 'Expense', parentCode: '5100', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '5120', nameAr: 'رسوم النزول والبيوت النوبية (Guest House)', nameEn: 'Nubian Guest House Landing Fees', type: 'Expense', parentCode: '5100', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '5130', nameAr: 'رسوم مرسى أغاخان والتصاريح', nameEn: 'Agakhan Landing & Permit Fees', type: 'Expense', parentCode: '5100', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '5140', nameAr: 'عمولات المراكبية ومساعدي النيل', nameEn: 'Marakbi Commission & River Assistance', type: 'Expense', parentCode: '5100', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '5150', nameAr: 'وقود وزيوت قوارب الإنقاذ والجر', nameEn: 'Boat Fuel & Lubricants', type: 'Expense', parentCode: '5100', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '5160', nameAr: 'ضيافة ومشروبات الرحلات النيلية', nameEn: 'Tour Hospitality & Refreshments', type: 'Expense', parentCode: '5100', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },

  { code: '5200', nameAr: 'مصروفات الصيانة والإصلاح', nameEn: 'Maintenance & Repairs', type: 'Expense', parentCode: '5000', normalBalance: 'Debit', isPosting: false, currency: 'EGP', active: true },
  { code: '5210', nameAr: 'صيانة القوارب ومعدات الأمان والمجاديف', nameEn: 'Boats, Paddles & Gear Maintenance', type: 'Expense', parentCode: '5200', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },

  { code: '5300', nameAr: 'مصروفات عمومية وإدارية', nameEn: 'General & Administrative Expenses', type: 'Expense', parentCode: '5000', normalBalance: 'Debit', isPosting: false, currency: 'EGP', active: true },
  { code: '5310', nameAr: 'رواتب الموظفين والإدارة', nameEn: 'Administrative & Staff Salaries', type: 'Expense', parentCode: '5300', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '5320', nameAr: 'إيجار المقر والمحطة النيلية', nameEn: 'Station & Office Rent', type: 'Expense', parentCode: '5300', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '5330', nameAr: 'استضافة المواقع والبرمجيات والإنترنت (Hosting & R&D)', nameEn: 'Software, Hosting & R&D', type: 'Expense', parentCode: '5300', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '5340', nameAr: 'رسوم بوابات الدفع والمصروفات البنكية', nameEn: 'Payment Gateway & Banking Fees', type: 'Expense', parentCode: '5300', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },

  { code: '5400', nameAr: 'مصروفات التسويق والمبيعات', nameEn: 'Sales & Marketing Expenses', type: 'Expense', parentCode: '5000', normalBalance: 'Debit', isPosting: false, currency: 'EGP', active: true },
  { code: '5410', nameAr: 'حملات إعلانات فيسبوك وانستجرام وجوجل', nameEn: 'Digital Marketing & Social Ads', type: 'Expense', parentCode: '5400', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '5420', nameAr: 'تصوير احترافي وصناعة محتوى ترويجي', nameEn: 'Content Production & Photography', type: 'Expense', parentCode: '5400', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },

  { code: '5500', nameAr: 'إهلاك الأصول الثابتة', nameEn: 'Depreciation Expense', type: 'Expense', parentCode: '5000', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
  { code: '5600', nameAr: 'خسائر بيع واستبعاد أصول ثابتة', nameEn: 'Loss on Fixed Asset Disposal', type: 'Expense', parentCode: '5000', normalBalance: 'Debit', isPosting: true, currency: 'EGP', active: true },
];

export const EXPENSE_MAPPINGS: ExpenseCategoryMapping[] = [
  { id: 'cat-1', categoryNameAr: 'عمولة كابتن', categoryNameEn: 'Captain Commission', defaultAccountCode: '5110', accountType: 'Cost of Revenue', notes: 'Direct operating labor for captains' },
  { id: 'cat-2', categoryNameAr: 'عمولة البيت النوبي', categoryNameEn: 'Guest House Commission', defaultAccountCode: '5120', accountType: 'Cost of Revenue', notes: 'Landing fees at Nubian houses' },
  { id: 'cat-3', categoryNameAr: 'رسوم أغاخان', categoryNameEn: 'Agakhan Commission', defaultAccountCode: '5130', accountType: 'Cost of Revenue', notes: 'Agakhan dock & landing permits' },
  { id: 'cat-4', categoryNameAr: 'عمولة مراكبي', categoryNameEn: 'Marakbi Commission', defaultAccountCode: '5140', accountType: 'Cost of Revenue', notes: 'River felucca & motor transfers' },
  { id: 'cat-5', categoryNameAr: 'مصروفات تشغيلية', categoryNameEn: 'Operational Expenses', defaultAccountCode: '5160', accountType: 'Cost of Revenue', notes: 'Water, tea, tour logistics' },
  { id: 'cat-6', categoryNameAr: 'تسويق وإعلانات', categoryNameEn: 'Marketing', defaultAccountCode: '5410', accountType: 'Operating Expense', notes: 'Online ad campaigns & banners' },
  { id: 'cat-7', categoryNameAr: 'إدارة ومكتب', categoryNameEn: 'Administration', defaultAccountCode: '5310', accountType: 'Operating Expense', notes: 'Office supplies & admin salaries' },
  { id: 'cat-8', categoryNameAr: 'أبحاث وتطوير واستضافة', categoryNameEn: 'R&D & Hosting', defaultAccountCode: '5330', accountType: 'Operating Expense', notes: 'Duckegy.com server & digital tools' },
  { id: 'cat-9', categoryNameAr: 'شراء أصول ومعدات', categoryNameEn: 'Asset Purchases', defaultAccountCode: '1211', accountType: 'Asset Capitalization', notes: 'Capitalized equipment (not P&L expense)' },
  { id: 'cat-10', categoryNameAr: 'إهلاك معدات', categoryNameEn: 'Depreciation', defaultAccountCode: '5500', accountType: 'Operating Expense', notes: 'Monthly wear and tear accrual' },
  { id: 'cat-11', categoryNameAr: 'توزيعات أرباح الشركاء', categoryNameEn: 'Profit Distribution', defaultAccountCode: '3400', accountType: 'Equity Distribution', notes: 'Equity drawing, not operating expense' },
  { id: 'cat-12', categoryNameAr: 'استثمارات رأسمالية', categoryNameEn: 'Investments', defaultAccountCode: '1200', accountType: 'Asset Capitalization', notes: 'Capital expenditure projects' },
  { id: 'cat-13', categoryNameAr: 'مصروفات أخرى', categoryNameEn: 'Other Expenses', defaultAccountCode: '5300', accountType: 'Operating Expense', notes: 'Miscellaneous expenditures' },
];

export const COST_CENTERS: CostCenter[] = [
  { code: 'CC-ELPH', nameAr: 'مركز تكلفة: محطة إلفنتين', nameEn: 'Elephantine Island Station', type: 'Location', active: true },
  { code: 'CC-SOHL', nameAr: 'مركز تكلفة: محطة غرب سهيل', nameEn: 'Gharb Soheil Station', type: 'Location', active: true },
  { code: 'CC-MAIN', nameAr: 'مركز تكلفة: المقر الرئيسي أسوان', nameEn: 'DUCK HQ & Operations Base', type: 'Location', active: true },
  { code: 'CC-KYK', nameAr: 'نشاط الكاياك النيلي', nameEn: 'Kayak Nile Activity', type: 'Activity', active: true },
  { code: 'CC-SUP', nameAr: 'نشاط التجديف واقفاً SUP', nameEn: 'SUP Activity', type: 'Activity', active: true },
  { code: 'CC-WBK', nameAr: 'نشاط الدراجات المائية', nameEn: 'Water Bike Activity', type: 'Activity', active: true },
];

export const PAYMENT_METHODS: PaymentMethodItem[] = [
    { id: 'pm-1', nameAr: 'نقداً بالخزينة (Cash)', nameEn: 'Cash on Hand', accountCode: '1111' },
    { id: 'pm-2', nameAr: 'تحويل بنكي CIB', nameEn: 'Bank Transfer - CIB', accountCode: '1112' },
    { id: 'pm-3', nameAr: 'فودافون كاش (Vodafone Cash)', nameEn: 'Vodafone Cash', accountCode: '1113' },
    { id: 'pm-4', nameAr: 'إنستاباي (InstaPay)', nameEn: 'InstaPay Transfer', accountCode: '1114' },
    { id: 'pm-5', nameAr: 'فيزا وماستركارد (Payment Gateway)', nameEn: 'Online Card Gateway', accountCode: '1115' },
];

export const CHANNELS: ChannelItem[] = [
    { id: 'chn-1', nameAr: 'حجز موقع دك الرسمي (Duckegy.com)', nameEn: 'Duckegy.com Website' },
    { id: 'chn-2', nameAr: 'حضور مباشر بالمحطة (Walk-in)', nameEn: 'Walk-in Station Direct' },
    { id: 'chn-3', nameAr: 'واتساب وهاتف خدمة العملاء', nameEn: 'WhatsApp & Direct Call' },
    { id: 'chn-4', nameAr: 'وكالة سياحية شريكة (OTA / Agency)', nameEn: 'Partner Tourism Agency' },
];

export const LOCATIONS: LocationItem[] = [
    { id: 'loc-1', nameAr: 'جزيرة إلفنتين - المرسى الرئيسي', nameEn: 'Elephantine Island Dock' },
    { id: 'loc-2', nameAr: 'غرب سهيل - البيت النوبي', nameEn: 'Gharb Soheil Nubian House' },
    { id: 'loc-3', nameAr: 'محطة DUCK الرئيسية - أسوان', nameEn: 'DUCK Main Base Station' },
    { id: 'loc-4', nameAr: 'مرسى مقابر النبلاء وأغاخان', nameEn: 'Tombs of the Nobles / Agakhan Marina' },
];

export const ASSET_CATEGORIES: AssetCategoryItem[] = [
  {
    id: 'cat-kayaks',
    code: 'AC-KYK',
    nameEn: 'Kayaks',
    nameAr: 'قوارب الكاياك (فردي ومزدوج)',
    defaultUsefulLifeMonths: 36,
    defaultDepreciationMethod: 'Straight Line',
    assetAccountCode: '1211',
    accumulatedDepAccountCode: '1220',
    depreciationExpenseAccountCode: '5500',
    active: true,
  },
  {
    id: 'cat-water-bikes',
    code: 'AC-WBK',
    nameEn: 'Water Bikes',
    nameAr: 'الدراجات المائية النيلية',
    defaultUsefulLifeMonths: 48,
    defaultDepreciationMethod: 'Straight Line',
    assetAccountCode: '1213',
    accumulatedDepAccountCode: '1220',
    depreciationExpenseAccountCode: '5500',
    active: true,
  },
  {
    id: 'cat-sup',
    code: 'AC-SUP',
    nameEn: 'SUP Boards',
    nameAr: 'ألواح التجديف واقفاً (SUP)',
    defaultUsefulLifeMonths: 24,
    defaultDepreciationMethod: 'Straight Line',
    assetAccountCode: '1212',
    accumulatedDepAccountCode: '1220',
    depreciationExpenseAccountCode: '5500',
    active: true,
  },
  {
    id: 'cat-boats',
    code: 'AC-BOT',
    nameEn: 'Boats',
    nameAr: 'قوارب الدعم والفلوكة والمحركات',
    defaultUsefulLifeMonths: 60,
    defaultDepreciationMethod: 'Straight Line',
    assetAccountCode: '1214',
    accumulatedDepAccountCode: '1220',
    depreciationExpenseAccountCode: '5500',
    active: true,
  },
  {
    id: 'cat-equipment',
    code: 'AC-EQP',
    nameEn: 'Equipment',
    nameAr: 'معدات السلامة وأطواق وسترات النجاة',
    defaultUsefulLifeMonths: 36,
    defaultDepreciationMethod: 'Straight Line',
    assetAccountCode: '1215',
    accumulatedDepAccountCode: '1220',
    depreciationExpenseAccountCode: '5500',
    active: true,
  },
  {
    id: 'cat-furniture',
    code: 'AC-FUR',
    nameEn: 'Furniture',
    nameAr: 'أثاث وتجهيزات المحطات النيلية',
    defaultUsefulLifeMonths: 60,
    defaultDepreciationMethod: 'Straight Line',
    assetAccountCode: '1215',
    accumulatedDepAccountCode: '1220',
    depreciationExpenseAccountCode: '5500',
    active: true,
  },
  {
    id: 'cat-computers',
    code: 'AC-CMP',
    nameEn: 'Computers',
    nameAr: 'أجهزة كمبيوتر ومعدات IT ونقاط بيع',
    defaultUsefulLifeMonths: 36,
    defaultDepreciationMethod: 'Straight Line',
    assetAccountCode: '1215',
    accumulatedDepAccountCode: '1220',
    depreciationExpenseAccountCode: '5500',
    active: true,
  },
  {
    id: 'cat-vehicles',
    code: 'AC-VEH',
    nameEn: 'Vehicles',
    nameAr: 'مركبات وسيارات نقل المعدات',
    defaultUsefulLifeMonths: 60,
    defaultDepreciationMethod: 'Straight Line',
    assetAccountCode: '1214',
    accumulatedDepAccountCode: '1220',
    depreciationExpenseAccountCode: '5500',
    active: true,
  },
  {
    id: 'cat-other',
    code: 'AC-OTH',
    nameEn: 'Other Assets',
    nameAr: 'أصول وتجهيزات رأسمالية أخرى',
    defaultUsefulLifeMonths: 48,
    defaultDepreciationMethod: 'Straight Line',
    assetAccountCode: '1215',
    accumulatedDepAccountCode: '1220',
    depreciationExpenseAccountCode: '5500',
    active: true,
  },
];

export const ACTIVITY_TYPES: ActivityTypeItem[] = [
    { id: 'act-1', name: 'Kayak', nameAr: 'كاياك نيل وبحر', description: 'Single and double touring kayaks with paddles and safety equipment', active: true },
    { id: 'act-2', name: 'Stand Up Paddle (SUP)', nameAr: 'التجديف وقوفاً (SUP)', description: 'Inflatable and solid stand up paddle boards with ankle leash', active: true },
    { id: 'act-3', name: 'Water Bike', nameAr: 'دراجات مائية نيلية', description: 'Activity category without a confirmed trip price in this catalog. Pending fleet allocation.', active: true },
];

export const SERVICES: ServiceItem[] = [
    { id: 'srv-1', nameAr: 'كاياك فردي (Single Kayak)', nameEn: 'Single Kayak', defaultPrice: 350, revenueAccountCode: '4110' },
    { id: 'srv-2', nameAr: 'كاياك مزدوج (Double Kayak)', nameEn: 'Double Kayak', defaultPrice: 600, revenueAccountCode: '4110' },
    { id: 'srv-3', nameAr: 'لوح تجديف (SUP Board)', nameEn: 'Stand-Up Paddleboard (SUP)', defaultPrice: 400, revenueAccountCode: '4120' },
    { id: 'srv-4', nameAr: 'دراجة مائية نيلية (Water Bike)', nameEn: 'Water Bike (Single/Tandem)', defaultPrice: 500, revenueAccountCode: '4130' },
    { id: 'srv-5', nameAr: 'قارب وفلوكة خاصة (Private Support Boat / Felucca)', nameEn: 'Private Support Boat / Felucca', defaultPrice: 1200, revenueAccountCode: '4140' },
    { id: 'srv-6', nameAr: 'جلسة تصوير احترافية مقاومة للماء (GoPro Photography)', nameEn: 'Waterproof Action Photography Session', defaultPrice: 350, revenueAccountCode: '4150' },
    { id: 'srv-7', nameAr: 'ضيافة الشاي النوبي وجلسة حطب بالغروب', nameEn: 'Nubian Mint Tea & Sunset Campfire', defaultPrice: 150, revenueAccountCode: '4150' },
    { id: 'srv-8', nameAr: 'توصيل من وإلى فندق الإقامة بأسوان', nameEn: 'Hotel Transfer to Dock & Return', defaultPrice: 250, revenueAccountCode: '4150' },
    { id: 'srv-9', nameAr: 'ترقية سترة نجاة احترافية + حقيبة عازلة للمياه', nameEn: 'Premium ISO Vest & Waterproof Bag Kit', defaultPrice: 80, revenueAccountCode: '4150' },
];

/** The ERP's seeded role definitions (permission templates, not users). */
export const CUSTOM_ROLES: CustomRoleItem[] = [
    {
      id: 'role-super-admin',
      name: 'Super Admin',
      nameAr: 'مدير عام النظام (Super Admin)',
      description: 'Full unconstrained system authority over accounts, financial postings, pricing policies, catalog, and audits.',
      permissions: ['*'],
      active: true,
      isSystem: true,
    },
    {
      id: 'role-financial-controller',
      name: 'Financial Controller',
      nameAr: 'المراقب المالي ورئيس الحسابات',
      description: 'Approve and post journal entries, lock fiscal periods, approve price modifications, and execute depreciation.',
      permissions: ['finance:approve', 'finance:post', 'finance:lock_period', 'pricing:approve', 'reports:full'],
      active: true,
      isSystem: true,
    },
    {
      id: 'role-senior-accountant',
      name: 'Senior Accountant',
      nameAr: 'محاسب أول (Senior Accountant)',
      description: 'Create and review sales invoices, expense vouchers, customer receipts, and draft journal entries.',
      permissions: ['invoices:create', 'receipts:create', 'expenses:create', 'journals:draft', 'reports:standard'],
      active: true,
      isSystem: true,
    },
    {
      id: 'role-operations-manager',
      name: 'Operations Manager',
      nameAr: 'مدير العمليات والمحطات النيلية',
      description: 'Manage trips catalog, captain rosters and schedules, fleet assignments, and live booking approvals.',
      permissions: ['catalog:manage', 'bookings:manage', 'captains:assign', 'fleet:dispatch'],
      active: true,
      isSystem: true,
    },
    {
      id: 'role-booking-coordinator',
      name: 'Booking Coordinator',
      nameAr: 'منسق الحجوزات وخدمة العملاء',
      description: 'Register customer bookings, calculate nationality-based prices, apply promotional discounts, and issue draft invoices.',
      permissions: ['bookings:create', 'customers:manage', 'invoices:draft'],
      active: true,
      isSystem: false,
    },
    {
      id: 'role-site-supervisor',
      name: 'Site Supervisor',
      nameAr: 'مشرف المرسى والمعدات (Dock Supervisor)',
      description: 'Oversee dock departures, equipment safety checks, lifejacket distribution, and participant check-in.',
      permissions: ['bookings:read', 'fleet:status', 'checkin:perform'],
      active: true,
      isSystem: false,
    },
    {
      id: 'role-auditor',
      name: 'External Auditor',
      nameAr: 'مراجع حسابات خارجي (Auditor)',
      description: 'Read-only access across general ledger, journal entries, audit trail logs, and historical statements.',
      permissions: ['audit:read', 'reports:read', 'journals:read', 'statements:read'],
      active: true,
      isSystem: true,
    },
];
