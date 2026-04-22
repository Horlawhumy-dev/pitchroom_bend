import { returnTextFromAudioBuffer } from "../src/utils/transcribe";
import path from "path";

async function testShortBuffer() {
  console.log("Testing short buffer (should skip transcription)...");
  const result = await returnTextFromAudioBuffer(Buffer.from("short"), "test-session");
  console.log("Result:", JSON.stringify(result));
}

testShortBuffer().catch(console.error);
