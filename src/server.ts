import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import websocketClient from "./websocket/client";
import configs from "./config";
import Logger from "./utils/logger";
import EventEmitter from "events";
import connectDB from "./config/db";
import { connectRedis } from "./config/redis";
import uploadDeckRoute from "./routes/uploadDeckRoute";
import cancelPitchSessionRoute from "./routes/cancelPitchSessionRoute";
import getPitchSessionsByAdminRoute from "./routes/getPitchSessionsByAdminRoute";
import swaggerUi from "swagger-ui-express";
import { swaggerSpecs } from "./config/swagger";
import cors from "cors";
import getSessionStatsRoute from "./routes/getSessionStatsRoute";
import getPitchSessionsByUserRoute from "./routes/getPitchSessionsByUserRoute";
import getPitchReportRoute from "./routes/getPitchReportRoute";
import getProductUsages from "./routes/getUsageRoute";
import getUserStatsRoute from "./routes/getUserStatsRoute";
import authRoute from "./routes/authRoute";
import finishSessionRoute from "./routes/finishSessionRoute";
import cookieParser from "cookie-parser";
import { handleSuccess } from "./utils/responseHandler";

// Initialize express app
const app = express();
const port = configs.PORT;
const allowedOrigins = configs.ALLOWED_ORIGINS;
// Set global max listener limit
EventEmitter.defaultMaxListeners = 20;

connectDB();
connectRedis();

// Configure CORS
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from the uploads directory
app.use("/uploads", express.static(configs.UPLOADS_DIR));

// Redirect /docs to /pitch-simulator/docs
app.get("/docs", (req, res) => {
  res.redirect("/pitch-simulator/docs");
});

// Routes
app.use("/pitch-simulator/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
app.use("/pitch-simulator/api/v1/auth", authRoute);
app.use("/pitch-simulator/api/v1/upload", uploadDeckRoute);
app.use("/pitch-simulator/api/v1/sessions", getPitchSessionsByUserRoute);
app.use("/pitch-simulator/api/v1/sessions", getUserStatsRoute);
app.use("/pitch-simulator/api/v1/cancel", cancelPitchSessionRoute);
app.use("/pitch-simulator/api/v1/finish", finishSessionRoute);
app.use("/pitch-simulator/api/v1/report", getPitchReportRoute);
app.use("/pitch-simulator/api/v1/pitch", getProductUsages);
app.use(
  "/pitch-simulator/ms-get-usage-metrics",
  getPitchSessionsByAdminRoute,
);
app.use("/pitch-simulator/ms-get-usage-metrics", getSessionStatsRoute);

// Base route
app.get("/pitch-simulator", (req, res) => {
  handleSuccess(res, "Pitch Simulator Healthy ✅", {
    uptime: process.uptime(),
    timestamp: new Date().toLocaleString(),
  });
});

// Create an HTTP server to handle WebSocket upgrade requests
const server = http.createServer(app);

// Create and attach the WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });

// Handle WebSocket connections
websocketClient(wss);

// Start the HTTP server
server.listen(port, () => {
  Logger.info(`Server running on port ${port}`);
});
