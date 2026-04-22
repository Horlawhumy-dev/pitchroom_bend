import Anthropic from "@anthropic-ai/sdk";
import configs from "../config";
import logger from "../utils/logger";
import getSystemPrompt from "../utils/getPromptType";

class AnthropicClient {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: configs.ANTHROPIC_API_KEY as string,
    });
    logger.info("Anthropic client initialized.");
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
      const stream = this.client.messages.stream({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1024,
        system: systemPrompt,
        temperature: 0.5,
        messages: [{ role: "user", content: userQuestion }],
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          const delta = event.delta.text;
          fullText += delta;
          onStream({
            message: "Streaming response...",
            answer: delta,
            error: "",
          });
        }
      }

      const finalMessage = await stream.finalMessage();
      logger.info("Anthropic response done:", {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      });

      onStream({
        message: "Final Response received",
        answer: fullText,
        error: "",
      });
      return fullText;
    } catch (error: any) {
      logger.error("Anthropic streaming error:", error.message);
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
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 50,
        messages: [{ role: "user", content: prompt }],
      });

      const messageContent = response.content[0];
      if (messageContent && "text" in messageContent) {
        return messageContent.text.trim();
      }
      return "Welcome, founder. I'm ready to hear your pitch.";
    } catch (error: any) {
      logger.error("Error generating welcome message:", error.message);
      return "Welcome, founder. Let's begin the session.";
    }
  }
}

export default AnthropicClient;
