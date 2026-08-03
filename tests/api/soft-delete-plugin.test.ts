import { describe, expect, it } from 'vitest';
import mongoose, { Schema, model } from 'mongoose';
import { softDeletePlugin } from '@/server/db/plugins';

const TestSchema = new Schema({ name: String });
TestSchema.plugin(softDeletePlugin);
const TestModel = mongoose.models.SoftDeleteTest || model('SoftDeleteTest', TestSchema);

describe('softDeletePlugin', () => {
  it('injects deletedAt filter on find', async () => {
    await TestModel.create({ name: 'active' });
    await TestModel.create({ name: 'deleted', deletedAt: new Date() });

    const docs = await TestModel.find({});
    expect(docs).toHaveLength(1);
    expect(docs[0].name).toBe('active');
  });
});
