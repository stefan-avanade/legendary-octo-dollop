import { Schema, model } from 'mongoose';

const activitySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  type: { type: String, required: true, enum: ['run', 'cycle', 'strength', 'walk'] },
  minutes: { type: Number, required: true, min: 1, max: 1440 },
  points: { type: Number, required: true, min: 0 },
  occurredAt: {
    type: Date,
    required: true,
    validate: { validator: (value: Date) => value.getTime() <= Date.now() + 5 * 60 * 1000, message: 'occurredAt cannot be in the future' },
  },
});

export const Activity = model('Activity', activitySchema);
