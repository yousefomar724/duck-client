export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type NormalBalance = 'Debit' | 'Credit';

export interface Account {
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  parentCode?: string;
  normalBalance: NormalBalance;
  isPosting: boolean;
  currency: string;
  balance: number;
  active: boolean;
  description?: string;
}

export type InvoiceStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'cancelled'
  | 'refunded';

export interface InvoiceLine {
  id: string;
  tourType: string;
  service: string;
  pax: number;
  unitPrice: number;
  grossAmount: number;
  discount: number;
  netAmount: number;
  captain: string;
  notes?: string;
  revenueAccountCode: string;
  costCenter: string;
  activity: string;
  location: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingRef?: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerType: 'Individual' | 'Company';
  paymentMethod: string;
  channel: string;
  location: string;
  captain: string;
  activity: string;
  tripType: string;
  responsibleEmployee: string;
  responsibleAccountant?: string;
  lines: InvoiceLine[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  notes?: string;
  journalEntryId?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  postedAt?: string;
  isLegacyImported?: boolean;
}

export interface CustomerReceipt {
  id: string;
  receiptNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  bookingRef?: string;
  amount: number;
  currency: string;
  paymentMethod: 'Cash' | 'Bank Transfer - CIB' | 'Vodafone Cash' | 'InstaPay' | string;
  receivingAccountCode: string;
  reference?: string;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  status: 'draft' | 'approved' | 'posted';
  journalEntryId?: string;
  createdAt: string;
  isLegacyImported?: boolean;
}

export interface ExpenseLine {
  id?: string;
  description: string;
  categoryId: string;
  amount: number;
  expenseAccountCode: string;
  costCenter: string;
  activity?: string;
  location?: string;
}

export interface ExpenseVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  beneficiary: string;
  paymentMethod: string;
  paidFromAccountCode: string;
  lines: ExpenseLine[];
  totalAmount: number;
  currency: string;
  relatedActivity?: string;
  relatedLocation?: string;
  costCenter?: string;
  notes?: string;
  attachmentName?: string;
  createdBy: string;
  approvedBy?: string;
  status: 'draft' | 'approved' | 'posted';
  journalEntryId?: string;
  createdAt: string;
  isLegacyImported?: boolean;
}

export interface JournalLine {
  id: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  debit: number;
  credit: number;
  description?: string;
  costCenter?: string;
  activity?: string;
  location?: string;
}

export interface JournalEntry {
  id: string;
  journalNumber: string;
  date: string;
  periodId: string;
  sourceDocument:
    | 'Invoice'
    | 'CustomerReceipt'
    | 'ExpenseVoucher'
    | 'PurchaseInvoice'
    | 'Settlement'
    | 'Depreciation'
    | 'ManualJournal'
    | 'Reversal'
    | 'AssetPurchase'
    | 'SupplierPayment'
    | 'OpeningBalance'
    | 'AssetDisposal';
  sourceDocumentNumber: string;
  sourceId?: string;
  description: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  costCenter?: string;
  activity?: string;
  location?: string;
  createdBy: string;
  approvedBy?: string;
  postedBy?: string;
  postedAt?: string;
  status: 'draft' | 'posted' | 'reversed';
  reversalOfId?: string;
  isReversal?: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  nameAr?: string;
  phone: string;
  email?: string;
  nationality: string;
  customerType: 'Individual' | 'Company';
  address?: string;
  notes?: string;
  totalBookings: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  nameAr?: string;
  type: 'Equipment' | 'Boat Operator' | 'Guest House' | 'Maintenance' | 'Other';
  contactPerson?: string;
  phone: string;
  email?: string;
  balance: number;
  notes?: string;
  active: boolean;
}

export interface PurchaseInvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  expenseOrAssetAccountCode: string;
  costCenter?: string;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  dueDate: string;
  lines: PurchaseInvoiceLine[];
  total: number;
  paidAmount: number;
  balance: number;
  status: 'draft' | 'approved' | 'posted' | 'paid';
  journalEntryId?: string;
  notes?: string;
  createdAt: string;
}

export interface ProviderSettlement {
  id: string;
  settlementNumber: string;
  providerId: string;
  providerName: string;
  periodStart: string;
  periodEnd: string;
  totalTrips: number;
  grossRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  advancesDeducted: number;
  netPayable: number;
  status: 'draft' | 'approved' | 'paid';
  journalEntryId?: string;
  date: string;
  notes?: string;
}

