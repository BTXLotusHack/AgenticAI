import { MapPin } from 'lucide-react';
import type { TripPlanSummary } from '../../api/types';

export function RouteTimeline({ trip }: { readonly trip: TripPlanSummary }) {
  const points = [trip.route.origin, ...trip.route.stops.map((stop) => stop.place), trip.route.destination];
  return <ol className="route-timeline">{points.map((point, index) => <li key={point.id} data-terminal={index === 0 || index === points.length - 1}><span><MapPin aria-hidden="true" /></span><div><small>{index === 0 ? 'Start' : index === points.length - 1 ? 'Destination' : `Stop ${index}`}</small><strong>{point.name}</strong><p>{point.address}</p></div>{index < points.length - 1 ? <em>Route leg</em> : null}</li>)}</ol>;
}
