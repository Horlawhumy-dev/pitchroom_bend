import Logger from "../utils/logger";
import getSessionStats from "./getSessionStats";

const getSessionStatisticsWithPercentage = async (uid?: string) => {
  try {
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const matchStage: any = {};
    if (uid) {
      matchStage["uid"] = uid; // Match new schema field 'uid'
    }

    let stats,
      totalStats = { total: 0, totalActiveSessions: 0 },
      lastMonthCount = 0,
      currentMonthCount = 0;

    try {
      stats = await getSessionStats(
        matchStage,
        firstDayLastMonth,
        lastDayLastMonth,
        firstDayCurrentMonth,
      );
      totalStats = stats[0].totalStats[0] || { total: 0, totalActiveSessions: 0 };
      lastMonthCount = stats[0].lastMonthCount[0]?.count || 0;
      currentMonthCount = stats[0].currentMonthCount[0]?.count || 0;
    } catch (error) {
      Logger.error("Error fetching pitch session statistics:", error);
    }

    const totalInactiveSessions = totalStats.total - totalStats.totalActiveSessions;

    let percentageChange: number;
    if (lastMonthCount > 0) {
      percentageChange = ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
    } else if (currentMonthCount > 0) {
      percentageChange = 100;
    } else {
      percentageChange = 0;
    }

    const lastVsCurrentMonthChange = percentageChange >= 0
      ? `+${percentageChange.toFixed(1)}%`
      : `${percentageChange.toFixed(1)}%`;

    return {
      total: totalStats.total,
      totalActiveSessions: totalStats.totalActiveSessions,
      totalInactiveSessions,
      lastVsCurrentMonthChange,
    };
  } catch (error) {
    Logger.error("Error calculating pitch session statistics:", error);
    throw error;
  }
};

export default getSessionStatisticsWithPercentage;
