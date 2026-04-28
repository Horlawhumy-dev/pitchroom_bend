import { GoogleGenAI } from "@google/genai";
import configs from "../config";
import logger from "../utils/logger";
import getSystemPrompt from "../utils/getPromptType";

class GeminiClient {
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({
      apiKey: configs.GEMINI_API_KEY as string,
    });
    logger.info("Gemini client initialized.");
  }

  public isConnected(): boolean {
    return true; // HTTP-based, always available
  }

  public closeWebSocket(): void {
    // No persistent connection to close
  }

  public async sendMessageWithStream(
    userQuestion: string,
    sessionObj: any,
    onStream: (chunk: any) => void,
  ): Promise<string> {
    const systemPrompt = getSystemPrompt(sessionObj);
    let fullText = "";

    try {
      const responseStream = await this.client.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: userQuestion,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.5,
          maxOutputTokens: 1024,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          onStream({
            message: "Streaming response...",
            answer: chunk.text,
            error: "",
          });
        }
      }

      logger.info("Gemini response done.");

      onStream({
        message: "Final Response received",
        answer: fullText,
        error: "",
      });
      return fullText;
    } catch (error: any) {
      logger.error("Gemini streaming error:", error.message);
      onStream({
        message: "Error occurred",
        answer: "",
        error: error.message || "Something went wrong.",
      });
      return "";
    }
  }

  /**
   * Generates a short, personalized welcome message for the founder.
   */
  public async generateWelcomeMessage(sessionObj: any): Promise<string> {
    const pitchStage = sessionObj.pitchStage || "Seed";
    const responseType = sessionObj.responseType || "interrogation";
    const deckHint =
      sessionObj.deckContent?.substring(0, 500) || "a new startup";

    const prompt = `
# ROLE: PROFESSIONAL INVESTOR
Create a short, punchy welcome greeting (max 15 words) for a founder who just entered the room for a ${responseType} session.
Context: They are pitching a ${pitchStage} stage company.
Deck Hint: ${deckHint}

Tone: ${responseType === "interrogation" ? "Skeptical and professional" : "Encouraging and coaching"}
Requirement: Address them as "founder". Be humanly and direct. Don't use placeholders.
`;

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          maxOutputTokens: 50,
        },
      });

      if (response.text) {
        return response.text.trim();
      }
      return "Welcome, founder. I'm ready to hear your pitch.";
    } catch (error: any) {
      logger.error("Error generating welcome message:", error.message);
      return "Welcome, founder. Let's begin the session.";
    }
  }
}

export default GeminiClient;
