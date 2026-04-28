import GeminiClient from "./websocket/gemini";
import { generateTTS } from "./utils/tts";
import dotenv from "dotenv";

dotenv.config();

async function testWelcomeLogic() {
  console.log("Testing Welcome Message Logic...");
  const geminiClient = new GeminiClient();
  
  const dummySession = {
    pitchStage: "Series A",
    responseType: "interrogation",
    deckContent: "We are building an AI-powered logistics platform called LogiStream that optimizes shipping routes."
  };

  const welcomeText = await geminiClient.generateWelcomeMessage(dummySession);
  console.log("Generated Welcome Text:", welcomeText);

  if (welcomeText.length > 0) {
    console.log("\nTesting Welcome TTS...");
    const audioBase64 = await generateTTS(welcomeText);
    if (audioBase64) {
      console.log("Success! Welcome Audio Generated.");
    } else {
      console.error("Failed to generate welcome audio.");
    }
  }
}

testWelcomeLogic().then(() => process.exit(0));
