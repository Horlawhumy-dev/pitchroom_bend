import Logger from "../utils/logger";
import { PitchSession } from "../models/pitchSession";

const hasSessionsLeft = async (
  userId: string,
  startDate: string | Date,
  endDate: Date | string,
  numberOfSession: number,
): Promise<boolean> => {
  const sessions = await PitchSession.countDocuments({
    uid: userId, // Match new schema field 'uid'
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  });

  Logger.info(
    `User ${userId} has created ${sessions} pitch sessions within subscription period`,
  );

  return sessions < numberOfSession;
};

export default hasSessionsLeft;
