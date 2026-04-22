import WebSocket from "ws";
import logger from "../utils/logger";
import configs from "../config/index";

export default class WebSocketOpenAIStreamBridge {
  private ws: WebSocket | null = null;
  private readonly openaiTranscribeURL =
    "wss://api.openai.com/v1/realtime?intent=transcription"; //"wss://api.openai.com/v1/audio/translations";
  private isConnected = false;
  private bufferQueue: Buffer[] = [];
  private onTranscription: (data: { text: string; is_final: boolean }) => void;

  constructor(
    onTranscription: (data: { text: string; is_final: boolean }) => void,
  ) {
    this.onTranscription = onTranscription;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.openaiTranscribeURL, {
      headers: {
        Authorization: `Bearer ${configs.OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    this.ws.on("open", () => {
      logger.info("Connected to OpenAI realtime transcription WebSocket.");
      this.isConnected = true;
      this.flushQueue();
    });

    this.ws.on("message", (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed && parsed.text !== undefined) {
          this.onTranscription({
            text: parsed.text,
            is_final: parsed.is_final,
          });
        }
      } catch (e) {
        logger.error("Failed to parse transcription:", e);
      }
    });

    this.ws.on("close", () => {
      logger.info("Closed OpenAI transcription WebSocket.");
    });

    this.ws.on("error", (err) => {
      logger.error("OpenAI WebSocket error:", err);
    });
  }

  sendAudioChunk(chunk: Buffer) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.bufferQueue.push(chunk);
    } else {
      this.ws.send(chunk);
    }
  }

  private flushQueue() {
    while (this.bufferQueue.length > 0) {
      const chunk = this.bufferQueue.shift();
      if (chunk) this.sendAudioChunk(chunk);
    }
  }

  close() {
    this.ws?.close();
  }
}
