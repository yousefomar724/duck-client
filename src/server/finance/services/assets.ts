import type {
  AssetCategoryItem,
  AssetMovementReportItem,
  DepreciationRunItem,
  DepreciationRunRecord,
  FixedAsset,
  JournalEntry,
  JournalLine,
} from '@/lib/finance/erp-types';
import type { FixedAssetDoc } from '../models/assets';
import { logAudit } from './audit';
import { nextPlainNumber } from './counters';
import { badRequest, notFound, so, type FinCtx } from './context';
import { createJournalEntry } from './journals';
import { cleanUpdates, genId, lineId, nowIso, num, round2, toOut, toOutList, today, ymd } from './util';

// --- Asset categories -------------------------------------------------------

export async function getAssetCategories(ctx: FinCtx): Promise<AssetCategoryItem[]> {
  const rows = await ctx.m.AssetCategory.find().sort({ createdAt: 1, _id: 1 }).lean().session(ctx.session);
  return toOutList<AssetCategoryItem>(rows);
}

export async function createAssetCategory(ctx: FinCtx, data: Record<string, unknown>): Promise<AssetCategoryItem> {
  const str = (k: string, fallback: string) => (typeof data[k] === 'string' && data[k] ? String(data[k]) : fallback);
  const code = typeof data.code === 'string' && data.code ? data.code : await nextPlainNumber(ctx, 'AC', 2);
  const [cat] = await ctx.m.AssetCategory.create(
    [
      {
        code,
        nameEn: str('nameEn', 'New Equipment Category'),
        nameAr: str('nameAr', 'تصنيف أصول جديد'),
        defaultUsefulLifeMonths: num(data.defaultUsefulLifeMonths) || 36,
        defaultDepreciationMethod: data.defaultDepreciationMethod === 'Declining Balance' ? 'Declining Balance' : 'Straight Line',
        assetAccountCode: str('assetAccountCode', '1211'),
        accumulatedDepAccountCode: str('accumulatedDepAccountCode', '1220'),
        depreciationExpenseAccountCode: str('depreciationExpenseAccountCode', '5500'),
        active: true,
      },
    ],
    so(ctx),
  );
  await logAudit(ctx, 'CREATE_ASSET_CATEGORY', 'AssetCategory', cat._id, `Created asset category ${cat.nameEn}`);
  return toOut<AssetCategoryItem>(cat);
}

export async function updateAssetCategory(ctx: FinCtx, id: string, updates: unknown): Promise<AssetCategoryItem> {
  const cat = await ctx.m.AssetCategory.findById(id).session(ctx.session);
  if (!cat) throw notFound(`Asset category ${id} not found.`);
  cat.set(cleanUpdates(updates));
  await cat.save(so(ctx));
  await logAudit(ctx, 'UPDATE_ASSET_CATEGORY', 'AssetCategory', id, `Updated asset category ${cat.nameEn}`);
  return toOut<AssetCategoryItem>(cat);
}

// --- Fixed assets -----------------------------------------------------------

export async function getFixedAssets(ctx: FinCtx): Promise<FixedAsset[]> {
  const rows = await ctx.m.FixedAsset.find().sort({ createdAt: -1, _id: -1 }).lean().session(ctx.session);
  return toOutList<FixedAsset>(rows);
}

async function findAsset(ctx: FinCtx, id: string) {
  const asset = await ctx.m.FixedAsset.findOne({ $or: [{ _id: id }, { assetId: id }] }).session(ctx.session);
  if (!asset) throw notFound(`Asset ${id} not found.`);
  return asset;
}

const costOf = (a: Pick<FixedAsset, 'totalAcquisitionCost' | 'acquisitionCost'>) => a.totalAcquisitionCost || a.acquisitionCost;

/**
 * Registers an asset. A new purchase (not an opening-balance asset) also
 * posts Dr fixed-asset account / Cr the paying account.
 */
