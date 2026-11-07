import { so, type FinCtx } from './context';

/**
 * Next value of a number series, from an atomic `$inc` on `fin_counters`.
 * Replaces the ERP's `array.length + N` and `Math.random()` numbering, which
 * produced duplicates as soon as two people saved at once or a row was
 * deleted. Inside a transaction an aborted save also rolls the counter back.
 */
export async function nextSeq(ctx: FinCtx, key: string): Promise<number> {
  const doc = await ctx.m.Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, ...so(ctx) },
  );
  return doc!.seq;
}

/** `PREFIX-YYYY-0001`. */
export async function nextYearNumber(ctx: FinCtx, prefix: string, year: number, pad = 4): Promise<string> {
  const seq = await nextSeq(ctx, `${prefix}-${year}`);
  return `${prefix}-${year}-${String(seq).padStart(pad, '0')}`;
}

/** `PREFIX-0001` for series that are not split by year. */
export async function nextPlainNumber(ctx: FinCtx, prefix: string, pad = 4): Promise<string> {
  const seq = await nextSeq(ctx, prefix);
  return `${prefix}-${String(seq).padStart(pad, '0')}`;
}
