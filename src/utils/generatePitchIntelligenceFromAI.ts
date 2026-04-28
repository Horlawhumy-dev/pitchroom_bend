import { GoogleGenAI, Type, Schema } from "@google/genai";
import configs from "../config";
import Logger from "./logger";
import { InsightAIResponseType } from "../utils/interface";

const ai = new GoogleGenAI({
  apiKey: configs.GEMINI_API_KEY as string,
});

const pitchReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    storyClarity: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Score from 1 to 10" },
        feedback: { type: Type.STRING },
      },
      required: ["score", "feedback"],
    },
    marketCredibility: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Score from 1 to 10" },
        feedback: { type: Type.STRING },
      },
      required: ["score", "feedback"],
    },
    founderConfidence: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Score from 1 to 10" },
        feedback: { type: Type.STRING },
      },
      required: ["score", "feedback"],
    },
    competitiveAdvantage: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Score from 1 to 10" },
        feedback: { type: Type.STRING },
      },
      required: ["score", "feedback"],
    },
    businessModel: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Score from 1 to 10" },
        feedback: { type: Type.STRING },
      },
      required: ["score", "feedback"],
    },
    tractionEvidence: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER, description: "Score from 1 to 10" },
        feedback: { type: Type.STRING },
      },
      required: ["score", "feedback"],
    },
    investorRiskSignals: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of investor risk signal red flags",
    },
    overallSummary: { type: Type.STRING },
    actionableSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-5 high-impact next steps for the founder",
    },
  },
  required: [
    "storyClarity",
    "marketCredibility",
    "founderConfidence",
    "competitiveAdvantage",
    "businessModel",
    "tractionEvidence",
    "investorRiskSignals",
    "overallSummary",
    "actionableSteps",
  ],
};

export async function generatePitchIntelligenceFromAI(
  sessionId: string,
  logs: { question: string; answer: string }[],
  pitchStage: string,
): Promise<InsightAIResponseType | null> {
  const formattedTranscript = logs
    .map((log) => `Investor: ${log.question}\nFounder: ${log.answer}`)
    .join("\n\n");

  const systemPrompt = `
# ROLE: SENIOR VENTURE CAPITAL PARTNER
You are a lead partner at a top-tier VC firm (e.g., Sequoia, Andreessen Horowitz). Your goal is to conduct a post-mortem analysis of a startup pitch simulation.

# EVALUATION CRITERIA

## 1. Story Clarity
- How effectively did the founder articulate the "Problem-Solution" fit?
- Is the narrative compelling or buried in jargon?

## 2. Market Credibility
- Does the founder demonstrate deep knowledge of the TAM/SAM/SOM?
- Is the market entry strategy realistic?

## 3. Founder Confidence
- Did the founder handle tough interrogation without becoming defensive?
- Did they project authority and domain expertise?

## 4. Competitive Advantage (The Moat)
- What is the defensible unique value proposition?
- Why can't a Big Tech player or a fast-follower destroy this business in 6 months?

## 5. Business Model Robustness
- Are the unit economics sound?
- Is the revenue model scalable and high-margin?

## 6. Traction Evidence
- How well did the founder prove that people actually want this? (LOIs, Pilots, Revenue, User Growth)

# OUTPUT GUIDELINES
- ADDRESS THE FOUNDER DIRECTLY (Use "You" and "Your").
- BE BRUTALLY HONEST: This is a training ground. High scores must be earned.
- CITE THE TRANSCRIPT: Refer to specific answers provided by the founder.
- ACTIONABLE STEPS: Provide exactly 3-5 concrete things the founder should do or change before their next real pitch.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Session ID: ${sessionId}\nPitch Stage: ${pitchStage}\n\nTRANSCRIPT:\n${formattedTranscript}`,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: pitchReportSchema,
      },
    });

    if (!response.text) {
      Logger.error(`Empty response from Gemini for session ${sessionId}`);
      return null;
    }

    const structuredData = JSON.parse(response.text) as InsightAIResponseType;
    
    Logger.info(
      `AI Pitch Intelligence response for ${sessionId}:`,
      structuredData,
    );

    return structuredData;
  } catch (error: any) {
    Logger.error(`Failed to generate pitch intelligence for session ${sessionId}:`, error);
    return null;
  }
}

