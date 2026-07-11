import { ArrowUpRight, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TascoPlaceRef } from '../../api/types';

export function PlacePreview({ place }: { readonly place: TascoPlaceRef }) {
  return <article className="place-preview"><div className="place-preview__image" aria-hidden="true" /><div><span className="place-preview__source">Tasco place</span><h3><Link to={`/app/places/${place.id}`}>{place.name}</Link></h3><p><MapPin aria-hidden="true" />{place.address}</p><div className="place-preview__meta"><span>{place.categories.slice(0, 2).join(' · ')}</span>{place.ratingSummary ? <span><Star aria-hidden="true" />{place.ratingSummary.average} provider summary</span> : null}</div><Link aria-label={`Open ${place.name}`} to={`/app/places/${place.id}`}><ArrowUpRight aria-hidden="true" /></Link></div></article>;
}
