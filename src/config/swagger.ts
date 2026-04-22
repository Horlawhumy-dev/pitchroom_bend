import swaggerJsDoc from "swagger-jsdoc";
import configs from ".";

const swaggerOptions: swaggerJsDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AI Investor Pitch Simulator",
      version: "1.0.0",
      description: "API documentation for the AI Investor Pitch Simulator Backend",
    },
    servers: [
      {
        url: "/pitch-simulator",
        description: "API Base Path",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        PitchSession: {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "Unique session identifier",
            },
            deckPath: {
              type: "string",
              nullable: false,
              description: "Pitch deck file uploaded url",
            },
            businessContext: {
              type: "string",
              description: "Description of the business for the pitch",
            },
            user: {
              type: "object",
              properties: {
                email: { type: "string", description: "User's email address" },
                uid: { type: "string", description: "Unique user ID" },
              },
              required: ["email", "uid"],
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the session was created",
            },
          },
          required: ["sessionId", "deckPath", "user"],
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    tags: [
      {
        name: "Auth",
        description: "Authentication and user management endpoints",
      },
      {
        name: "Founders",
        description: "Endpoints for pitch session management and reporting",
      },
      {
        name: "Admins",
        description: "Administrative usage metrics and session management",
      },
      {
        name: "WebSocket",
        description:
          "WebSocket communication for real-time investor interrogation",
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpecs = swaggerJsDoc(swaggerOptions);
