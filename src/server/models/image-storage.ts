import mongoose, { Schema, Types } from 'mongoose';
import { softDeletePlugin, schemaOptions } from '../db/plugins';

export interface ImageStorageDoc extends mongoose.Document {
  user_id: Types.ObjectId;
  supplier_id?: Types.ObjectId | null;
  image_url: string;
  public_id: string;
  deletedAt: Date | null;
}

const ImageStorageSchema = new Schema<ImageStorageDoc>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
    image_url: { type: String, required: true },
    // Cloudinary handle needed to delete/replace the asset; the Go API had no
    // equivalent since it just removed a local file by path.
    public_id: { type: String, required: true, select: false },
  },
  schemaOptions,
);

ImageStorageSchema.plugin(softDeletePlugin);

export const ImageStorage =
  mongoose.models.ImageStorage ||
  mongoose.model<ImageStorageDoc>('ImageStorage', ImageStorageSchema, 'image_storages');
