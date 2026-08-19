import mongoose, { Schema, Types } from 'mongoose';

export interface DeletedBookingDoc extends mongoose.Document {
  original_id: Types.ObjectId;
  snapshot: Record<string, unknown>;
  deleted_at: Date;
  deleted_by: Types.ObjectId;
  deleted_by_role: number;
  reason: string;
  wallet_adjustment: number;
}

const DeletedBookingSchema = new Schema<DeletedBookingDoc>(
  {
    original_id: { type: Schema.Types.ObjectId, required: true, index: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    deleted_at: { type: Date, required: true, default: Date.now },
    deleted_by: { type: Schema.Types.ObjectId, required: true },
    deleted_by_role: { type: Number, required: true },
    reason: { type: String, default: '' },
    wallet_adjustment: { type: Number, required: true, default: 0 },
  },
  { timestamps: false },
);

export const DeletedBooking =
  mongoose.models.DeletedBooking ||
  mongoose.model<DeletedBookingDoc>(
    'DeletedBooking',
    DeletedBookingSchema,
    'deleted_bookings',
  );
