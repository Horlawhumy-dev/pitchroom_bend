import fs from "fs";
import { OpenAI } from "openai";
import configs from "../config";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";

const openai = new OpenAI({
  apiKey: configs.OPENAI_API_KEY,
});

const OPENAI_TRANSCRIBE_MODEL = configs.OPENAI_TRANSCRIBE_MODEL;
const writeFile = promisify(fs.writeFile);
const execAsync = promisify(exec);

// Minimum buffer size to attempt transcription
const MIN_BUFFER_SIZE = 1000;

// WebM EBML header signature: 1A 45 DF A3
export const WEBM_SIGNATURE = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

/**
 * Checks if a buffer starts with the WebM/EBML header signature.
 */
export function isWebMHeader(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  return buffer.slice(0, 4).equals(WEBM_SIGNATURE);
}

/**
 * Converts a potentially malformed WebM/Ogg buffer into a standardized WAV file using FFmpeg.
 */
async function sanitizeAudio(inputPath: string, outputPath: string): Promise<void> {
  try {
    // -y: overwrite output
    // -f matroska: assist detection
    // -i: input file
    // -ar 16000: 16kHz sample rate
    // -ac 1: mono channel
    // -c:a pcm_s16le: 16-bit PCM encoding
    // -loglevel error: reduce noise
    await execAsync(`ffmpeg -y -f matroska -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}" -loglevel error`);
  } catch (error) {
    throw error;
  }
}

export async function returnTextFromAudioBuffer(audioBuffer: Buffer, sessionId: string, isFinal: boolean = false) {
  if (!audioBuffer || audioBuffer.length < MIN_BUFFER_SIZE) {
    console.log(`[Session ${sessionId}] Buffer too small (${audioBuffer?.length || 0} bytes), skipping.`);
    return "";
  }

  // Validate Header
  if (!isWebMHeader(audioBuffer)) {
      console.warn(`[Session ${sessionId}] Buffer does not start with valid WebM header (found: ${audioBuffer.slice(0, 4).toString('hex')}). Waiting for more data...`);
      return "";
  }

  const tempDir = path.join(__dirname, "..", "..", "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const requestId = Date.now();
  const webmPath = path.join(tempDir, `raw_${sessionId}_${requestId}.webm`);
  const wavPath = path.join(tempDir, `processed_${sessionId}_${requestId}.wav`);

  try {
    // 1. Write raw buffer to temporary WebM file
    await writeFile(webmPath, audioBuffer);

    let fileToTranscribe = webmPath;

    // 2. Attempt Sanitization
    // For intermediate chunks, we try to sanitize but fallback to raw if FFmpeg fails due to incompleteness.
    try {
        await sanitizeAudio(webmPath, wavPath);
        if (fs.existsSync(wavPath) && fs.statSync(wavPath).size > 100) {
            fileToTranscribe = wavPath;
        }
    } catch (ffmpegErr: any) {
        if (!isFinal) {
            console.log(`[Session ${sessionId}] Intermediate FFmpeg parse failure, falling back to raw WebM for live update.`);
            fileToTranscribe = webmPath;
        } else {
            console.error(`[Session ${sessionId}] Final FFmpeg sanitization failed:`, ffmpegErr.message);
            fileToTranscribe = webmPath;
        }
    }

    // 3. Transcribe
    console.log(`[Session ${sessionId}] Transcribing ${path.extname(fileToTranscribe)} (${fs.statSync(fileToTranscribe).size} bytes)...`);
    const transcriptionResponse = await transcribeAudio(fileToTranscribe);

    let transcribedText = "";
    if (transcriptionResponse) {
      transcribedText = transcriptionResponse.text;
      console.log(`[Session ${sessionId}] Result: ${transcribedText}`);
    }

    return transcribedText;
  } catch (err) {
    console.error(`[Session ${sessionId}] Pipeline Error:`, err);
    return "";
  } finally {
    // 4. Guaranteed Cleanup
    [webmPath, wavPath].forEach(p => {
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (e) { /* ignore */ }
      }
    });
  }
}

async function fetchTranscription(data: Buffer, currentBuffer: Buffer, sessionId: string) {
  try {
    const updatedBuffer = Buffer.concat([currentBuffer, data]);
    const text = await returnTextFromAudioBuffer(updatedBuffer, sessionId, false);
    return { text, updatedBuffer };
  } catch (err) {
    console.error("Error in fetchTranscription:", err);
    return { text: "", updatedBuffer: currentBuffer };
  }
}

async function transcribeAudio(filePath: string) {
  try {
    const fileStream = fs.createReadStream(filePath);

    const transcriptionResponse = await openai.audio.transcriptions.create({
      model: OPENAI_TRANSCRIBE_MODEL,
      file: fileStream,
      language: "en",
    });

    return transcriptionResponse;
  } catch (error: any) {
    // Whisper-specific error handling
    if (error?.status === 400 && error?.message?.includes("shorter than 0.1 seconds")) {
      return null;
    }
    throw error;
  }
}

export default fetchTranscription;
