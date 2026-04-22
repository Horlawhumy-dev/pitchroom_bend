import { PitchSession } from "../models/pitchSession";
import { PitchIntelligenceReport } from "../models/pitchReport";
import Logger from "../utils/logger";

async function getPitchSessionsByUser(
  query: Record<string, any>,
  userId: string,
  skip: number,
  recordsPerPage: number,
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    // Ensure the userId is included in the query
    query["uid"] = userId; // Changed from user.uid to uid to match new model

    // Execute database queries with performance optimizations
    const [sessions, totalCount] = await Promise.all([
      PitchSession.find(query)
        .select("-businessContext") // Exclude businessContext
        .skip(skip)
        .limit(recordsPerPage)
        .sort("-createdAt")
        .lean()
        .exec(),
      PitchSession.countDocuments(query).exec(),
    ]);

    if (sessions.length === 0) {
      Logger.warn(
        `No pitch sessions found for user ${userId} with query: ${JSON.stringify(query)}`,
      );
      return {
        success: false,
        message: "No pitch sessions found.",
        data: { sessions: [] },
      };
    }

    // 2. Fetch reports for these sessions to get scores
    const sessionIds = sessions.map((s: any) => s.sessionId);
    const reports = await PitchIntelligenceReport.find({
      sessionId: { $in: sessionIds },
    }).lean();

    // 3. Map scores and analysis back to sessions
    const enrichedSessions = sessions.map((session: any) => {
      const report = reports.find((r: any) => r.sessionId === session.sessionId);
      let score = 0;
      let analysisSummary = null;

      if (report?.pitchIntelligence) {
        const { storyClarity, marketCredibility, founderConfidence } =
          report.pitchIntelligence;
        score = parseFloat(
          (
            ((storyClarity?.score || 0) +
              (marketCredibility?.score || 0) +
              (founderConfidence?.score || 0)) /
            3
          ).toFixed(1),
        );
        analysisSummary = {
          storyClarity: storyClarity?.score || 0,
          marketCredibility: marketCredibility?.score || 0,
          founderConfidence: founderConfidence?.score || 0,
        };
      }

      return {
        ...session,
        score,
        analysisSummary,
      };
    });

    Logger.info(
      `Fetched ${enrichedSessions.length} pitch sessions for user ${userId}`,
    );

    return {
      success: true,
      message: "Pitch sessions fetched successfully.",
      data: {
        sessions: enrichedSessions,
        totalCount,
        page: skip / recordsPerPage + 1,
        recordsPerPage,
      },
    };
  } catch (error: any) {
    Logger.error(`Error fetching pitch sessions: ${error.message}`, {
      error,
    });
    return {
      success: false,
      message: "An error occurred while fetching pitch sessions.",
    };
  }
}

export default getPitchSessionsByUser;
