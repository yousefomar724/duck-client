import mongoose, { Schema, Types } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';

// Modelled for parity with the Go schema; no routes expose this collection,
// matching the original API.
export interface CommentDoc extends mongoose.Document {
  comment: string;
  trip_id: Types.ObjectId;
  deletedAt: Date | null;
}

const CommentSchema = new Schema<CommentDoc>(
  {
    comment: { type: String, required: true },
    trip_id: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
  },
  schemaOptions,
);

CommentSchema.plugin(softDeletePlugin);

export const Comment =
  mongoose.models.Comment || mongoose.model<CommentDoc>('Comment', CommentSchema, 'comments');