export async function createFixedAsset(ctx: FinCtx, data: Record<string, unknown>): Promise<FixedAsset> {
  const str = (k: string) => (typeof data[k] === 'string' && data[k] ? String(data[k]) : undefined);
  const quantity = Math.max(1, num(data.quantity) || 1);
  const unitCost = Math.max(0, num(data.unitCost));
  const totalAcquisitionCost = round2(
    unitCost > 0 ? unitCost * quantity : Math.max(0, num(data.totalAcquisitionCost || data.acquisitionCost)),
  );
  const residualValue = Math.max(0, num(data.residualValue));
  const usefulLifeMonths = Math.max(1, num(data.usefulLifeMonths) || 36);
  const accumulatedDepreciation = Math.max(0, num(data.accumulatedDepreciation));
  const purchaseDate = str('purchaseDate') ? ymd(data.purchaseDate, 'purchaseDate') : today();
  const assetId = str('assetId') ?? (await nextPlainNumber(ctx, 'AST', 6));
  const custodian = str('custodian') ?? '';
  const id = genId('ast');

  const asset: Omit<FixedAssetDoc, 'createdAt' | 'updatedAt'> = {
    _id: id,
    assetId,
    assetCode: str('assetCode') ?? `DUCK-${assetId}`,
    nameEn: str('nameEn') ?? 'Nile Activity Equipment',
    nameAr: str('nameAr') ?? 'معدة نيلية',
    category: str('category') ?? 'Kayaks',
    trackingMethod: data.trackingMethod === 'Bulk' || data.trackingMethod === 'Individual'
      ? data.trackingMethod
      : quantity > 1 ? 'Bulk' : 'Individual',
    quantity,
    purchaseDate,
    inServiceDate: str('inServiceDate') ?? purchaseDate,
    supplier: str('supplier'),
    supplierId: str('supplierId'),
    invoiceRef: str('invoiceRef'),
    unitCost: unitCost || Math.round(totalAcquisitionCost / quantity),
    totalAcquisitionCost,
    acquisitionCost: totalAcquisitionCost,
    usefulLifeMonths,
    depreciationMethod: (str('depreciationMethod') as FixedAsset['depreciationMethod']) ?? 'Straight Line',
    residualValue,
    accumulatedDepreciation,
    netBookValue: Math.max(0, totalAcquisitionCost - accumulatedDepreciation),
    assetAccountCode: str('assetAccountCode') ?? '1211',
    depreciationAccountCode: str('depreciationAccountCode') ?? '5500',
    accumulatedDepreciationAccountCode: str('accumulatedDepreciationAccountCode') ?? '1220',
    status: 'Active',
    location: str('location') ?? 'Elephantine Island Dock',
    costCenter: str('costCenter') ?? 'CC-ELPH',
    custodian,
    responsibleEmployee: str('responsibleEmployee') ?? (custodian || undefined),
    serialNumber: str('serialNumber'),
    notes: str('notes') ?? '',
    attachments: Array.isArray(data.attachments) ? data.attachments.map(String) : [],
    isOpeningBalance: Boolean(data.isOpeningBalance),
  };

  if (!asset.isOpeningBalance && totalAcquisitionCost > 0) {
    const paymentCode = str('paymentAccountCode') ?? '1112';
    const exists = await ctx.m.Account.exists({ code: paymentCode }).session(ctx.session);
    const journal = await createJournalEntry(ctx, {
      journalNumber: `JV-AST-${assetId}`,
      date: purchaseDate,
      sourceDocument: 'AssetPurchase',
      sourceDocumentNumber: asset.invoiceRef || assetId,
      sourceId: id,
      description: `Capitalization of Fixed Asset: ${asset.nameEn} (Qty: ${quantity})`,
      lines: [
        {
          id: lineId('jl-ap-dr', 0),
          accountCode: asset.assetAccountCode,
          debit: totalAcquisitionCost,
          credit: 0,
          description: `Acquisition of ${asset.nameEn}`,
          costCenter: asset.costCenter,
        },
        {
          id: lineId('jl-ap-cr', 1),
          accountCode: exists ? paymentCode : '1111',
          debit: 0,
          credit: totalAcquisitionCost,
          description: `Disbursement for ${asset.nameEn}${asset.supplier ? ` to ${asset.supplier}` : ''}`,
          costCenter: asset.costCenter,
        },
      ],
      approvedBy: ctx.actor.name,
      status: 'posted',
    });
    asset.journalEntryId = journal.id;
  }

  const [doc] = await ctx.m.FixedAsset.create([asset], so(ctx));
  await logAudit(
    ctx,
    'CREATE_FIXED_ASSET',
    'FixedAsset',
    assetId,
    `Created asset ${assetId} - ${asset.nameEn} (${quantity} units, Total: ${totalAcquisitionCost} EGP, Method: ${asset.trackingMethod})`,
  );
  return toOut<FixedAsset>(doc);
}

