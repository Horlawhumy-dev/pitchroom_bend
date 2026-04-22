import Anthropic from "@anthropic-ai/sdk";
import configs from "../config";
import Logger from "./logger";
import { InsightAIResponseType } from "../utils/interface";

const anthropic = new Anthropic({
  apiKey: configs.ANTHROPIC_API_KEY as string,
});

const pitchReportTool: Anthropic.Tool = {
  name: "pitch_report",
  description: "Generate a structured pitch intelligence report with scores and feedback.",
  input_schema: {
    type: "object" as const,
    properties: {
      storyClarity: {
        type: "object",
        properties: {
          score: { type: "number", description: "Score from 1 to 10" },
          feedback: { type: "string" },
        },
        required: ["score", "feedback"],
      },
      marketCredibility: {
        type: "object",
        properties: {
          score: { type: "number", description: "Score from 1 to 10" },
          feedback: { type: "string" },
        },
        required: ["score", "feedback"],
      },
      founderConfidence: {
        type: "object",
        properties: {
          score: { type: "number", description: "Score from 1 to 10" },
          feedback: { type: "string" },
        },
        required: ["score", "feedback"],
      },
      competitiveAdvantage: {
        type: "object",
        properties: {
          score: { type: "number", description: "Score from 1 to 10" },
          feedback: { type: "string" },
        },
        required: ["score", "feedback"],
      },
      businessModel: {
        type: "object",
        properties: {
          score: { type: "number", description: "Score from 1 to 10" },
          feedback: { type: "string" },
        },
        required: ["score", "feedback"],
      },
      tractionEvidence: {
        type: "object",
        properties: {
          score: { type: "number", description: "Score from 1 to 10" },
          feedback: { type: "string" },
        },
        required: ["score", "feedback"],
      },
      investorRiskSignals: {
        type: "array",
        items: { type: "string" },
        description: "List of investor risk signal red flags",
      },
      overallSummary: { type: "string" },
      actionableSteps: {
        type: "array",
        items: { type: "string" },
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
  },
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

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { 
        role: "user", 
        content: `Session ID: ${sessionId}\nPitch Stage: ${pitchStage}\n\nTRANSCRIPT:\n${formattedTranscript}` 
      }
    ],
    tools: [pitchReportTool],
    tool_choice: { type: "tool", name: "pitch_report" },
  });

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  if (!toolUseBlock) {
    Logger.error(`No tool use block in Anthropic response for session ${sessionId}`);
    return null;
  }

  Logger.info(
    `AI Pitch Intelligence response for ${sessionId}:`,
    toolUseBlock.input,
  );

  return toolUseBlock.input as InsightAIResponseType;
}
