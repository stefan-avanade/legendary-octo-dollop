import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: { validator: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), message: 'email must be a valid address' },
  },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  fitnessGoal: { type: String, required: true, enum: ['endurance', 'strength', 'mobility'] },
});

export const User = model('User', userSchema);
