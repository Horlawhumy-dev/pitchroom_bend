import Logger from "../utils/logger";
import { PitchSession } from "../models/pitchSession";

function safeParseDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  return parsed;
}

const getProductUsages = async (
  userId: string,
  startDate: string | Date,
  endDate: Date | string,
): Promise<any> => {
  const start = safeParseDate(startDate);
  const end = safeParseDate(endDate);

  try {
    const sessionsCount = await PitchSession.countDocuments({
      uid: userId, // Match new schema field 'uid'
      createdAt: {
        $gte: start,
        $lte: end,
      },
    });

    Logger.info(
      `User ${userId} has created ${sessionsCount} pitch sessions in subscription period`,
    );

    return {
      count: sessionsCount,
      success: true,
    };
  } catch (error: any) {
    Logger.error(
      `Error fetching pitch session count for user ${userId}: ${error.message}`,
    );
    return {
      count: 0,
      success: false,
    };
  }
};

export default getProductUsages;
