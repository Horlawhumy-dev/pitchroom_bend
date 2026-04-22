import logger from "./logger";
import fetchTranscription from "./transcribe";

export async function extractUserQuestionFromAudio(
  chunk: Buffer,
  currentBuffer: Buffer,
  sessionId: string,
): Promise<{ text: string; updatedBuffer: Buffer } | null> {
  logger.info("userQuestion is audio -- Transcribing audio ");

  try {
    const result = await fetchTranscription(chunk, currentBuffer, sessionId);
    if (result.text) {
      logger.info("User question after audio transcription is ", result.text);
    }
    return result;
  } catch (error) {
    logger.error("Error transcribing audio stream:", error);
    return null;
  }
}