export interface AssetCategoryItem {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  defaultUsefulLifeMonths: number;
  defaultDepreciationMethod: 'Straight Line' | 'Declining Balance';
  assetAccountCode: string;
  accumulatedDepAccountCode: string;
  accDepreciationAccountCode?: string;
  depreciationExpenseAccountCode: string;
  depreciationAccountCode?: string;
  active: boolean;
}

export interface AssetDisposalDetails {
  date: string;
  type: 'Sale' | 'Disposal' | 'Scrap';
  saleProceeds: number;
  realizedGainLoss: number;
  receivingAccountCode?: string;
  journalEntryId?: string;
  journalNumber?: string;
  reason?: string;
}

export interface FixedAsset {
  id: string;
  assetId: string;
  assetCode?: string;
  nameAr: string;
  nameEn: string;
  category: string;
  trackingMethod: 'Individual' | 'Bulk';
  quantity: number;
  purchaseDate: string;
  inServiceDate?: string;
  supplier?: string;
  supplierId?: string;
  invoiceRef?: string;
  unitCost: number;
  totalAcquisitionCost: number;
  acquisitionCost: number; // Backwards compatible with totalAcquisitionCost
  usefulLifeMonths: number;
  depreciationMethod: 'Straight Line' | 'Declining Balance' | 'None' | 'Straight-Line' | 'Reducing Balance';
  residualValue: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  assetAccountCode: string;
  depreciationAccountCode: string;
  accumulatedDepreciationAccountCode: string;
  status: 'Active' | 'Under Maintenance' | 'Temporarily Unavailable' | 'Disposed' | 'Sold';
  location: string;
  costCenter: string;
  custodian: string;
  responsibleEmployee?: string;
  serialNumber?: string;
  notes?: string;
  attachments?: string[];
  isOpeningBalance?: boolean;
  journalEntryId?: string;
  lastDepreciationDate?: string;
  disposalDetails?: AssetDisposalDetails;
}

export interface DepreciationRunItem {
  assetId: string;
  assetCode?: string;
  assetName: string;
  nameAr?: string;
  nameEn?: string;
  category: string;
  acquisitionCost: number;
  previousAccumulatedDep: number;
  monthlyDepreciation: number;
  newAccumulatedDep: number;
  netBookValue: number;
  currentNetBookValue?: number;
  projectedNetBookValue?: number;
}

export interface DepreciationRunRecord {
  id: string;
  runNumber: string;
  period: string; // YYYY-MM
  year: number;
  month: number;
  totalAssetsCount: number;
  assetCount?: number;
  totalDepreciationAmount: number;
  totalDepreciation?: number;
  status: 'Draft' | 'Approved' | 'Posted' | 'posted';
  journalEntryId?: string;
  journalNumber?: string;
  items: DepreciationRunItem[];
  createdAt: string;
  executedAt?: string;
  createdBy: string;
  executedBy?: string;
  postedAt?: string;
  postedBy?: string;
}

export interface OpeningBalanceLine {
  id: string;
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  debit: number;
  credit: number;
  subledgerType?: 'Customer' | 'Supplier' | 'Bank' | 'Asset' | 'General';
  subledgerId?: string;
  subledgerName?: string;
  costCenter?: string;
  location?: string;
  dueDate?: string;
  reference?: string;
  notes?: string;
  description?: string;
}

export interface OpeningBalanceBatch {
  id: string;
  batchNumber: string;
  fiscalYear: number;
  systemStartDate: string;
  openingJournalDate: string;
  openingDate?: string;
  baseCurrency: 'EGP';
  currency?: string;
  status: 'Draft' | 'Under Review' | 'Approved' | 'Posted' | 'posted' | 'draft';
  totalDebit: number;
  totalCredit: number;
  difference: number;
  isBalanced: boolean;
  lines: OpeningBalanceLine[];
  journalEntryId?: string;
  journalNumber?: string;
  createdBy: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  postedBy?: string;
  postedAt?: string;
  notes?: string;
  supportingDocuments?: string[];
  changeHistory: {
    timestamp: string;
    userId: string;
    userName: string;
    action: string;
    details: string;
  }[];
}

export interface SubledgerCustomerItem {
  customerId: string;
  customerName: string;
  balance: number;
  openInvoicesCount: number;
  invoices: {
    invoiceNumber: string;
    date: string;
    dueDate: string;
    total: number;
    paid: number;
    balance: number;
  }[];
}

