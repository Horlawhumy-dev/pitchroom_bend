import { pipeline } from "@huggingface/transformers";
import configs from "../config";
import Logger from "./logger";
import { WaveFile } from "wavefile";

let synthesizerInstance: any = null;
let speakerEmbeddingsInstance: Float32Array | null = null;

/**
 * Initializes the Hugging Face TTS pipeline if it doesn't exist.
 */
async function getSynthesizer() {
  if (!synthesizerInstance) {
    Logger.info(`Initializing Hugging Face TTS with model: ${configs.HF_TTS_MODEL}`);
    synthesizerInstance = await pipeline("text-to-speech", configs.HF_TTS_MODEL as string, {
      dtype: configs.HF_TTS_DTYPE as any,
    });
    Logger.info("Hugging Face TTS initialized successfully.");
  }
  return synthesizerInstance;
}

/**
 * Fetches and caches speaker embeddings from a URL.
 */
async function getSpeakerEmbeddings() {
  if (!speakerEmbeddingsInstance) {
    const url = configs.HF_SPEAKER_EMBEDDINGS as string;
    Logger.info(`Fetching speaker embeddings from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch speaker embeddings: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    speakerEmbeddingsInstance = new Float32Array(arrayBuffer);
    Logger.info("Speaker embeddings loaded successfully.");
  }
  return speakerEmbeddingsInstance;
}

/**
 * Converts text to speech using Hugging Face Transformers TTS.
 * Returns a base64 encoded string of the audio.
 */
export async function generateTTS(text: string): Promise<string | null> {
  try {
    Logger.info("Generating AI voice using Hugging Face TTS...");

    const [synthesizer, speaker_embeddings] = await Promise.all([
      getSynthesizer(),
      getSpeakerEmbeddings(),
    ]);

    const result = await synthesizer(text, { speaker_embeddings });

    // result has { audio: Float32Array, sampling_rate: number }
    const wav = new WaveFile();
    wav.fromScratch(1, result.sampling_rate, "32f", result.audio);

    return wav.toBuffer().toLocaleString("base64");
  } catch (error: any) {
    Logger.error("Error generating Hugging Face TTS:", error.message);
    return null;
  }
}

export default generateTTS;