export async function updateFixedAsset(ctx: FinCtx, id: string, updates: unknown): Promise<FixedAsset> {
  const asset = await findAsset(ctx, id);
  if (asset.status === 'Disposed' || asset.status === 'Sold') {
    throw badRequest(`Asset ${asset.nameEn} is ${asset.status} and cannot be modified.`);
  }
  const patch = cleanUpdates<FixedAssetDoc>(updates, ['journalEntryId', 'disposalDetails']);
  if (patch.status === 'Disposed' || patch.status === 'Sold') {
    throw badRequest('Use the dispose action to retire or sell an asset.');
  }
  asset.set(patch);
  if (patch.quantity || patch.unitCost) {
    asset.totalAcquisitionCost = round2((asset.quantity || 1) * (asset.unitCost || 0));
    asset.acquisitionCost = asset.totalAcquisitionCost;
  }
  asset.netBookValue = Math.max(0, costOf(asset) - asset.accumulatedDepreciation);
  await asset.save(so(ctx));
  await logAudit(ctx, 'UPDATE_FIXED_ASSET', 'FixedAsset', asset.assetId, `Updated asset ${asset.assetId} - ${asset.nameEn}`);
  return toOut<FixedAsset>(asset);
}

/** `POST /fixed-assets/:id/depreciate`: one month of depreciation for one asset. */
export async function runMonthlyDepreciation(ctx: FinCtx, assetId: string): Promise<JournalEntry> {
  const asset = await findAsset(ctx, assetId);
  if (asset.netBookValue <= asset.residualValue) {
    throw badRequest(
      `Asset ${asset.nameEn} has already reached its residual value (${asset.residualValue} EGP). No further depreciation.`,
    );
  }
  const monthlyDep = round2((asset.acquisitionCost - asset.residualValue) / (asset.usefulLifeMonths || 36));
  const actualDep = round2(Math.min(monthlyDep, asset.netBookValue - asset.residualValue));

  const journal = await createJournalEntry(ctx, {
    date: today(),
    sourceDocument: 'Depreciation',
    sourceDocumentNumber: asset.assetId,
    sourceId: asset._id,
    description: `Monthly Depreciation for ${asset.assetId} - ${asset.nameEn}`,
    lines: [
      {
        id: lineId('dep-dr', 0),
        accountCode: asset.depreciationAccountCode || '5500',
        debit: actualDep,
        credit: 0,
        description: `Depreciation: ${asset.nameEn}`,
      },
      {
        id: lineId('dep-cr', 1),
        accountCode: asset.accumulatedDepreciationAccountCode || '1220',
        debit: 0,
        credit: actualDep,
        description: `Accumulated Dep for ${asset.nameEn}`,
      },
    ],
    approvedBy: ctx.actor.name,
    status: 'posted',
  });

  asset.accumulatedDepreciation = round2(asset.accumulatedDepreciation + actualDep);
  asset.netBookValue = round2(asset.acquisitionCost - asset.accumulatedDepreciation);
  asset.lastDepreciationDate = journal.date;
  await asset.save(so(ctx));
  await logAudit(
    ctx,
    'RUN_DEPRECIATION',
    'FixedAsset',
    asset.assetId,
    `Posted depreciation of ${actualDep.toFixed(2)} EGP for ${asset.nameEn}`,
  );
  return journal;
}