export interface SubledgerSupplierItem {
  supplierId: string;
  supplierName: string;
  balance: number;
  openBillsCount: number;
  bills: {
    billNumber: string;
    date: string;
    dueDate: string;
    total: number;
    paid: number;
    balance: number;
  }[];
}

export interface SubledgerBankItem {
  accountCode: string;
  accountNameEn: string;
  accountNameAr: string;
  paymentMethod: string;
  balance: number;
}

export interface SubledgerAssetItem {
  assetId: string;
  nameEn: string;
  nameAr: string;
  category: string;
  quantity: number;
  acquisitionCost: number;
  accumulatedDepreciation: number;
  netBookValue: number;
}

export interface SubledgerSummaryReport {
  customers: SubledgerCustomerItem[];
  suppliers: SubledgerSupplierItem[];
  cashAndBanks: SubledgerBankItem[];
  fixedAssets: SubledgerAssetItem[];
  totalCustomerReceivables: number;
  totalSupplierPayables: number;
  totalCashAndBank: number;
  totalAssetCost: number;
  totalAssetAccDep: number;
  totalAssetNetBook: number;
}

export interface AssetMovementReportItem {
  category: string;
  openingCost: number;
  purchasesCost: number;
  disposalsCost: number;
  closingCost: number;
  openingAccDep: number;
  depreciationCharge: number;
  disposalsAccDep: number;
  closingAccDep: number;
  closingNetBookValue: number;
}

export interface CostCenter {
  code: string;
  nameAr: string;
  nameEn: string;
  type: 'Location' | 'Activity' | 'Department' | 'Channel';
  active: boolean;
}

export interface AccountingPeriod {
  id: string;
  year: number;
  month: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Open' | 'Closed' | 'Locked';
  closedAt?: string;
  closedBy?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export type UserRole =
  | 'Super Admin'
  | 'CFO'
  | 'Chief Accountant'
  | 'Accountant'
  | 'Cashier'
  | 'Operations Manager'
  | 'Auditor';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  avatar?: string;
}

export interface ExpenseCategoryMapping {
  id: string;
  categoryNameAr: string;
  categoryNameEn: string;
  defaultAccountCode: string;
  accountType: 'Operating Expense' | 'Cost of Revenue' | 'Asset Capitalization' | 'Equity Distribution' | 'Commission Payable';
  notes?: string;
}

export interface GeneralLedgerMovement {
  id: string;
  date: string;
  journalNumber: string;
  sourceDocument: string;
  sourceDocumentNumber: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  costCenter?: string;
  activity?: string;
  location?: string;
}

