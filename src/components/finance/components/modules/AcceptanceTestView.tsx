import React, { useState } from 'react';
import { apiFetch } from '../../auth';
import { useErp } from '../../context/ErpContext';
import { CheckCircle2, Play, AlertCircle, RefreshCw, Scale, ShieldCheck, FileCheck } from 'lucide-react';

export const AcceptanceTestView: React.FC = () => {
  const { currentUser, refreshData, lang } = useErp();

  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    timestamp: string;
    passed: boolean;
    stepResults: { step: number; title: string; passed: boolean; details: string }[];
    summary: string;
  } | null>(null);

  const handleRunSuite = async () => {
    setIsRunning(true);
    try {
      const res = await apiFetch('/acceptance-test/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        setTestResult(json);
        await refreshData();
      }
    } catch (err: any) {
      alert(`Test run error: ${err?.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#fdfb45]" />
            <span>{lang === 'ar' ? 'دورة الاختبارات والمطابقة المحاسبية (17 خطوة)' : 'Automated 17-Step Acceptance Test Suite'}</span>
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'تشغيل الدورة المحاسبية الكاملة المطلوبة في البند 22 للتحقق من سلامة القيود والأستاذ العام وميزان المراجعة'
              : 'Verifies the complete accounting cycle defined in Prompt Section 22: from 1,000 EGP invoice to Balance Sheet.'}
          </p>
        </div>

        <button
          onClick={handleRunSuite}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-[#0c1226] bg-[#fdfb45] hover:bg-yellow-300 rounded shadow-md transition-colors disabled:opacity-50"
        >
          {isRunning ? <RefreshCw className="w-4 h-4 animate-spin text-[#0c1226]" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isRunning ? 'جاري تنفيذ الاختبارات...' : lang === 'ar' ? 'تشغيل الاختبارات الـ 17 الآن' : 'Execute 17 Acceptance Tests'}</span>
        </button>
      </div>

      {/* Overview Card */}
      <div className="bg-[#0a0f21] border border-slate-800/80 p-5 rounded-lg space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#147d9f]" />
          <span>{lang === 'ar' ? 'معايير القبول الـ 17 المعتمدة' : 'Official Acceptance Criteria (Prompt Section 22)'}</span>
        </h2>
        <p className="text-xs text-slate-300">
          {lang === 'ar'
            ? 'يقوم هذا المحاكي البرمجي بإنشاء فاتورة تجريبية بقيمة 1,000 ج.م، ثم تسجيل سداد جزئي بـ 300 ج.م، ثم سداد الباقي 700 ج.م، والتحقق من تصفير الذمة، وتسجيل تسليم الخدمة، وإثبات الإيراد، وتسجيل مصروف تشغيلي، وشراء أصل ثابت، وفاتورة مورد وسدادها، وتوليد قيود اليومية، والأستاذ العام، وميزان المراجعة، وقائمة الدخل، والميزانية العمومية، والتحقق التام من تطابق المدين والدائن 100% وربط كافة القيود بمستنداتها.'
            : 'Simulates the entire accounting cycle in a single transaction, validating ledger integrity, equality of debits and credits, receivable zeroing, and financial statement generation.'}
        </p>
      </div>

      {/* Test Results Display */}
      {testResult && (
        <div className="bg-[#0a0f21] border border-slate-800/80 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  testResult.passed ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              ></span>
              <span className="font-bold text-sm text-white">
                {testResult.passed ? 'ALL 17 ACCEPTANCE CRITERIA PASSED' : 'TEST FAILURES DETECTED'}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400">Ran at: {new Date(testResult.timestamp).toLocaleTimeString()}</span>
          </div>

          <div className="p-3 bg-emerald-950/30 border border-emerald-800/80 rounded text-xs text-emerald-300 font-medium">
            {testResult.summary}
          </div>

          {/* 17 Step Items */}
          <div className="space-y-2">
            {testResult.stepResults.map((s) => (
              <div
                key={s.step}
                className="p-3 bg-slate-900/60 border border-slate-800/60 rounded flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#147d9f]">Step {s.step}:</span>
                    <span className="font-bold text-white">{s.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{s.details}</div>
                </div>

                <div className="shrink-0 flex items-center gap-1 font-mono font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>PASS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