function validMonth(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw badRequest('A valid year and month are required.');
  }
}

export async function previewMonthlyDepreciation(ctx: FinCtx, year: number, month: number) {
  validMonth(year, month);
  const period = `${year}-${String(month).padStart(2, '0')}`;
  const isAlreadyRun = Boolean(
    await ctx.m.DepreciationRun.exists({ period, status: 'Posted' }).session(ctx.session),
  );
  const assets = await ctx.m.FixedAsset.find({ status: 'Active' }).sort({ createdAt: -1 }).lean().session(ctx.session);
  const eligible = assets.filter((a) => {
    const cost = costOf(a);
    if (a.accumulatedDepreciation >= cost - a.residualValue) return false;
    return a.netBookValue > a.residualValue;
  });

  const items: DepreciationRunItem[] = eligible.map((asset) => {
    const cost = costOf(asset);
    const usefulLifeMonths = asset.usefulLifeMonths || 36;
    let monthlyDep: number;
    if (asset.depreciationMethod === 'Declining Balance' || asset.depreciationMethod === 'Reducing Balance') {
      const annualRate = 2 / (usefulLifeMonths / 12);
      monthlyDep = round2((annualRate / 12) * asset.netBookValue);
    } else {
      monthlyDep = round2((cost - asset.residualValue) / usefulLifeMonths);
    }
    const remaining = Math.max(0, cost - asset.residualValue - asset.accumulatedDepreciation);
    const actual = round2(Math.min(monthlyDep, remaining));
    const newAcc = round2(asset.accumulatedDepreciation + actual);
    return {
      assetId: asset.assetId,
      assetCode: asset.assetCode,
      assetName: asset.nameEn,
      category: asset.category,
      acquisitionCost: cost,
      previousAccumulatedDep: asset.accumulatedDepreciation,
      monthlyDepreciation: actual,
      newAccumulatedDep: newAcc,
      netBookValue: round2(cost - newAcc),
    };
  });

  return {
    period,
    year,
    month,
    isAlreadyRun,
    totalAssetsCount: items.length,
    totalDepreciationAmount: round2(items.reduce((s, i) => s + i.monthlyDepreciation, 0)),
    items,
  };
}

/** One depreciation journal for the whole month; a month can only run once. */
export async function executeMonthlyDepreciation(ctx: FinCtx, year: number, month: number): Promise<DepreciationRunRecord> {
  const preview = await previewMonthlyDepreciation(ctx, year, month);
  const { period } = preview;
  const existing = await ctx.m.DepreciationRun.findOne({ period, status: 'Posted' }).session(ctx.session);
  if (existing) {
    throw badRequest(`Monthly depreciation for ${period} has already been executed and posted (${existing.runNumber}).`);
  }
  if (preview.totalDepreciationAmount <= 0) {
    throw badRequest(`No active depreciable assets eligible for depreciation in period ${period}.`);
  }

  const runNumber = `DEP-RUN-${period}`;
  const date = `${period}-28`;
  const journal = await createJournalEntry(ctx, {
    journalNumber: `JV-DEP-${period}`,
    date,
    sourceDocument: 'Depreciation',
    sourceDocumentNumber: runNumber,
    description: `Monthly Fixed Assets Depreciation Run for ${period} (${preview.items.length} assets)`,
    lines: [
      {
        id: lineId('jl-dep-dr', 0),
        accountCode: '5500',
        debit: preview.totalDepreciationAmount,
        credit: 0,
        description: `Depreciation accrual for period ${period}`,
      },
      {
        id: lineId('jl-dep-cr', 1),
        accountCode: '1220',
        debit: 0,
        credit: preview.totalDepreciationAmount,
        description: `Accumulated depreciation accrual for period ${period}`,
      },
    ],
    approvedBy: ctx.actor.name,
    status: 'posted',
  });

  for (const item of preview.items) {
    await ctx.m.FixedAsset.updateOne(
      { assetId: item.assetId },
      { $set: { accumulatedDepreciation: item.newAccumulatedDep, netBookValue: item.netBookValue, lastDepreciationDate: date } },
      so(ctx),
    );
  }

  const now = nowIso();
  const [run] = await ctx.m.DepreciationRun.create(
    [
      {
        runNumber,
        period,
        year,
        month,
        totalAssetsCount: preview.items.length,
        totalDepreciationAmount: preview.totalDepreciationAmount,
        status: 'Posted',
        journalEntryId: journal.id,
        journalNumber: journal.journalNumber,
        items: preview.items,
        createdBy: ctx.actor.name,
        postedAt: now,
        postedBy: ctx.actor.name,
      },
    ],
    so(ctx),
  );
  await logAudit(
    ctx,
    'EXECUTE_DEPRECIATION',
    'DepreciationRun',
    runNumber,
    `Executed monthly depreciation for ${period}. Posted journal ${journal.journalNumber} (${preview.totalDepreciationAmount.toFixed(2)} EGP across ${preview.items.length} assets)`,
  );
  return toOut<DepreciationRunRecord>(run);
}

