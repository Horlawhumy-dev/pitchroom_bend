import { generateTTS } from "../utils/tts";
import Logger from "../utils/logger";

async function testHFTTS() {
  const text = "Hello! This is a test of the new Hugging Face Transformers TTS implementation. It runs locally and should be very efficient.";
  
  console.log("Starting Hugging Face TTS test...");
  const startTime = Date.now();
  
  const base64Audio = await generateTTS(text);
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  if (base64Audio) {
    console.log(`Success! Generated audio in ${duration} seconds.`);
    console.log(`Base64 length: ${base64Audio.length}`);
    console.log("First 50 characters of base64:", base64Audio.substring(0, 50));
  } else {
    console.error("Failed to generate audio.");
  }
}

testHFTTS().catch(console.error);
