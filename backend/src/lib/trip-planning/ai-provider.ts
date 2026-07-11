import type { 
  TripPlanningRequestV1, 
  TripPlanningIntentV1, 
  TripPlanningPoiCandidateV1, 
  TripPlanningItineraryV1 
} from "@loopin/contracts";

export interface TripPlanningAiProvider {
  parseIntent(input: TripPlanningRequestV1): Promise<TripPlanningIntentV1>;
  
  generateItinerary(input: {
    request: TripPlanningRequestV1;
    intent: TripPlanningIntentV1;
    candidates: TripPlanningPoiCandidateV1[];
    routeContext?: unknown;
  }): Promise<TripPlanningItineraryV1>;
}
