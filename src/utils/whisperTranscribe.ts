import { pipeline } from "@huggingface/transformers";
import configs from "../config";
import logger from "./logger";

export type TranscriptionResult = { text: string; is_final: boolean };
type TranscriptionCallback = (data: TranscriptionResult) => void;

let transcriberInstance: any = null;

async function getTranscriber() {
  if (!transcriberInstance) {
    logger.info(`Initializing Whisper transcriber with model: ${configs.WHISPER_MODEL}`);
    transcriberInstance = await pipeline("automatic-speech-recognition", configs.WHISPER_MODEL as string);
    logger.info("Whisper transcriber initialized successfully.");
  }
  return transcriberInstance;
}

/**
 * Manages local Whisper transcription for a single session.
 * Accumulates audio chunks and performs periodic inference.
 */
export class WhisperTranscriber {
  private audioBuffer: Buffer = Buffer.alloc(0);
  private readonly onTranscription: TranscriptionCallback;
  private processing = false;
  private silenceCounter = 0;
  private lastTranscript = "";

  constructor(onTranscription: TranscriptionCallback) {
    this.onTranscription = onTranscription;
    // Pre-warm the transcriber
    getTranscriber().catch((err) => logger.error("Failed to pre-warm Whisper:", err));
  }

  /**
   * Send a raw audio chunk for transcription.
   * Chunks are accumulated until processed.
   */
  async sendAudioChunk(chunk: Buffer): Promise<void> {
    this.audioBuffer = Buffer.concat([this.audioBuffer, chunk]);

    // Process if we have enough audio (e.g., > 1 second at 16kHz 16-bit mono = 32000 bytes)
    // and not already processing.
    if (!this.processing && this.audioBuffer.length > 32000) {
      await this.processBuffer();
    }
  }

  private async processBuffer(): Promise<void> {
    if (this.processing || this.audioBuffer.length === 0) return;

    this.processing = true;

    try {
      const transcriber = await getTranscriber();

      // Convert Buffer (PCM 16-bit) to Float32Array (Whisper format)
      // Assuming 16kHz Mono PCM
      const float32Audio = new Float32Array(this.audioBuffer.length / 2);
      for (let i = 0; i < float32Audio.length; i++) {
        const int16 = this.audioBuffer.readInt16LE(i * 2);
        float32Audio[i] = int16 / 32768.0;
      }

      const result = await transcriber(float32Audio);
      console.log(result);
      const text = result.text.trim();

      if (text) {
        if (text === this.lastTranscript) {
          // Detect "silence" or lack of progress to trigger finality
          this.silenceCounter++;
        } else {
          this.silenceCounter = 0;
          this.lastTranscript = text;
          this.onTranscription({ text, is_final: false });
        }
      }

      // If we haven't seen new text for a while, signal completion
      if (this.silenceCounter > 3 && this.lastTranscript) {
        this.onTranscription({ text: this.lastTranscript, is_final: true });
        // Signal UtteranceEnd boundary
        this.onTranscription({ text: "", is_final: true });
        this.reset();
      }
    } catch (error) {
      logger.error("Whisper transcription error:", error);
    } finally {
      this.processing = false;
    }
  }

  private reset(): void {
    this.audioBuffer = Buffer.alloc(0);
    this.lastTranscript = "";
    this.silenceCounter = 0;
  }

  /**
   * Gracefully close/reset the transcriber.
   */
  close(): void {
    this.reset();
  }
}
