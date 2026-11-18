import { Team, User } from '../models/index.js';
import type { Types } from 'mongoose';

// User.team is the source of truth; Team.members mirrors it. Keep both sides in one place.
export async function setUserTeam(userId: Types.ObjectId, teamId: Types.ObjectId) {
  const user = await User.findById(userId).select('team');
  if (!user) throw new Error(`User ${userId.toString()} not found`);
  if (user.team && !user.team.equals(teamId)) {
    await Team.updateOne({ _id: user.team }, { $pull: { members: userId } });
  }
  await User.updateOne({ _id: userId }, { $set: { team: teamId } });
  await Team.updateOne({ _id: teamId }, { $addToSet: { members: userId } });
}
