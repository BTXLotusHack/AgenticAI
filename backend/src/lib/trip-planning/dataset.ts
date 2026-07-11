import * as fs from "node:fs/promises";
import * as readline from "node:readline";
import type { TripPlanningPoiCandidateV1, LocationConfidence } from "@loopin/contracts";

export interface TripPlanningPlaceRow {
  place_id: string;
  name: string;
  place_type: string;
  query_group: string;
  corridor_id: string;
  segment_id: string;
  location_id: string;
  latitude: number;
  longitude: number;
  address?: string;
  categories?: string[];
  rating?: number;
  reviews_count?: number;
  permanently_closed?: boolean;
  source_confidence?: number;
  eligible_for_ai_destination_suggestions?: boolean;
}

export interface FilterOptions {
  corridorId?: string;
  segmentId?: string;
  locationId?: string;
  minConfidence?: number;
  queryGroups?: string[];
  interests?: string[];
  boundingBox?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

export interface ScoreOptions {
  interests?: string[];
  preferredQueryGroups?: string[];
}

export function parseTripPlanningPlaceRow(row: any): TripPlanningPoiCandidateV1 | null {
  if (row.permanently_closed === true) return null;
  if (row.eligible_for_ai_destination_suggestions === false) return null;
  if (typeof row.latitude !== "number" || typeof row.longitude !== "number") return null;

  let confidence: LocationConfidence = "low";
  if (row.source_confidence >= 0.8) confidence = "high";
  else if (row.source_confidence >= 0.5) confidence = "medium";

  return {
    schemaVersion: 1,
    sourcePlaceId: row.place_id || `unknown-${Math.random()}`,
    name: row.name || "Unknown Place",
    type: row.place_type || "unknown",
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    categories: Array.isArray(row.categories) ? row.categories : [],
    sourceConfidence: confidence,
  };
}

export async function loadTripPlanningPlaces(filePath: string): Promise<TripPlanningPoiCandidateV1[]> {
  const candidates: TripPlanningPoiCandidateV1[] = [];
  const fileHandle = await fs.open(filePath, "r");
  const rl = readline.createInterface({
    input: fileHandle.createReadStream(),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      const parsed = parseTripPlanningPlaceRow(row);
      if (parsed) {
        (parsed as any)._raw = row;
        candidates.push(parsed);
      }
    } catch (e) {
      // Ignore malformed rows
    }
  }

  await fileHandle.close();
  return candidates;
}

export function filterTripPlanningCandidates(
  candidates: TripPlanningPoiCandidateV1[],
  options: FilterOptions
): TripPlanningPoiCandidateV1[] {
  return candidates.filter((c: any) => {
    const raw: TripPlanningPlaceRow = c._raw;
    if (!raw) return true;

    if (options.corridorId && raw.corridor_id !== options.corridorId) return false;
    if (options.segmentId && raw.segment_id !== options.segmentId) return false;
    if (options.locationId && raw.location_id !== options.locationId) return false;

    if (options.minConfidence !== undefined) {
      const score = raw.source_confidence || 0;
      if (score < options.minConfidence) return false;
    }

    if (options.queryGroups && options.queryGroups.length > 0) {
      if (!options.queryGroups.includes(raw.query_group)) return false;
    }

    if (options.boundingBox) {
      if (
        c.latitude < options.boundingBox.minLat ||
        c.latitude > options.boundingBox.maxLat ||
        c.longitude < options.boundingBox.minLon ||
        c.longitude > options.boundingBox.maxLon
      ) {
        return false;
      }
    }

    if (options.interests && options.interests.length > 0) {
      const text = `${c.name} ${c.type} ${(c.categories || []).join(" ")}`.toLowerCase();
      const match = options.interests.some((i) => text.includes(i.toLowerCase()));
      if (!match && raw.query_group !== "fuel" && raw.query_group !== "rest_stop") {
        return false;
      }
    }

    return true;
  });
}

export function scoreTripPlanningCandidate(candidate: TripPlanningPoiCandidateV1, options: ScoreOptions): number {
  const raw: TripPlanningPlaceRow = (candidate as any)._raw || {};
  let score = 0;

  score += (raw.source_confidence || 0) * 10;
  score += ((candidate.categories?.length ? 1 : 0) + (candidate.address ? 1 : 0)) * 2;

  if (candidate.rating) score += candidate.rating * 2;
  if (candidate.reviewsCount) score += Math.min(candidate.reviewsCount / 100, 10);

  if (options.interests && options.interests.length > 0) {
    const text = `${candidate.name} ${candidate.type} ${(candidate.categories || []).join(" ")}`.toLowerCase();
    const matches = options.interests.filter((i) => text.includes(i.toLowerCase())).length;
    score += matches * 5;
  }

  if (options.preferredQueryGroups && raw.query_group) {
    if (options.preferredQueryGroups.includes(raw.query_group)) {
      score += 5;
    }
  }

  if (candidate.sourceConfidence === "low") score -= 10;

  return score;
}
