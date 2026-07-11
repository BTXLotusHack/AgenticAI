import { useState } from 'react';
import type { RegroupRanking } from '@loopin/convoy-core';

const reasonCopy: Record<string, string> = {
  'illegal': 'Illegal stop',
  'unsafe-stop': 'Unsafe stop',
  'closed': 'Closed',
  'inaccessible': 'Inaccessible',
  'insufficient-parking': 'Insufficient convoy parking',
  'reverse-direction': 'Reverse direction',
  'excessive-detour': 'Excessive detour',
  'low-source-confidence': 'Low source confidence',
};

export function RegroupReview({ ranking, onApprove }: { readonly ranking: RegroupRanking; readonly onApprove: (candidateId: string) => void }) {
  const [selectedId, setSelectedId] = useState(ranking.selectedCandidate?.poiId ?? '');
  const selected = ranking.rankedCandidates.find((candidate) => candidate.poiId === selectedId);
  return (
    <section aria-label="Regroup points" className="regroup-review">
      <div className="inspector-section-heading"><h3>Verified stops ahead</h3><span>{ranking.policyVersion}</span></div>
      <div className="regroup-options">
        {ranking.rankedCandidates.map((candidate, index) => (
          <label className="regroup-option" data-selected={selectedId === candidate.poiId} key={candidate.poiId}>
            <input checked={selectedId === candidate.poiId} name="regroup-candidate" onChange={() => setSelectedId(candidate.poiId)} type="radio" value={candidate.poiId} />
            <span className="regroup-option__rank">0{index + 1}</span>
            <span><strong>{candidate.name}</strong><small>Safety {Math.round(candidate.candidate.safeStopScore * 100)} · Route {Math.round(candidate.candidate.routeCompatibilityScore * 100)} · ETA {Math.round(candidate.maximumMemberEtaSeconds / 60)} min</small></span>
            <b>{Math.round(candidate.score * 100)}</b>
          </label>
        ))}
      </div>
      <div className="regroup-excluded">
        <h3>Excluded</h3>
        <ul>
          {ranking.excludedCandidates.map((excluded) => {
            const candidate = ranking.rankedCandidates.find((item) => item.poiId === excluded.poiId)?.candidate;
            const name = candidate?.name ?? (excluded.poiId === 'POI002' ? 'Highway Shoulder KM62' : excluded.poiId);
            return <li aria-label={name} key={excluded.poiId}><strong>{name}</strong><span>{excluded.reasonCodes.map((reason) => reasonCopy[reason] ?? reason).join(' · ')}</span></li>;
          })}
        </ul>
      </div>
      {selected ? <button className="button button--primary regroup-approve" onClick={() => onApprove(selected.poiId)} type="button">Approve {selected.name}</button> : <p>No verified regroup point is available.</p>}
    </section>
  );
}
