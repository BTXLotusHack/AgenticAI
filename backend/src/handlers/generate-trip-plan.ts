import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import { TripPlanningRequestV1Schema } from "@loopin/contracts";
import type { TripPlanningValidationResultV1, TripPlanningRequestV1 } from "@loopin/contracts";
import { getCaller, parseBody } from "../lib/http/request.js";
import { error, ok, HttpError } from "../lib/http/response.js";
import { logger } from "../lib/logger.js";
import { BedrockTripPlanner } from "../lib/trip-planning/bedrock-provider.js";
import { loadTripPlanningPlaces, filterTripPlanningCandidates } from "../lib/trip-planning/dataset.js";
import * as path from "path";

const aiPlanner = new BedrockTripPlanner();

// Cache candidates in memory for the lifetime of the Lambda execution environment
let cachedCandidates: any[] | null = null;
const datasetPath = path.resolve(
  process.env.DATASET_PATH || "../../data_pipeline/apify_roadtrip_pipeline_v2/data/processed/clean_pois.json"
);

async function getCandidates() {
  if (!cachedCandidates) {
    logger.info("loading_poi_dataset", { path: datasetPath });
    try {
      cachedCandidates = await loadTripPlanningPlaces(datasetPath);
      logger.info("poi_dataset_loaded", { count: cachedCandidates.length });
    } catch (err) {
      logger.error("poi_dataset_load_failed", { err });
      cachedCandidates = [];
    }
  }
  return cachedCandidates;
}

export const handler: Handler<
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2
> = async (event) => {
  try {
    const caller = getCaller(event);
    const request = parseBody(event, TripPlanningRequestV1Schema as any) as TripPlanningRequestV1;

    logger.info("trip_plan_requested", { userId: caller.userId, origin: request.origin, destination: request.destination });

    // 1. Extract Intent
    const intent = await aiPlanner.parseIntent(request);

    // 2. Fetch Candidates
    const allCandidates = await getCandidates();
    let candidates = allCandidates;

    if (intent.searchBoundingBox) {
      candidates = filterTripPlanningCandidates(candidates, {
        boundingBox: intent.searchBoundingBox,
        interests: request.interests,
      });
    }

    // Ensure we don't pass too many candidates to the prompt (e.g., limit to top 100)
    candidates = candidates.slice(0, 100);

    // 3. Generate Itinerary
    const itinerary = await aiPlanner.generateItinerary({
      request,
      intent,
      candidates,
    });

    // 4. Deterministic Validation
    const validation: TripPlanningValidationResultV1 = {
      schemaVersion: 1,
      status: "valid",
      warnings: [],
      errors: [],
      rejectedStopIds: [],
    };

    let totalStops = 0;
    for (const day of itinerary.days) {
      totalStops += day.stops.length;
      if (request.maxStopsPerDay && day.stops.length > request.maxStopsPerDay) {
        validation.warnings.push(`Day ${day.dayNumber} has ${day.stops.length} stops, which exceeds the preferred max of ${request.maxStopsPerDay}.`);
        validation.status = "valid_with_warnings";
      }
    }

    if (totalStops === 0) {
      validation.status = "invalid";
      validation.errors.push("No stops were planned.");
    }

    itinerary.warnings = [...(itinerary.warnings || []), ...validation.warnings];

    logger.info("trip_plan_generated", { userId: caller.userId, planId: itinerary.planId, valid: validation.status !== "invalid" });

    return ok({
      itinerary,
      validation,
      intent,
    });
  } catch (err) {
    if (err instanceof HttpError) return error(err.statusCode, err.code, err.message);
    logger.error("generate_trip_plan_error", { reason: err instanceof Error ? err.name : "unknown", msg: err instanceof Error ? err.message : undefined });
    return error(500, "internal_error", "Failed to generate trip plan");
  }
};
