import type { Aggregate, Schema } from 'mongoose';

/**
 * Reproduces GORM's implicit `deleted_at IS NULL` filter: every model embeds
 * gorm.Model, whose soft-delete behavior silently excludes deleted rows from
 * every read. Deletes here set deletedAt instead of removing the document.
 */
export function softDeletePlugin(schema: Schema) {
  schema.add({ deletedAt: { type: Date, default: null, index: true } });

  function injectFilter(this: {
    getFilter: () => Record<string, unknown>;
    getQuery?: () => Record<string, unknown>;
  }) {
    const filter = this.getFilter ? this.getFilter() : this.getQuery!();
    if (filter.deletedAt === undefined) {
      filter.deletedAt = null;
    }
  }

  schema.pre('find', injectFilter);
  schema.pre('findOne', injectFilter);
  schema.pre('findOneAndUpdate', injectFilter);
  schema.pre('countDocuments', injectFilter);
  schema.pre('updateMany', injectFilter);
  schema.pre('updateOne', injectFilter);

  schema.pre('aggregate', function (this: Aggregate<unknown[]>) {
    const pipeline = this.pipeline() as unknown as Record<string, unknown>[];
    const hasMatchDeleted = pipeline.some(
      (stage) =>
        stage.$match &&
        typeof stage.$match === 'object' &&
        'deletedAt' in (stage.$match as Record<string, unknown>),
    );
    if (!hasMatchDeleted) {
      pipeline.unshift({ $match: { deletedAt: null } });
    }
  });
}

/**
 * Go/GORM JSON emitted the primary key as `ID` (from gorm.Model); the
 * duck-web frontend reads both `id` and `ID` depending on the entity
 * (Booking.ID, Payout.ID, TourGuide.ID vs Trip.id, Destination.id, ...).
 * Emitting both keeps every call site working unchanged.
 *
 * Typed loosely (`any`) deliberately: Mongoose generates a distinct, highly
 * specific `ret` type per model, and this transform is shared across all of
 * them by every model's `schemaOptions.toJSON`.
 */
function transform(_doc: unknown, ret: Record<string, unknown>) {
  const id = (ret._id as { toString(): string }).toString();
  ret.id = id;
  ret.ID = id;
  delete ret._id;
  delete ret.deletedAt;
  if (ret.created_at instanceof Date) {
    ret.CreatedAt = ret.created_at;
  }
  if (ret.updated_at instanceof Date) {
    ret.UpdatedAt = ret.updated_at;
  }
  return ret;
}

export const toJSONTransform = {
  virtuals: true,
  versionKey: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: transform as any,
};

export const schemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: toJSONTransform,
};
