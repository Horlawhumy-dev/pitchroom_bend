import { PitchSession } from "../models/pitchSession";
import { IPitchSession } from "../utils/interface";

async function getPitchSessions(
  query: Record<string, any>,
  skip: number,
  recordsPerPage: number,
): Promise<{ success: boolean; data?: { sessions: IPitchSession[]; totalCount: number }; message?: string }> {
  try {
    const [sessions, totalCount] = await Promise.all([
      PitchSession.find(query)
        .skip(skip)
        .limit(recordsPerPage)
        .sort("-createdAt")
        .lean()
        .exec(),
      PitchSession.countDocuments(query).exec(),
    ]);

    return {
      success: true,
      message: "Pitch sessions fetched successfully.",
      data: {
        sessions: sessions as IPitchSession[],
        totalCount,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error fetching pitch sessions: ${error.message}`,
    };
  }
}

export default getPitchSessions;
