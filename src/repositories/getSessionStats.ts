import { PitchSession } from "../models/pitchSession";

/**
 * Fetch pitch session stats including last vs current month percentage change.
 * @returns {Promise<any>} - Faceted aggregation result.
 */
const getSessionStats = async (
  matchStage: any,
  firstDayLastMonth: Date,
  lastDayLastMonth: Date,
  firstDayCurrentMonth: Date,
) => {
  return await PitchSession.aggregate([
    {
      $facet: {
        totalStats: [
          { $match: matchStage },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              totalActiveSessions: {
                $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
              },
            },
          },
        ],
        lastMonthCount: [
          {
            $match: {
              ...matchStage,
              createdAt: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
            },
          },
          { $count: "count" },
        ],
        currentMonthCount: [
          {
            $match: {
              ...matchStage,
              createdAt: { $gte: firstDayCurrentMonth },
            },
          },
          { $count: "count" },
        ],
      },
    },
  ]);
};

export default getSessionStats;