export async function getDepreciationRuns(ctx: FinCtx): Promise<DepreciationRunRecord[]> {
  const rows = await ctx.m.DepreciationRun.find().sort({ createdAt: -1, _id: -1 }).lean().session(ctx.session);
  return toOutList<DepreciationRunRecord>(rows);
}

/** Retires or sells an asset: removes cost and accumulated depreciation, books gain (4400) or loss (5600). */
export async function disposeOrSellAsset(ctx: FinCtx, assetId: string, data: Record<string, unknown>): Promise<FixedAsset> {
  const asset = await findAsset(ctx, assetId);
  if (asset.status === 'Disposed' || asset.status === 'Sold') {
    throw badRequest(`Asset ${asset.nameEn} has already been ${asset.status}.`);
  }
  const type = data.type === 'Sale' || data.type === 'Scrap' ? data.type : 'Disposal';
  const date = typeof data.date === 'string' && data.date ? ymd(data.date) : today();
  const saleProceeds = round2(Math.max(0, num(data.saleProceeds)));
  const costToRemove = costOf(asset);
  const accDepToRemove = asset.accumulatedDepreciation;
  const gainLoss = round2(saleProceeds - asset.netBookValue);
  const receivingCode = typeof data.receivingAccountCode === 'string' && data.receivingAccountCode ? data.receivingAccountCode : undefined;

  const lines: Partial<JournalLine>[] = [];
  if (saleProceeds > 0) {
    const code = receivingCode ?? '1111';
    const exists = await ctx.m.Account.exists({ code }).session(ctx.session);
    lines.push({
      id: lineId('jl-disp-rcv', 0),
      accountCode: exists ? code : '1111',
      debit: saleProceeds,
      credit: 0,
      description: `Proceeds from sale of ${asset.nameEn}`,
    });
  }
  if (accDepToRemove > 0) {
    lines.push({
      id: lineId('jl-disp-acc', 1),
      accountCode: asset.accumulatedDepreciationAccountCode || '1220',
      debit: accDepToRemove,
      credit: 0,
      description: `Reverse accumulated depreciation for ${asset.nameEn}`,
    });
  }
  if (gainLoss < 0) {
    lines.push({
      id: lineId('jl-disp-loss', 2),
      accountCode: '5600',
      debit: Math.abs(gainLoss),
      credit: 0,
      description: `Loss on retirement/disposal of ${asset.nameEn}`,
    });
  }
  lines.push({
    id: lineId('jl-disp-ast', 3),
    accountCode: asset.assetAccountCode || '1211',
    debit: 0,
    credit: costToRemove,
    description: `Derecognize historical cost of ${asset.nameEn}`,
  });
  if (gainLoss > 0) {
    lines.push({
      id: lineId('jl-disp-gain', 4),
      accountCode: '4400',
      debit: 0,
      credit: gainLoss,
      description: `Gain on sale of ${asset.nameEn}`,
    });
  }

  const journal = await createJournalEntry(ctx, {
    journalNumber: `JV-DISP-${asset.assetId}`,
    date,
    sourceDocument: 'AssetDisposal',
    sourceDocumentNumber: asset.assetId,
    sourceId: asset._id,
    description: `Asset ${type}: ${asset.assetId} - ${asset.nameEn} (Proceeds: ${saleProceeds} EGP, Gain/Loss: ${gainLoss} EGP)`,
    lines,
    approvedBy: ctx.actor.name,
    status: 'posted',
  });

  asset.status = type === 'Sale' ? 'Sold' : 'Disposed';
  asset.netBookValue = 0;
  asset.disposalDetails = {
    date,
    type,
    saleProceeds,
    realizedGainLoss: gainLoss,
    receivingAccountCode: receivingCode,
    journalEntryId: journal.id,
    journalNumber: journal.journalNumber,
    reason: typeof data.reason === 'string' ? data.reason : '',
  };
  await asset.save(so(ctx));
  await logAudit(
    ctx,
    'DISPOSE_ASSET',
    'FixedAsset',
    asset.assetId,
    `Retired/Sold asset ${asset.assetId} (${type}). Posted journal ${journal.journalNumber} with realized gain/loss of ${gainLoss.toFixed(2)} EGP`,
  );
  return toOut<FixedAsset>(asset);
}

