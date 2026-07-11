import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { TripPlanningAiProvider } from "./ai-provider.js";
import type { 
  TripPlanningRequestV1, 
  TripPlanningIntentV1, 
  TripPlanningPoiCandidateV1, 
  TripPlanningItineraryV1 
} from "@loopin/contracts";

export class BedrockTripPlanner implements TripPlanningAiProvider {
  private bedrock: BedrockRuntimeClient;

  constructor() {
    this.bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  async parseIntent(input: TripPlanningRequestV1): Promise<TripPlanningIntentV1> {
    const systemPrompt = `You are a trip planning assistant. Analyze the user's trip request and extract intent.
Return ONLY a raw JSON object adhering to this exact schema (no markdown, no extra text):
{
  "schemaVersion": 1,
  "extractedOrigin": "City/Region name",
  "extractedDestination": "City/Region name",
  "primaryCategories": ["string array of place types"],
  "suggestedMaxStopsPerDay": number,
  "searchBoundingBox": { "minLat": number, "minLon": number, "maxLat": number, "maxLon": number }
}`;

    const prompt = `Request: ${JSON.stringify(input)}`;

    const command = new InvokeModelCommand({
      modelId: process.env.BEDROCK_TRIP_PLANNER_MODEL || "anthropic.claude-3-haiku-20240307-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0,
      }),
    });

    const response = await this.bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content?.[0]?.text;

    if (!content) {
      throw new Error("Empty response from Bedrock");
    }

    // Attempt to extract JSON from potential markdown wrapping, though we instructed it not to.
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
    }

    return JSON.parse(jsonStr) as TripPlanningIntentV1;
  }

  async generateItinerary(input: {
    request: TripPlanningRequestV1;
    intent: TripPlanningIntentV1;
    candidates: TripPlanningPoiCandidateV1[];
    routeContext?: unknown;
  }): Promise<TripPlanningItineraryV1> {
    const candidatesSummary = input.candidates.map((c) => ({
      id: c.sourcePlaceId,
      name: c.name,
      type: c.type,
      rating: c.rating,
      reviews: c.reviewsCount,
      address: c.address,
    }));

    const systemPrompt = `You are a trip planning assistant. Create an itinerary for the user based ONLY on the provided place candidates.
DO NOT invent any places. Every stop MUST use a 'sourcePlaceId' from the candidates list.
Return ONLY a raw JSON object matching the TripPlanningItineraryV1 schema. Do not wrap in markdown or add explanations.

Schema:
{
  "schemaVersion": 1,
  "planId": "uuid-or-id",
  "title": "...",
  "summary": "...",
  "days": [
    {
      "schemaVersion": 1,
      "dayNumber": 1,
      "date": "ISO",
      "theme": "...",
      "stops": [
        {
          "schemaVersion": 1,
          "sourcePlaceId": "MUST BE FROM ALLOWED CANDIDATES",
          "name": "...",
          "type": "...",
          "latitude": number,
          "longitude": number,
          "plannedStartTime": "ISO",
          "plannedDurationMinutes": 60,
          "reason": "...",
          "sourceConfidence": "high|medium|low",
          "routeValidationStatus": "not_checked"
        }
      ]
    }
  ],
  "warnings": [],
  "rejectedCandidates": []
}`;

    const prompt = `User Request: ${JSON.stringify(input.request)}
Parsed Intent: ${JSON.stringify(input.intent)}
Route Context: ${JSON.stringify(input.routeContext)}

Allowed Place Candidates:
${JSON.stringify(candidatesSummary)}`;

    const command = new InvokeModelCommand({
      modelId: process.env.BEDROCK_TRIP_PLANNER_MODEL || "anthropic.claude-3-sonnet-20240229-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    const response = await this.bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content?.[0]?.text;

    if (!content) {
      throw new Error("Empty response from Bedrock");
    }

    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
    }

    const itinerary = JSON.parse(jsonStr) as TripPlanningItineraryV1;
    
    // Quick validation to ensure IDs match
    const validIds = new Set(input.candidates.map(c => c.sourcePlaceId));
    for (const day of itinerary.days) {
      for (const stop of day.stops) {
        if (!validIds.has(stop.sourcePlaceId)) {
          throw new Error(`Bedrock hallucinated place ID: ${stop.sourcePlaceId}`);
        }
      }
    }

    return itinerary;
  }
}
