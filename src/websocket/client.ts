import { WebSocket, WebSocketServer } from "ws";
import GeminiClient from "./gemini";
import url from "url";
import { IncomingMessage } from "http";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import deactivateSession from "../repositories/deactivateSession";
import SessionObjType, {
  RequestEnum,
  SessionReportInterface,
} from "../utils/interface";
import { WhisperTranscriber } from "../utils/whisperTranscribe";
import saveOrUpdatePitchIntelligenceReport from "../repositories/savePitchReportTranscript";
import { generateTTS } from "../utils/tts";

/**
 * @swagger
 * /ws:
 *   get:
 *     summary: WebSocket connection for the AI Investor Pitch Simulator.
 *     description: |
 *       This WebSocket connection allows the founder to communicate with the Investor AI for pitch interrogation.
 *       It requires a valid `sessionId` as a query parameter.
 *     parameters:
 *       - name: sessionId
 *         in: query
 *         description: The session ID obtained after uploading a resume and job description.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       101:
 *         description: Successfully connected to the WebSocket server.
 *       400:
 *         description: Session ID is missing or invalid.
 *       500:
 *         description: Internal server error during WebSocket communication.
 */

// Global settings
const MAX_INACTIVITY_TIME = 3000;

export default async function setupWebSocketServer(wss: WebSocketServer) {
  let geminiClient: GeminiClient;

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const parsedUrl = url.parse(req.url || "", true);
    const sessionId = Array.isArray(parsedUrl.query.sessionId)
      ? parsedUrl.query.sessionId[0]
      : parsedUrl.query.sessionId;

    if (!sessionId) {
      logger.error("User session id is required.");
      ws.send(
        JSON.stringify({
          error: "Session id is required from deck upload.",
          answer: "",
        }),
      );
      ws.close();
      return;
    }

    const sessionObjStr = await redisClient.get(sessionId);
    const sessionObj: SessionObjType = sessionObjStr
      ? JSON.parse(sessionObjStr)
      : null;

    if (!sessionObj) {
      logger.error("Session not found in cache:", sessionId);
      try {
        logger.info(`Auto-deactivating session ${sessionId}`);
        await deactivateSession(sessionId);
      } catch (error: any) {
        logger.error(error);
      }

      ws.send(
        JSON.stringify({
          error: "No active session found, please start a new session!",
          answer: "",
        }),
      );
      ws.close();
      return;
    }

    logger.info(`WebSocket connected for user ${sessionObj.userData?.uid}`);
    geminiClient = new GeminiClient();

    // PERSONALIZED WELCOME SEQUENCE:
    // This greets the founder based on their pitch profile immediately upon connection.
    (async () => {
      try {
        const welcomeText = await geminiClient.generateWelcomeMessage(sessionObj);
        const audioBase64 = await generateTTS(welcomeText);
        if (audioBase64 && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            action_type: "ai_audio",
            audio: audioBase64,
            message: "AI Investor personalized welcome",
            transcript: welcomeText,
          }));
          logger.info(`Sent personalized welcome for session ${sessionId}`);
        }
      } catch (err: any) {
        logger.error(`Failed to generate welcome voice: ${err.message}`);
      }
    })();

    // Accumulates final transcript segments within one utterance
    let transcriptBuffer = "";

    // Whisper local transcription — one connection per WebSocket session
    const whisperTranscriber = new WhisperTranscriber(async ({ text, is_final }) => {
      if (!text && is_final) {
        // UtteranceEnd boundary: flush accumulated buffer as the completed question
        const finalQuestion = transcriptBuffer.trim();
        transcriptBuffer = "";
        if (finalQuestion && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ error: "", transcript: finalQuestion, transcriptDone: true }));
        }
        return;
      }

      if (text && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ error: "", transcript: text, transcriptDone: false }));
      }

      if (text && is_final) {
        transcriptBuffer += (transcriptBuffer ? " " : "") + text;
      }
    });

    ws.on("message", async (message: any) => {
      let questionBuffer: any;

      try {
        questionBuffer = JSON.parse(message.toString());
      } catch (e) {
        logger.info("Error parsing question buffer JSON:", e);
        return;
      }


      let buffer = null;
      let actionType: RequestEnum =
        questionBuffer?.["action_type"] ?? RequestEnum.ANSWER;
      let transcribedQuestion: string | null = null;


      if (actionType.toLowerCase() === RequestEnum.PING) {
        ws.send(
          JSON.stringify({
            error: "",
            message: "PONG",
            answer: "",
          }),
        );
        return;
      }

      if (actionType.toLowerCase() === RequestEnum.SAVE) {
        const { question, answer } = questionBuffer;
        const report: SessionReportInterface = {
          sessionId,
          log: {
            question,
            answer,
            loggedAt: new Date(),
          },
        };
        logger.info("Saving session report", report);
        const isSaved = await saveOrUpdatePitchIntelligenceReport(report);
        ws.send(
          JSON.stringify({
            error: "",
            message: "Session report saved successfully.",
            answer: "",
            isSaved,
          }),
        );
        return;
      }

      if (actionType == RequestEnum.TRANSCRIBE || "audio" in questionBuffer) {
        const bufferBase64 = questionBuffer["audio"];
        const chunk = Buffer.from(bufferBase64, "base64");

        logger.debug(`Received audio chunk: ${chunk.length} bytes`);

        // Forward the raw audio chunk directly to Whisper's live WebSocket.
        // Interim and final transcripts are emitted via the WhisperTranscriber callback above.
        whisperTranscriber.sendAudioChunk(chunk);
        return;
      } else {
        transcribedQuestion = questionBuffer["text"];
        if (!transcribedQuestion) {
          ws.send(
            JSON.stringify({
              error: "No question was found, please try again!",
              answer: "",
            }),
          );
          return;
        }

        logger.debug(transcribedQuestion);

        // action type is answer, then send the transcribed question to Anthropic
        try {
          const finalAnswer = await geminiClient.sendMessageWithStream(
            transcribedQuestion,
            sessionObj,
            (streamedData: any) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(streamedData));
              }
            },
          );

          // AUTO-SAVE TRANSCRIPT:
          // We save the Q&A pair immediately to ensure the report is always up-to-date.
          if (finalAnswer && transcribedQuestion) {
            const report: SessionReportInterface = {
              sessionId,
              log: {
                question: transcribedQuestion,
                answer: finalAnswer,
                loggedAt: new Date(),
              },
            };
            await saveOrUpdatePitchIntelligenceReport(report);
            logger.info(`Auto-saved transcript log for session ${sessionId}`);
          }

          // Generate and send AI voice after the final text response
          if (finalAnswer) {
            const audioBase64 = await generateTTS(finalAnswer);
            if (audioBase64 && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                action_type: "ai_audio",
                audio: audioBase64,
                message: "AI Investor voice response"
              }));
            }
          }
        } catch (error: any) {
          logger.error("Error streaming response:", error.message);
          ws.send(
            JSON.stringify({
              error:
                "Error occurred while processing the question, please try again!",
              answer: "",
            }),
          );
        }
      }

      // No inactivity timer needed: Deepgram's UtteranceEnd event (utterance_end_ms: 1000)
      // handles end-of-speech detection and fires the transcriptDone: true message.
    });

    ws.on("close", () => {
      logger.info("Client disconnected.");
      whisperTranscriber.close();
    });

    ws.on("error", (error: Error) => {
      logger.error("WebSocket error:", error);
    });
  });
}
