import React, { useState } from 'react';
import { useErp } from '../../context/ErpContext';
import { UserRole } from '../../types/erp';
import {
  ShieldCheck,
  Sliders,
  Users,
  Ship,
  Edit2,
  Plus,
  Save,
  CheckCircle2,
  Lock,
  DollarSign,
  AlertCircle,
  X,
  Trash2,
} from 'lucide-react';

export const InternalControlsView: React.FC = () => {
  const {
    settings,
    users,
    currentUser,
    customRoles,
    createCustomRole,
    deleteCustomRole,
    updateTourTypes,
    updateCaptains,
    updateServices,
    updateInternalControls,
    updateUserRole,
    createUser,
    resetUserPassword,
    lang,
    theme,
    formatMoney,
  } = useErp();

  const [activeTab, setActiveTab] = useState<'governance' | 'tour_types' | 'captains' | 'services' | 'roles'>('governance');
  const [isCustomRoleModalOpen, setIsCustomRoleModalOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState<{
    name: string;
    nameAr: string;
    description: string;
    permissions: string[];
  }>({
    name: '',
    nameAr: '',
    description: '',
    permissions: ['bookings:manage', 'invoices:create'],
  });

  // Governance State
  const [controlsState, setControlsState] = useState({
    maxApprovalLimit: settings.internalControls?.maxApprovalLimit ?? 5000,
    requireTwoStepApproval: settings.internalControls?.requireTwoStepApproval ?? true,
    enforceSegregationOfDuties: settings.internalControls?.enforceSegregationOfDuties ?? true,
    blockLockedPeriodPostings: settings.internalControls?.blockLockedPeriodPostings ?? true,
    forbidDirectPostedEdits: settings.internalControls?.forbidDirectPostedEdits ?? true,
    autoDepreciationOnClose: settings.internalControls?.autoDepreciationOnClose ?? true,
    baseCurrency: settings.internalControls?.baseCurrency ?? 'EGP',
  });

  // Tour Types State
  const [tourTypesList, setTourTypesList] = useState<any[]>(settings.tourTypes || []);
  const [editingTourType, setEditingTourType] = useState<any | null>(null);
  const [newTourTypeModal, setNewTourTypeModal] = useState<boolean>(false);
  const [newTourType, setNewTourType] = useState({
    id: `tt-${Date.now()}`,
    nameEn: '',
    nameAr: '',
    duration: '2 Hours',
  });

  // Captains State
  const [captainsList, setCaptainsList] = useState<any[]>(settings.captains || []);
  const [editingCaptain, setEditingCaptain] = useState<any | null>(null);
  const [newCaptainModal, setNewCaptainModal] = useState<boolean>(false);
  const [newCaptain, setNewCaptain] = useState({
    id: `cpt-${Date.now()}`,
    name: '',
    phone: '+20 ',
    commissionRate: 15,
    active: true,
  });

  // Services State
  const [servicesList, setServicesList] = useState<any[]>(settings.services || []);
  const [editingService, setEditingService] = useState<any | null>(null);

  // User Roles State
  // Super Admin only: add staff accounts and reset their passwords.
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{
    name: string;
    username: string;
    email: string;
    role: UserRole;
    password: string;
  }>({ name: '', username: '', email: '', role: 'Accountant', password: '' });
  const [resettingUser, setResettingUser] = useState<{ id: string; name: string } | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const [changingUser, setChangingUser] = useState<{ id: string; name: string; currentRole: UserRole } | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('Accountant');

  const handleSaveGovernance = async () => {
    try {
      await updateInternalControls(controlsState);
      alert(lang === 'ar' ? 'تم حفظ سياسات الرقابة والتحكم الداخلي بنجاح' : 'Internal governance policies saved successfully');
    } catch (err: any) {
      alert(`Error saving controls: ${err?.message}`);
    }
  };

  const handleSaveTourTypes = async () => {
    try {
      await updateTourTypes(tourTypesList);
      setEditingTourType(null);
      alert(lang === 'ar' ? 'تم تحديث مسميات أنواع الرحلات بنجاح' : 'Tour types updated successfully');
    } catch (err: any) {
      alert(`Error updating tour types: ${err?.message}`);
    }
  };

  const handleAddNewTourType = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [...tourTypesList, newTourType];
    setTourTypesList(updated);
    try {
      await updateTourTypes(updated);
      setNewTourTypeModal(false);
      setNewTourType({ id: `tt-${Date.now()}`, nameEn: '', nameAr: '', duration: '2 Hours' });
    } catch (err: any) {
      alert(`Error adding tour type: ${err?.message}`);
    }
  };

  const handleSaveCaptains = async () => {
    try {
      await updateCaptains(captainsList);
      setEditingCaptain(null);
      alert(lang === 'ar' ? 'تم حفظ بيانات وقائمة الكباتن بنجاح' : 'Captains list saved successfully');
    } catch (err: any) {
      alert(`Error updating captains: ${err?.message}`);
    }
  };

  const handleAddNewCaptain = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [...captainsList, newCaptain];
    setCaptainsList(updated);
    try {
      await updateCaptains(updated);
      setNewCaptainModal(false);
      setNewCaptain({ id: `cpt-${Date.now()}`, name: '', phone: '+20 ', commissionRate: 15, active: true });
    } catch (err: any) {
      alert(`Error adding captain: ${err?.message}`);
    }
  };

  const handleSaveServices = async () => {
    try {
      await updateServices(servicesList);
      setEditingService(null);
      alert(lang === 'ar' ? 'تم حفظ مسميات الخدمات والأسعار بنجاح' : 'Services and pricing updated successfully');
    } catch (err: any) {
      alert(`Error updating services: ${err?.message}`);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.name.trim() || !newUserForm.username.trim() || !newUserForm.password) return;
    try {
      await createUser({
        ...newUserForm,
        name: newUserForm.name.trim(),
        username: newUserForm.username.trim(),
        email: newUserForm.email.trim(),
      });
      setIsUserModalOpen(false);
      setNewUserForm({ name: '', username: '', email: '', role: 'Accountant', password: '' });
      alert(lang === 'ar' ? 'تم إنشاء المستخدم بنجاح' : 'User created successfully');
    } catch (err: any) {
      alert(`Create user error: ${err?.message}`);
    }
  };

  const handleConfirmPasswordReset = async () => {
    if (!resettingUser || !resetPasswordValue) return;
    try {
      await resetUserPassword(resettingUser.id, resetPasswordValue);
      setResettingUser(null);
      setResetPasswordValue('');
      alert(lang === 'ar' ? 'تم إعادة تعيين كلمة المرور' : 'Password reset successfully');
    } catch (err: any) {
      alert(`Password reset error: ${err?.message}`);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!changingUser) return;
    try {
      await updateUserRole(changingUser.id, selectedNewRole);
      setChangingUser(null);
      alert(lang === 'ar' ? `تم تغيير دور ${changingUser.name} إلى ${selectedNewRole}` : `Updated role to ${selectedNewRole}`);
    } catch (err: any) {
      alert(`Role change error: ${err?.message}`);
    }
  };

  const allRoles: UserRole[] = [
    'Super Admin',
    'CFO',
    'Chief Accountant',
    'Accountant',
    'Cashier',
    'Operations Manager',
    'Auditor',
  ];

  const rolePermissionsMatrix = [
    { permission: 'إنشاء الفواتير وسندات القبض (Create Sales & Receipts)', roles: ['Super Admin', 'CFO', 'Chief Accountant', 'Accountant', 'Cashier', 'Operations Manager'] },
    { permission: 'اعتماد المستحقات وصرف المصروفات (Approve Expenses & Payments)', roles: ['Super Admin', 'CFO', 'Chief Accountant'] },
    { permission: 'ترحيل قيود اليومية المحاسبية (Post Journal Entries)', roles: ['Super Admin', 'CFO', 'Chief Accountant'] },
    { permission: 'عكس القيود المحاسبية والتصحيح (Reverse Journals)', roles: ['Super Admin', 'CFO', 'Chief Accountant'] },
    { permission: 'إقفال وفتح الفترات المالية (Lock & Unlock Fiscal Periods)', roles: ['Super Admin', 'CFO'] },
    { permission: 'إدارة وتعديل دليل الحسابات (Manage Chart of Accounts)', roles: ['Super Admin', 'CFO', 'Chief Accountant'] },
    { permission: 'تعديل سياسات الرقابة والكباتن (Internal Controls & Masters)', roles: ['Super Admin', 'CFO'] },
    { permission: 'فحص سجلات التدقيق والمطابقة (Audit Trail & Review)', roles: ['Super Admin', 'CFO', 'Chief Accountant', 'Auditor'] },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#147d9f]" />
            <span>
              {lang === 'ar'
                ? 'إعدادات التحكم الداخلي، الحوكمة وتعديل المسميات'
                : 'Internal Controls, Governance & Master Records Editor'}
            </span>
          </h1>
          <p className="text-xs opacity-75">
            {lang === 'ar'
              ? 'التحكم في سياسات الرقابة المالية، تعديل مسميات أنواع الرحلات والكباتن والخدمات، وإدارة أدوار وصلاحيات المستخدمين'
              : 'Configure enterprise internal control policies, edit tour names, captains, services, and manage user roles.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        {[
          { id: 'governance', labelEn: 'Internal Controls Policies', labelAr: 'سياسات الرقابة والتحكم الداخلي' },
          { id: 'tour_types', labelEn: 'Tour Types Editor', labelAr: 'تعديل مسميات أنواع الرحلات' },
          { id: 'captains', labelEn: 'Captains & Commissions', labelAr: 'تعديل بيانات وأسماء الكباتن' },
          { id: 'services', labelEn: 'Services & Standard Pricing', labelAr: 'مسميات الخدمات والأسعار' },
          { id: 'roles', labelEn: 'User Roles & Permissions', labelAr: 'إدارة الأدوار وصلاحيات المستخدمين' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 font-semibold rounded transition-colors ${
              activeTab === tab.id
                ? 'bg-[#147d9f] text-white shadow-sm'
                : theme === 'light'
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {lang === 'ar' ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* TAB 1: GOVERNANCE & INTERNAL CONTROLS */}
      {activeTab === 'governance' && (
        <div className={`p-6 rounded-lg border space-y-6 max-w-3xl ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
        }`}>
          <div>
            <h2 className="text-base font-bold text-[#147d9f] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#fdfb45]" />
              <span>{lang === 'ar' ? 'سياسات الرقابة المالية والحوكمة' : 'Enterprise Financial Internal Controls'}</span>
            </h2>
            <p className="text-xs opacity-75 mt-1">
              {lang === 'ar'
                ? 'تفعيل القيود الرقابية لمنع الأخطاء والاحتيال وضمان الامتثال للمعايير المحاسبية المعتمدة'
                : 'Enforce audit gates, segregation of duties, and approval limits across all accounting operations.'}
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Approval Limit */}
            <div className={`p-4 rounded border flex items-center justify-between gap-4 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div>
                <div className="font-bold">{lang === 'ar' ? 'الحد الأقصى للصرف النقدي المباشر بدون موافقة المدير المالي (ج.م):' : 'Max Direct Cash Disbursement Limit (EGP):'}</div>
                <div className="text-[11px] opacity-75">{lang === 'ar' ? 'أي مبلغ يتجاوز هذا الحد يتطلب موافقة ثنائية من الـ CFO' : 'Disbursements above this limit require CFO authorization'}</div>
              </div>
              <input
                type="number"
                value={controlsState.maxApprovalLimit}
                onChange={(e) => setControlsState({ ...controlsState, maxApprovalLimit: Number(e.target.value) })}
                className={`w-32 border rounded p-1.5 font-mono font-bold text-right text-sm ${
                  theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700 text-[#fdfb45]'
                }`}
              />
            </div>

            {/* Segregation of Duties */}
            <div className={`p-4 rounded border flex items-center justify-between gap-4 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div>
                <div className="font-bold">{lang === 'ar' ? 'فرض فصل المهام الصارم (Segregation of Duties):' : 'Enforce Strict Segregation of Duties:'}</div>
                <div className="text-[11px] opacity-75">{lang === 'ar' ? 'منع الموظف من اعتماد أو ترحيل القيود والفواتير التي أنشأها بنفسه' : 'Document creator cannot approve or post their own transactions'}</div>
              </div>
              <input
                type="checkbox"
                checked={controlsState.enforceSegregationOfDuties}
                onChange={(e) => setControlsState({ ...controlsState, enforceSegregationOfDuties: e.target.checked })}
                className="w-5 h-5 rounded text-[#147d9f] cursor-pointer"
              />
            </div>

            {/* Block Locked Period Postings */}
            <div className={`p-4 rounded border flex items-center justify-between gap-4 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div>
                <div className="font-bold">{lang === 'ar' ? 'حظر الترحيل نهائياً في الفترات المالية المقفلة:' : 'Block Postings to Locked Accounting Periods:'}</div>
                <div className="text-[11px] opacity-75">{lang === 'ar' ? 'رفض أي معاملة تقع في شهر مالي تم إقفاله إلا بإعادة فتح رسمي' : 'Strictly prevent retroactive ledger tampering in locked periods'}</div>
              </div>
              <input
                type="checkbox"
                checked={controlsState.blockLockedPeriodPostings}
                onChange={(e) => setControlsState({ ...controlsState, blockLockedPeriodPostings: e.target.checked })}
                className="w-5 h-5 rounded text-[#147d9f] cursor-pointer"
              />
            </div>

            {/* Forbid Direct Posted Edits */}
            <div className={`p-4 rounded border flex items-center justify-between gap-4 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div>
                <div className="font-bold">{lang === 'ar' ? 'حظر التعديل المباشر بعد الترحيل (Immutability):' : 'Forbid In-place Edits on Posted Records:'}</div>
                <div className="text-[11px] opacity-75">{lang === 'ar' ? 'التصحيحات المحاسبية تتم حصراً عبر سندات العكس وقيود التسوية' : 'Revisions permitted solely through audited reversal journals'}</div>
              </div>
              <input
                type="checkbox"
                checked={controlsState.forbidDirectPostedEdits}
                onChange={(e) => setControlsState({ ...controlsState, forbidDirectPostedEdits: e.target.checked })}
                className="w-5 h-5 rounded text-[#147d9f] cursor-pointer"
              />
            </div>

            {/* Auto-depreciation on close */}
            <div className={`p-4 rounded border flex items-center justify-between gap-4 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div>
                <div className="font-bold">{lang === 'ar' ? 'إجراء الإهلاك الآلي لأسطول النيل عند إقفال الشهر:' : 'Auto-calculate Fleet Depreciation on Period Close:'}</div>
                <div className="text-[11px] opacity-75">{lang === 'ar' ? 'توليد قيود إهلاك الكاياك ومعدات الأمان تلقائياً عند إغلاق الشهر' : 'Post automatic monthly depreciation for all active fixed assets'}</div>
              </div>
              <input
                type="checkbox"
                checked={controlsState.autoDepreciationOnClose}
                onChange={(e) => setControlsState({ ...controlsState, autoDepreciationOnClose: e.target.checked })}
                className="w-5 h-5 rounded text-[#147d9f] cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              onClick={handleSaveGovernance}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm"
            >
              <Save className="w-4 h-4 text-[#0c1226]" />
              <span>{lang === 'ar' ? 'حفظ وتطبيق سياسات الرقابة' : 'Save & Enforce Policies'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: TOUR TYPES EDITOR */}
      {activeTab === 'tour_types' && (
        <div className={`p-6 rounded-lg border space-y-5 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#147d9f] flex items-center gap-2">
                <Ship className="w-4 h-4 text-[#fdfb45]" />
                <span>{lang === 'ar' ? 'تعديل مسميات أنواع الرحلات النيلية' : 'Nile Tour Types Master Editor'}</span>
              </h2>
              <p className="text-xs opacity-75">
                {lang === 'ar'
                  ? 'يمكنك تعديل الاسم بالعربية والإنجليزية ومدة الجولة وإضافة أنواع رحلات جديدة'
                  : 'Customize English and Arabic labels, durations, and add new Nile tour types.'}
              </p>
            </div>

            <button
              onClick={() => setNewTourTypeModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded"
            >
              <Plus className="w-4 h-4 text-[#0c1226]" />
              <span>{lang === 'ar' ? 'إضافة نوع رحلة جديد' : 'Add New Tour Type'}</span>
            </button>
          </div>

          <div className="border rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase font-semibold border-b ${
                theme === 'light' ? 'bg-slate-100 text-slate-700' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'}</th>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}</th>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'المدة الزمنية' : 'Duration'}</th>
                  <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                theme === 'light' ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-200'
              }`}>
                {tourTypesList.map((tt, idx) => (
                  <tr key={tt.id} className={theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'}>
                    <td className="py-2.5 px-4">
                      {editingTourType?.id === tt.id ? (
                        <input
                          type="text"
                          value={editingTourType.nameEn}
                          onChange={(e) => setEditingTourType({ ...editingTourType, nameEn: e.target.value })}
                          className={`w-full border rounded p-1 text-xs ${
                            theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                          }`}
                        />
                      ) : (
                        <span className="font-semibold">{tt.nameEn}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4">
                      {editingTourType?.id === tt.id ? (
                        <input
                          type="text"
                          value={editingTourType.nameAr}
                          onChange={(e) => setEditingTourType({ ...editingTourType, nameAr: e.target.value })}
                          className={`w-full border rounded p-1 text-xs ${
                            theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                          }`}
                        />
                      ) : (
                        <span>{tt.nameAr}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4">
                      {editingTourType?.id === tt.id ? (
                        <input
                          type="text"
                          value={editingTourType.duration}
                          onChange={(e) => setEditingTourType({ ...editingTourType, duration: e.target.value })}
                          className={`w-full border rounded p-1 text-xs font-mono ${
                            theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                          }`}
                        />
                      ) : (
                        <span className="font-mono opacity-80">{tt.duration}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      {editingTourType?.id === tt.id ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              const updated = tourTypesList.map((item) => (item.id === tt.id ? editingTourType : item));
                              setTourTypesList(updated);
                              setEditingTourType(null);
                            }}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                          >
                            {lang === 'ar' ? 'تطبيق' : 'Apply'}
                          </button>
                          <button
                            onClick={() => setEditingTourType(null)}
                            className="px-2 py-1 bg-slate-700 text-white rounded text-[11px]"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingTourType({ ...tt })}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#147d9f] bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 mx-auto"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{lang === 'ar' ? 'تعديل المسمى' : 'Edit Name'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveTourTypes}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm"
            >
              <Save className="w-4 h-4 text-[#0c1226]" />
              <span>{lang === 'ar' ? 'حفظ التعديلات في النظام' : 'Save Changes to Database'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CAPTAINS & COMMISSIONS */}
      {activeTab === 'captains' && (
        <div className={`p-6 rounded-lg border space-y-5 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#147d9f] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#fdfb45]" />
                <span>{lang === 'ar' ? 'تعديل بيانات وأسماء كباتن النيل والعمولات' : 'Captains & Tour Commissions Master'}</span>
              </h2>
              <p className="text-xs opacity-75">
                {lang === 'ar'
                  ? 'تعديل أسماء الكباتن، أرقام الهواتف، ونسب العمولة المباشرة لكل رحلة'
                  : 'Manage captain profiles, contact numbers, and commission percentages.'}
              </p>
            </div>

            <button
              onClick={() => setNewCaptainModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded"
            >
              <Plus className="w-4 h-4 text-[#0c1226]" />
              <span>{lang === 'ar' ? 'إضافة كابتن جديد' : 'Add New Captain'}</span>
            </button>
          </div>

          <div className="border rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase font-semibold border-b ${
                theme === 'light' ? 'bg-slate-100 text-slate-700' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'اسم الكابتن' : 'Captain Name'}</th>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</th>
                  <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'نسبة العمولة (%)' : 'Commission %'}</th>
                  <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                theme === 'light' ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-200'
              }`}>
                {captainsList.map((cpt) => (
                  <tr key={cpt.id} className={theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'}>
                    <td className="py-2.5 px-4">
                      {editingCaptain?.id === cpt.id ? (
                        <input
                          type="text"
                          value={editingCaptain.name}
                          onChange={(e) => setEditingCaptain({ ...editingCaptain, name: e.target.value })}
                          className={`w-full border rounded p-1 text-xs font-bold ${
                            theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                          }`}
                        />
                      ) : (
                        <span className="font-bold">{cpt.name}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 font-mono">
                      {editingCaptain?.id === cpt.id ? (
                        <input
                          type="text"
                          value={editingCaptain.phone}
                          onChange={(e) => setEditingCaptain({ ...editingCaptain, phone: e.target.value })}
                          className={`w-full border rounded p-1 text-xs font-mono ${
                            theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                          }`}
                        />
                      ) : (
                        <span>{cpt.phone}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-500">
                      {editingCaptain?.id === cpt.id ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editingCaptain.commissionRate}
                          onChange={(e) => setEditingCaptain({ ...editingCaptain, commissionRate: Number(e.target.value) })}
                          className={`w-20 border rounded p-1 text-xs font-mono text-center mx-auto ${
                            theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                          }`}
                        />
                      ) : (
                        <span>{cpt.commissionRate}%</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <span className="text-emerald-500 font-semibold text-[11px]">Active</span>
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      {editingCaptain?.id === cpt.id ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              const updated = captainsList.map((item) => (item.id === cpt.id ? editingCaptain : item));
                              setCaptainsList(updated);
                              setEditingCaptain(null);
                            }}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                          >
                            {lang === 'ar' ? 'تطبيق' : 'Apply'}
                          </button>
                          <button
                            onClick={() => setEditingCaptain(null)}
                            className="px-2 py-1 bg-slate-700 text-white rounded text-[11px]"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingCaptain({ ...cpt })}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#147d9f] bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 mx-auto"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{lang === 'ar' ? 'تعديل البيانات' : 'Edit Captain'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveCaptains}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm"
            >
              <Save className="w-4 h-4 text-[#0c1226]" />
              <span>{lang === 'ar' ? 'حفظ بيانات الكباتن' : 'Save Captains to Database'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SERVICES & PRICING */}
      {activeTab === 'services' && (
        <div className={`p-6 rounded-lg border space-y-5 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
        }`}>
          <div>
            <h2 className="text-base font-bold text-[#147d9f] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#fdfb45]" />
              <span>{lang === 'ar' ? 'تعديل مسميات الخدمات النيلية والأسعار الافتراضية' : 'Nile Tour Services & Standard Pricing'}</span>
            </h2>
            <p className="text-xs opacity-75">
              {lang === 'ar'
                ? 'تعديل أسعار الكاياك الفردي والمزدوج وألواح التجديف SUP والدراجات المائية وحساب الإيراد المرتبط'
                : 'Modify default rental and tour pricing and linked Chart of Accounts revenue codes.'}
            </p>
          </div>

          <div className="border rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase font-semibold border-b ${
                theme === 'light' ? 'bg-slate-100 text-slate-700' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'الخدمة (En)' : 'Service (En)'}</th>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'الخدمة (Ar)' : 'Service (Ar)'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'ar' ? 'السعر الافتراضي (ج.م)' : 'Default Price (EGP)'}</th>
                  <th className="py-2.5 px-4">{lang === 'ar' ? 'حساب الإيراد المرتبط' : 'Revenue Account'}</th>
                  <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                theme === 'light' ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-200'
              }`}>
                {servicesList.map((srv) => (
                  <tr key={srv.id} className={theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'}>
                    <td className="py-2.5 px-4">
                      {editingService?.id === srv.id ? (
                        <input
                          type="text"
                          value={editingService.nameEn}
                          onChange={(e) => setEditingService({ ...editingService, nameEn: e.target.value })}
                          className={`w-full border rounded p-1 text-xs ${
                            theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                          }`}
                        />
                      ) : (
                        <span className="font-bold">{srv.nameEn}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4">
                      {editingService?.id === srv.id ? (
                        <input
                          type="text"
                          value={editingService.nameAr}
                          onChange={(e) => setEditingService({ ...editingService, nameAr: e.target.value })}
                          className={`w-full border rounded p-1 text-xs ${
                            theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                          }`}
                        />
                      ) : (
                        <span>{srv.nameAr}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#fdfb45]">
                      {editingService?.id === srv.id ? (
                        <input
                          type="number"
                          min="0"
                          value={editingService.defaultPrice}
                          onChange={(e) => setEditingService({ ...editingService, defaultPrice: Number(e.target.value) })}
                          className={`w-28 border rounded p-1 text-xs font-mono text-right ${
                            theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
                          }`}
                        />
                      ) : (
                        <span>{formatMoney(srv.defaultPrice)}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 font-mono text-slate-400">
                      {srv.revenueAccountCode}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      {editingService?.id === srv.id ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              const updated = servicesList.map((item) => (item.id === srv.id ? editingService : item));
                              setServicesList(updated);
                              setEditingService(null);
                            }}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                          >
                            {lang === 'ar' ? 'تطبيق' : 'Apply'}
                          </button>
                          <button
                            onClick={() => setEditingService(null)}
                            className="px-2 py-1 bg-slate-700 text-white rounded text-[11px]"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingService({ ...srv })}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#147d9f] bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 mx-auto"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{lang === 'ar' ? 'تعديل السعر والمسمى' : 'Edit'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveServices}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-sm"
            >
              <Save className="w-4 h-4 text-[#0c1226]" />
              <span>{lang === 'ar' ? 'حفظ الأسعار والخدمات' : 'Save Services'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: USER ROLES & PERMISSIONS MATRIX */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* User accounts list */}
          <div className={`p-6 rounded-lg border space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#147d9f] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#fdfb45]" />
                  <span>{lang === 'ar' ? 'تعديل وتعيين أدوار المستخدمين' : 'User Roles & Responsibility Assignment'}</span>
                </h2>
                <p className="text-xs opacity-75">
                  {lang === 'ar'
                    ? 'تغيير وتعيين الأدوار الوظيفية لمستخدمي النظام (Super Admin, CFO, Chief Accountant, Accountant, Cashier)'
                    : 'Modify active administrative and operational roles with immediate permission updates.'}
                </p>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => setIsUserModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#0c1226]" />
                  <span>{lang === 'ar' ? 'إضافة مستخدم' : 'Add User'}</span>
                </button>
              )}
            </div>

            <div className="border rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase font-semibold border-b ${
                  theme === 'light' ? 'bg-slate-100 text-slate-700' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  <tr>
                    <th className="py-2.5 px-4">{lang === 'ar' ? 'اسم المستخدم' : 'User Name'}</th>
                    <th className="py-2.5 px-4">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                    <th className="py-2.5 px-4">{lang === 'ar' ? 'الدور الحالي' : 'Current Role'}</th>
                    <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'تغيير الدور' : 'Change Role'}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  theme === 'light' ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-200'
                }`}>
                  {users.map((u) => (
                    <tr key={u.id} className={theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'}>
                      <td className="py-2.5 px-4 font-bold">{u.name}</td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono">{u.email}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-[#147d9f]">{u.role}</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-emerald-500 font-bold text-[11px]">ACTIVE</span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setChangingUser({ id: u.id, name: u.name, currentRole: u.role });
                            setSelectedNewRole(u.role);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#147d9f] bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 mx-auto"
                        >
                          {lang === 'ar' ? 'تعديل الدور' : 'Change Role'}
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              setResettingUser({ id: u.id, name: u.name });
                              setResetPasswordValue('');
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#147d9f] bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 mx-auto ms-2"
                          >
                            {lang === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Permissions Matrix */}
          <div className={`p-6 rounded-lg border space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
          }`}>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'ar' ? 'مصفوفة الصلاحيات حسب الدور الوظيفي' : 'Role-Based Permissions Matrix'}</span>
            </h3>

            <div className="border rounded overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase font-semibold border-b ${
                  theme === 'light' ? 'bg-slate-100 text-slate-700' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  <tr>
                    <th className="py-2 px-3">{lang === 'ar' ? 'الصلاحية / الوظيفة' : 'Permission'}</th>
                    {allRoles.map((r) => (
                      <th key={r} className="py-2 px-2 text-center text-[10px]">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  theme === 'light' ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-200'
                }`}>
                  {rolePermissionsMatrix.map((item, idx) => (
                    <tr key={idx} className={theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-900/30'}>
                      <td className="py-2 px-3 font-medium">{item.permission}</td>
                      {allRoles.map((r) => (
                        <td key={r} className="py-2 px-2 text-center">
                          {item.roles.includes(r) ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-slate-600">·</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Custom Roles & Permissions Builder */}
          <div className={`p-6 rounded-lg border space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0a0f21] border-slate-800/80'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#147d9f] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#fdfb45]" />
                  <span>{lang === 'ar' ? 'إدارة وتخصيص الأدوار والصلاحيات (Custom Roles)' : 'Custom Roles & Granular Permissions'}</span>
                </h3>
                <p className="text-xs opacity-75">
                  {lang === 'ar'
                    ? 'إمكانية إضافة أدوار وظيفية جديدة وتعيين الصلاحيات المخصصة بدقة (كالحجز، الفواتير، الكتالوج، وإقفال الفترات)'
                    : 'Create and customize custom roles with granular permission toggles.'}
                </p>
              </div>

              <button
                onClick={() => setIsCustomRoleModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#0c1226]" />
                <span>{lang === 'ar' ? 'إضافة دور وظيفي جديد' : 'New Custom Role'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customRoles.map((role) => (
                <div
                  key={role.id}
                  className={`p-3.5 rounded-lg border flex flex-col justify-between ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#147d9f]">{role.name}</span>
                      {role.isSystem ? (
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800/40 px-1.5 py-0.5 rounded">
                          System
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">{role.nameAr}</div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{role.description}</p>

                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {role.permissions.map((p) => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/50 text-sky-300 border border-sky-800/50 font-mono">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  {!role.isSystem && (
                    <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={async () => {
                          if (window.confirm(lang === 'ar' ? `هل أنت متأكد من حذف الدور "${role.name}"؟` : `Delete role "${role.name}"?`)) {
                            await deleteCustomRole(role.id);
                          }
                        }}
                        className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{lang === 'ar' ? 'حذف الدور' : 'Delete Role'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD TOUR TYPE MODAL */}
      {newTourTypeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-md rounded-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Ship className="w-4 h-4 text-[#fdfb45]" />
                <span>{lang === 'ar' ? 'إضافة نوع رحلة نيلية جديد' : 'Add New Tour Type'}</span>
              </h3>
              <button onClick={() => setNewTourTypeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewTourType} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Moonlight Nile Stargazing"
                  value={newTourType.nameEn}
                  onChange={(e) => setNewTourType({ ...newTourType, nameEn: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. جولة ضوء القمر ورصد النجوم"
                  value={newTourType.nameAr}
                  onChange={(e) => setNewTourType({ ...newTourType, nameAr: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'مدة الجولة' : 'Duration'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2.5 Hours"
                  value={newTourType.duration}
                  onChange={(e) => setNewTourType({ ...newTourType, duration: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewTourTypeModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded"
                >
                  {lang === 'ar' ? 'إضافة الرحلة' : 'Add Tour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CAPTAIN MODAL */}
      {newCaptainModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-md rounded-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#fdfb45]" />
                <span>{lang === 'ar' ? 'إضافة كابتن نيل جديد' : 'Add New Nile Captain'}</span>
              </h3>
              <button onClick={() => setNewCaptainModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewCaptain} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم الكابتن' : 'Captain Name'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Captain Ashraf"
                  value={newCaptain.name}
                  onChange={(e) => setNewCaptain({ ...newCaptain, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                <input
                  type="text"
                  required
                  placeholder="+20 100 000 0000"
                  value={newCaptain.phone}
                  onChange={(e) => setNewCaptain({ ...newCaptain, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'نسبة العمولة (%)' : 'Commission Rate (%)'}</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={newCaptain.commissionRate}
                  onChange={(e) => setNewCaptain({ ...newCaptain, commissionRate: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono text-center font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewCaptainModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded"
                >
                  {lang === 'ar' ? 'حفظ الكابتن' : 'Save Captain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE USER ROLE MODAL */}
      {changingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-sm rounded-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#fdfb45]" />
                <span>{lang === 'ar' ? 'تغيير دور المستخدم' : 'Change User Role'}</span>
              </h3>
              <button onClick={() => setChangingUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              {lang === 'ar' ? 'تعديل الصلاحيات والدور لـ:' : 'Modify role for:'} <strong className="text-white">{changingUser.name}</strong>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-400">{lang === 'ar' ? 'اختر الدور الجديد:' : 'Select New Role:'}</label>
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value as UserRole)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-semibold"
              >
                {allRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setChangingUser(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmRoleChange}
                className="px-4 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded"
              >
                {lang === 'ar' ? 'تأكيد تغيير الدور' : 'Confirm Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD USER MODAL (Super Admin) */}
      {isUserModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-sm rounded-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#fdfb45]" />
                <span>{lang === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}</span>
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-400">{lang === 'ar' ? 'الاسم الكامل:' : 'Full Name:'}</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-400">{lang === 'ar' ? 'اسم المستخدم:' : 'Username:'}</label>
                <input
                  type="text"
                  autoCapitalize="none"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-400">{lang === 'ar' ? 'البريد الإلكتروني:' : 'Email:'}</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-slate-400">{lang === 'ar' ? 'الدور:' : 'Role:'}</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-semibold"
                >
                  {allRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-slate-400">{lang === 'ar' ? 'كلمة المرور:' : 'Password:'}</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newUserForm.name.trim() || !newUserForm.username.trim() || !newUserForm.password}
                className="px-4 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded disabled:opacity-50"
              >
                {lang === 'ar' ? 'إنشاء المستخدم' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL (Super Admin) */}
      {resettingUser && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0a0f21] border border-slate-700 w-full max-w-sm rounded-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#fdfb45]" />
                <span>{lang === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}</span>
              </h3>
              <button onClick={() => setResettingUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              {lang === 'ar' ? 'كلمة مرور جديدة لـ:' : 'Set a new password for:'} <strong className="text-white">{resettingUser.name}</strong>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-400">{lang === 'ar' ? 'كلمة المرور الجديدة:' : 'New Password:'}</label>
              <input
                type="password"
                autoComplete="new-password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setResettingUser(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmPasswordReset}
                disabled={!resetPasswordValue}
                className="px-4 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded disabled:opacity-50"
              >
                {lang === 'ar' ? 'تأكيد إعادة التعيين' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM ROLE MODAL */}
      {isCustomRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border w-full max-w-lg rounded-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0a0f21] border-slate-700'
          }`}>
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <ShieldCheck className="w-4 h-4 text-[#147d9f]" />
                <span>{lang === 'ar' ? 'إضافة دور وظيفي وتخصيص الصلاحيات' : 'Create Custom Role & Assign Permissions'}</span>
              </h3>
              <button onClick={() => setIsCustomRoleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await createCustomRole(newRoleForm);
                  setIsCustomRoleModalOpen(false);
                  setNewRoleForm({
                    name: '',
                    nameAr: '',
                    description: '',
                    permissions: ['bookings:manage', 'invoices:create'],
                  });
                } catch (err: any) {
                  alert(`Role creation error: ${err?.message}`);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم الدور بالإنجليزي' : 'Role Name (EN)'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Booking Coordinator"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                    className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                      theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'اسم الدور بالعربي' : 'Role Name (AR)'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. منسق الحجوزات وخدمة العملاء"
                    value={newRoleForm.nameAr}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, nameAr: e.target.value })}
                    className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                      theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">{lang === 'ar' ? 'الوصف والمسؤوليات' : 'Description & Scope'}</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Manage guest reservations, apply promo discounts, and prepare draft invoices."
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  className={`w-full rounded p-2 border focus:outline-none focus:border-[#147d9f] ${
                    theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-2 font-bold">{lang === 'ar' ? 'الصلاحيات الممنوحة لهذا الدور:' : 'Grant Permissions:'}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded border border-slate-800 bg-slate-900/60">
                  {[
                    { id: 'bookings:manage', label: 'إدارة وحجز الرحلات (Bookings)' },
                    { id: 'invoices:create', label: 'إنشاء فواتير المبيعات (Create Invoices)' },
                    { id: 'invoices:approve', label: 'اعتماد الفواتير (Approve Invoices)' },
                    { id: 'receipts:create', label: 'تحصيل سندات القبض (Receipts)' },
                    { id: 'expenses:create', label: 'تسجيل سندات الصرف (Expenses)' },
                    { id: 'catalog:manage', label: 'إدارة كتالوج الرحلات والأنشطة (Catalog)' },
                    { id: 'pricing:approve', label: 'اعتماد وجدولة الأسعار (Pricing)' },
                    { id: 'journals:post', label: 'ترحيل قيود اليومية (Post Journals)' },
                    { id: 'finance:lock_period', label: 'إقفال الفترات المالية (Period Lock)' },
                    { id: 'reports:full', label: 'القوائم والتقارير المالية (Reports)' },
                    { id: 'audit:read', label: 'سجل التدقيق والأمان (Audit Trail)' },
                  ].map((perm) => {
                    const isChecked = newRoleForm.permissions.includes(perm.id);
                    return (
                      <label key={perm.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/80 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewRoleForm({ ...newRoleForm, permissions: [...newRoleForm.permissions, perm.id] });
                            } else {
                              setNewRoleForm({ ...newRoleForm, permissions: newRoleForm.permissions.filter((p) => p !== perm.id) });
                            }
                          }}
                          className="rounded text-[#147d9f] focus:ring-0"
                        />
                        <span className={isChecked ? 'text-white font-medium' : 'text-slate-400'}>{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCustomRoleModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-xs"
                >
                  {lang === 'ar' ? 'إنشاء الدور' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
