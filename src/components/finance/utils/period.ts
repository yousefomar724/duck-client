/** The current calendar month as `YYYY-MM`, the default for every period selector. */
export const currentMonth = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

/** First and last day (`YYYY-MM-DD`) of a `YYYY-MM` month. */
export const monthRange = (month: string): { start: string; end: string } => {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
};
