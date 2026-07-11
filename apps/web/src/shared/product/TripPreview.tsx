import { ArrowUpRight, Clock3, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TripPlanSummary } from '../../api/types';

export function TripPreview({ emphasis = false, trip }: { readonly emphasis?: boolean; readonly trip: TripPlanSummary }) {
  const departure = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(trip.departureTime));
  return <article className="trip-preview" data-emphasis={emphasis}>
    <div className="trip-preview__image" aria-hidden="true" />
    <div className="trip-preview__content">
      <div className="trip-preview__meta"><span>{trip.lifecycleState}</span><span>{trip.stale ? 'Route needs refresh' : 'Route verified'}</span></div>
      <h3><Link to={`/app/trips/${trip.id}`}>{trip.title}</Link></h3>
      <p className="trip-preview__route"><MapPin aria-hidden="true" />{trip.route.origin.name}<span>→</span>{trip.route.destination.name}</p>
      <div className="trip-preview__facts"><span><Clock3 aria-hidden="true" />{departure}</span><span><Users aria-hidden="true" />{trip.memberCount} travelers</span><span>{Math.round(trip.route.distanceMeters / 1000)} km</span></div>
      <p className="trip-preview__readiness">{trip.readinessSummary}</p>
      <Link className="trip-preview__action" to={`/app/trips/${trip.id}`}>{emphasis ? 'Continue planning' : 'Open trip'}<ArrowUpRight aria-hidden="true" /></Link>
    </div>
  </article>;
}
