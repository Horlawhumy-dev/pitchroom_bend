import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import configs from "../config";
import Logger from "./logger";

const client = new ElevenLabsClient({
  apiKey: configs.ELEVENLABS_API_KEY,
});

/**
 * Converts text to speech using ElevenLabs TTS.
 * Returns a base64 encoded string of the audio.
 */
export async function generateTTS(text: string): Promise<string | null> {
  try {
    if (!configs.ELEVENLABS_API_KEY) {
      Logger.warn("ELEVENLABS_API_KEY is not set. Falling back to null for TTS.");
      return null;
    }

    if (!configs.ELEVENLABS_VOICE_ID) {
      Logger.warn("ELEVENLABS_VOICE_ID is not set. Using default professional voice.");
    }

    Logger.info("Generating AI voice using ElevenLabs TTS...");
    
    // Using the stream method to get chunks of audio
    const audioStream = await client.textToSpeech.convert(
      configs.ELEVENLABS_VOICE_ID || "pNInz6obpgUe936bV4B1", // Use configured ID or default
      {
        modelId: "eleven_flash_v2_5", // Optimized for low-latency
        text: text,
      }
    );

    const chunks: Buffer[] = [];
    // The convert method returns a ReadableStream in the latest SDK
    for await (const chunk of audioStream as any) {
      chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);
    return buffer.toString("base64");
  } catch (error: any) {
    Logger.error("Error generating ElevenLabs TTS:", error.message);
    return null;
  }
}

export default generateTTS;
