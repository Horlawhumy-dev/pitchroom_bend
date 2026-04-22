import { WebSocket, WebSocketServer } from "ws";
import AnthropicClient from "./anthropic";
import url from "url";
import { IncomingMessage } from "http";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import deactivateSession from "../repositories/deactivateSession";
import SessionObjType, {
  RequestEnum,
  SessionReportInterface,
} from "../utils/interface";
import { extractUserQuestionFromAudio } from "../utils/extractQuestion";
import { returnTextFromAudioBuffer, isWebMHeader } from "../utils/transcribe";
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
  let anthropicClient: AnthropicClient;

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
    anthropicClient = new AnthropicClient();

    // PERSONALIZED WELCOME SEQUENCE:
    // This greets the founder based on their pitch profile immediately upon connection.
    (async () => {
      try {
        const welcomeText = await anthropicClient.generateWelcomeMessage(sessionObj);
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

    let currentAudioBuffer = Buffer.from([]);
    let inactivityTimer: NodeJS.Timeout | null = null;

    ws.on("message", async (message: any) => {
      let questionBuffer: any;

      try {
        questionBuffer = JSON.parse(message.toString());
      } catch (e) {
        logger.info("Error parsing question buffer JSON:", e);
        return;
      }

      // Important: Clear the inactivity timer on EVERY message
      // This prevents the buffer from being cleared prematurely if messages are arriving.
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
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

        // AUTO-RESTART DETECTION:
        // If the chunk starts with a WebM header, it means a new recording session has started.
        // We clear the buffer to ensure the new session starts fresh and doesn't get wiped by stale timers.
        if (isWebMHeader(chunk)) {
          if (currentAudioBuffer.length > 0) {
            logger.info(`[Session ${sessionId}] New WebM stream detected. Resetting audio buffer.`);
            currentAudioBuffer = Buffer.from([]);
          }
        }

        const transcriptionResult = await extractUserQuestionFromAudio(
          chunk,
          currentAudioBuffer,
          sessionId,
        );

        if (transcriptionResult) {
          transcribedQuestion = transcriptionResult.text;
          currentAudioBuffer = transcriptionResult.updatedBuffer;
        }

        if (!transcribedQuestion) {
          // If no transcription yet (e.g. buffer too small), just return and wait for more chunks
          return;
        }

        logger.debug(`Live Transcript: ${transcribedQuestion}`);
        ws.send(
          JSON.stringify({
            error: "",
            transcript: transcribedQuestion,
            transcriptDone: false,
          }),
        );
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
          const finalAnswer = await anthropicClient.sendMessageWithStream(
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

      inactivityTimer = setTimeout(async () => {
        // Timeout triggered, indicating no more audio buffers are coming
        logger.debug(
          `No more audio buffers received for session ${sessionId}. Assuming the client is done.`,
        );

        if (currentAudioBuffer.length > 0) {
          let finalTranscription = "";
          try {
            finalTranscription = await returnTextFromAudioBuffer(currentAudioBuffer, sessionId, true);
          } catch (e) {
            logger.warn("Error in getting final transcription ", e);
          }
          currentAudioBuffer = Buffer.from([]);

          ws.send(
            JSON.stringify({
              error: "",
              transcript: finalTranscription,
              transcriptDone: true,
            }),
          );
        }
      }, MAX_INACTIVITY_TIME);
    });

    ws.on("close", () => {
      logger.info("Client disconnected.");
    });

    ws.on("error", (error: Error) => {
      logger.error("WebSocket error:", error);
    });
  });
}
