import { useQuery } from '@tanstack/react-query';
import {
  getLiveTrip,
  getLocationVisibilityPolicy,
  getPlace,
  getPlaceCommunitySummary,
  getTrip,
  listTeamMembers,
  listTeams,
  listTrips,
  searchPlaces,
} from './fixtures';

export function useTrips() {
  return useQuery({ queryKey: ['trips'], queryFn: listTrips });
}

export function useTrip(tripId: string) {
  return useQuery({ queryKey: ['trip', tripId], queryFn: () => getTrip(tripId) });
}

export function usePlaceSearch(query: string) {
  return useQuery({ queryKey: ['places', query], queryFn: () => searchPlaces(query) });
}

export function usePlace(placeId: string) {
  return useQuery({ queryKey: ['place', placeId], queryFn: () => getPlace(placeId) });
}

export function useLiveTrip(tripId: string) {
  return useQuery({ queryKey: ['live-trip', tripId], queryFn: () => getLiveTrip(tripId) });
}

export function usePlaceCommunitySummary(placeId: string) {
  return useQuery({
    queryKey: ['place-community-summary', placeId],
    queryFn: () => getPlaceCommunitySummary(placeId),
  });
}

export function useLocationVisibilityPolicy() {
  return useQuery({ queryKey: ['location-visibility-policy'], queryFn: getLocationVisibilityPolicy });
}

export function useTeams() {
  return useQuery({ queryKey: ['teams'], queryFn: listTeams });
}

export function useTeamMembers(teamId: string) {
  return useQuery({ queryKey: ['team-members', teamId], queryFn: () => listTeamMembers(teamId) });
}