/**
 * Ported unchanged from the ERP, including its fixed 2,500 / 1,000 EGP
 * adjustments and its ignoring of the date range — flagged in
 * docs/finance/core-notes.md for the accountant to review.
 */
export async function getAssetMovementReport(ctx: FinCtx, startDate?: string, endDate?: string): Promise<AssetMovementReportItem[]> {
  void startDate;
  void endDate;
  const [categories, assets] = await Promise.all([
    ctx.m.AssetCategory.find().sort({ createdAt: 1, _id: 1 }).lean().session(ctx.session),
    ctx.m.FixedAsset.find().lean().session(ctx.session),
  ]);
  return categories.map((cat) => {
    const catAssets = assets.filter(
      (a) =>
        a.category.toLowerCase().includes(cat.nameEn.toLowerCase()) ||
        cat.nameEn.toLowerCase().includes(a.category.toLowerCase()),
    );
    let openingCost = 0;
    let purchasesCost = 0;
    let disposalsCost = 0;
    let closingCost = 0;
    let openingAccDep = 0;
    let depreciationCharge = 0;
    let disposalsAccDep = 0;
    let closingAccDep = 0;
    for (const a of catAssets) {
      const cost = costOf(a);
      if (a.isOpeningBalance) {
        openingCost += cost;
        openingAccDep += a.accumulatedDepreciation - (a.lastDepreciationDate ? 2500 : 0);
      } else {
        purchasesCost += cost;
      }
      if (a.status === 'Disposed' || a.status === 'Sold') {
        disposalsCost += cost;
        disposalsAccDep += a.accumulatedDepreciation;
      } else {
        closingCost += cost;
        closingAccDep += a.accumulatedDepreciation;
      }
      depreciationCharge += a.accumulatedDepreciation - (a.isOpeningBalance ? 1000 : 0);
    }
    return {
      category: cat.nameEn,
      openingCost,
      purchasesCost,
      disposalsCost,
      closingCost,
      openingAccDep,
      depreciationCharge: Math.max(0, depreciationCharge),
      disposalsAccDep,
      closingAccDep,
      closingNetBookValue: Math.max(0, closingCost - closingAccDep),
    };
  });
}
