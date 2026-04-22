import { PitchSession } from "../models/pitchSession";
import Logger from "../utils/logger";
import { calculateDuration } from "../utils/getDuration";

async function deactivateSession(sessionId: string) {
  Logger.info(`Deactivating pitch session: ${sessionId}`);
  try {
    const session = await PitchSession.findOne({ sessionId });

    if (!session) {
      Logger.error(`No pitch session found with id: ${sessionId}`);
      return { success: false, isActive: false, data: null };
    }

    if (!session.isActive) {
      Logger.warn(`Pitch session ${sessionId} is already deactivated`);
      return { success: false, isActive: false, data: null };
    }

    session.isActive = false;
    session.duration = calculateDuration(session.createdAt);

    await session.save();

    return { success: true, data: session, isActive: false };
  } catch (error: any) {
    Logger.error(`Error deactivating pitch session: ${error.message}`);
    throw new Error("Failed to deactivate pitch session.");
  }
}

export default deactivateSession;