export interface TrialBalanceItem {
  accountCode: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface FinancialStatementIncome {
  revenue: { code: string; nameEn: string; nameAr: string; amount: number }[];
  totalRevenue: number;
  costOfRevenue: { code: string; nameEn: string; nameAr: string; amount: number }[];
  totalCostOfRevenue: number;
  grossProfit: number;
  operatingExpenses: { code: string; nameEn: string; nameAr: string; amount: number }[];
  totalOperatingExpenses: number;
  operatingProfit: number;
  otherIncomeAndExpenses: { code: string; nameEn: string; nameAr: string; amount: number }[];
  totalOther: number;
  netProfit: number;
}

export interface BalanceSheetItem {
  code: string;
  nameEn: string;
  nameAr: string;
  amount: number;
}

export interface FinancialStatementBalanceSheet {
  currentAssets: BalanceSheetItem[];
  fixedAssets: BalanceSheetItem[];
  totalAssets: number;
  currentLiabilities: BalanceSheetItem[];
  longTermLiabilities: BalanceSheetItem[];
  totalLiabilities: number;
  equity: BalanceSheetItem[];
  currentPeriodProfit: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  difference: number;
}

export interface AnomalyItem {
  id: string;
  sheet: string;
  row: number;
  type: 'Duplicate' | 'Missing Value' | 'Misclassified Asset' | 'Ambiguous Date' | 'Unbalanced Entry';
  severity: 'Warning' | 'Error' | 'Info';
  message: string;
  recordData: Record<string, any>;
  resolved?: boolean;
}

export interface TourTypeItem {
  id: string;
  nameEn: string;
  nameAr: string;
  duration: string;
  active?: boolean;
}

export interface CaptainItem {
  id: string;
  name: string;
  phone: string;
  commissionRate: number;
  active: boolean;
  notes?: string;
}

export interface ServiceItem {
  id: string;
  nameEn: string;
  nameAr: string;
  defaultPrice: number;
  revenueAccountCode: string;
  active?: boolean;
}

export interface InternalControlSettings {
  maxApprovalLimit: number;
  requireTwoStepApproval: boolean;
  enforceSegregationOfDuties: boolean;
  blockLockedPeriodPostings: boolean;
  forbidDirectPostedEdits: boolean;
  autoDepreciationOnClose: boolean;
  baseCurrency: string;
}

export interface TourTypeProfitability {
  id: string;
  tourTypeName: string;
  tourTypeNameAr: string;
  duration: string;
  bookingCount: number;
  totalPax: number;
  grossRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  directCosts: number;
  netProfit: number;
  marginPct: number;
}

export interface ActivityTypeItem {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  active: boolean;
}

export interface PriceAuditEntry {
  id: string;
  date: string;
  changedBy: string;
  oldEgyptianPrice: number;
  newEgyptianPrice: number;
  oldForeignerPrice: number | null;
  newForeignerPrice: number | null;
  reason: string;
}

export interface ScheduledPriceChange {
  id: string;
  effectiveDate: string;
  egyptianPrice: number;
  foreignerPrice: number | null;
  status: 'Pending' | 'Applied' | 'Cancelled';
  createdAt: string;
  createdBy: string;
}

export interface OfficialTripItem {
  id: string;
  tripCode: string;
  name: string;
  nameAr: string;
  destination: 'Elephantine Island — Aswan' | 'Gharb Soheil Village — Aswan' | 'Marsa Matrouh' | 'Giza' | string;
  operationalLocation: string;
  activityType: string;
  description: string;
  descriptionAr: string;
  egyptianPrice: number;
  foreignerPrice: number | null;
  isForeignerPricePending: boolean;
  pricingUnit: 'Per Person' | 'Per Hour' | 'Per Equipment' | 'Per Group';
  currency: 'EGP';
  duration: string;
  captainIncluded: boolean;
  equipmentRequired: string[];
  maxParticipants: number;
  minParticipants?: number;
  bookingAvailability: 'Available' | 'High Season Only' | 'Weekend Only' | 'Unavailable';
  operationalStatus: 'Active' | 'Seasonal' | 'Maintenance' | 'Inactive';
  websiteDisplayStatus: 'Published' | 'Draft' | 'Hidden';
  websiteTripId?: string;
  /** Mirrored from a Duck Aswan trip (Duck addition): prices and delete are read-only. */
  duckSynced?: boolean;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
  priceAuditTrail: PriceAuditEntry[];
  scheduledPriceChanges: ScheduledPriceChange[];
}

export interface BookingItem {
  id: string;
  bookingNumber: string;
  tripId: string;
  tripName: string;
  destination: string;
  activityType: string;
  bookingDate: string;
  bookingTime: string;
  customerName: string;
  customerPhone: string;
  nationalityCategory: 'Egyptian' | 'Foreigner' | 'Mixed Group';
  egyptianPax: number;
  foreignerPax: number;
  egyptianUnitPrice: number;
  foreignerUnitPrice: number;
  foreignerPricePendingOverride?: boolean;
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  totalAmount: number;
  depositPaid: number;
  balanceDue: number;
  status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Invoiced';
  invoiceId?: string;
  invoiceNumber?: string;
  notes?: string;
  websiteRef?: string;
  /** Mirrored from a Duck Aswan booking (Duck addition): read-only, created in Duck admin. */
  duckSynced?: boolean;
  createdAt: string;
}

export interface CustomRoleItem {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  permissions: string[];
  active: boolean;
  isSystem?: boolean;
}

export interface LocationItem {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface ChannelItem {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface PaymentMethodItem {
  id: string;
  nameAr: string;
  nameEn: string;
  accountCode: string;
}

export interface SettingsState {
  activityTypes: ActivityTypeItem[];
  officialTrips: OfficialTripItem[];
  bookings: BookingItem[];
  customRoles: CustomRoleItem[];
  tourTypes: TourTypeItem[];
  services: ServiceItem[];
  captains: CaptainItem[];
  locations: LocationItem[];
  channels: ChannelItem[];
  paymentMethods: PaymentMethodItem[];
  internalControls: InternalControlSettings;
  expenseCategories?: string[];
}

