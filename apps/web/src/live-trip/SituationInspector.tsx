import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GOLDEN_R001, type ReplaySnapshot } from '@loopin/demo-scenarios';
import { RegroupReview } from './RegroupReview';

export function SituationInspector({ snapshot, onApprove }: { readonly snapshot: ReplaySnapshot; readonly onApprove: (candidateId: string) => void }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const frame = snapshot.frame;
  const approved = GOLDEN_R001.candidates.find((candidate) => candidate.poiId === snapshot.approvedCandidateId);
  let content: React.ReactNode;

  if ((snapshot.phase === 'recovering' || snapshot.phase === 'completed') && approved) {
    content = <><p className="product-kicker">Approved action</p><h2>Regroup approved</h2><p className="inspector-lede"><strong>{approved.name}</strong> is the verified forward stop. The convoy is reconnecting without catch-up instructions.</p><dl className="evidence-grid"><div><dt>Candidate</dt><dd>{approved.poiId}</dd></div><div><dt>Policy</dt><dd>{frame.graph.policyVersion}</dd></div></dl></>;
  } else if (snapshot.phase === 'degraded') {
    content = <><p className="product-kicker">Confidence gate</p><h2>Signal check</h2><p className="inspector-lede">M004 reports 100 m accuracy. Location confidence is degraded, so no split is confirmed and pending persistence is reset.</p><dl className="evidence-grid"><div><dt>Graph</dt><dd>Degraded</dd></div><div><dt>Action</dt><dd>Observe only</dd></div></dl></>;
  } else if (snapshot.phase === 'split' && frame.situation && frame.regroupRanking) {
    const evidence = frame.situation.evidence;
    content = <><p className="product-kicker">Confirmed situation</p><h2>Convoy split</h2><p className="inspector-boundary">{evidence.frontBoundaryMemberId} <span>→</span> {evidence.rearBoundaryMemberId}</p><dl className="evidence-grid"><div><dt>Route gap</dt><dd>{evidence.routeGapMeters} m</dd></div><div><dt>Confidence</dt><dd>{evidence.locationConfidence} confidence</dd></div><div><dt>Evidence</dt><dd>Revision {evidence.graphRevision}</dd></div><div><dt>Policy</dt><dd>{frame.situation.policyVersion}</dd></div></dl><div className="component-evidence"><div><span>Front section</span><strong>{frame.graph.components[0]?.memberIds.join(', ')}</strong></div><div><span>Rear section</span><strong>{frame.graph.components[1]?.memberIds.join(', ')}</strong></div></div><div className="notification-evidence"><h3>Messages sent</h3><ul>{frame.notifications.map((notification) => <li aria-label={`Notification for ${notification.recipientMemberId}`} key={notification.notificationId}><span>{notification.audience.replace('-', ' ')}</span><p>{notification.message}</p></li>)}</ul></div>{reviewOpen ? <RegroupReview onApprove={onApprove} ranking={frame.regroupRanking} /> : <button className="button button--primary inspector-action" onClick={() => setReviewOpen(true)} type="button">Review regroup points</button>}</>;
  } else {
    content = <><p className="product-kicker">Trip context</p><h2>Convoy on R001</h2><p className="inspector-lede">The group is ordered by route progress. Step through the replay to inspect confidence, separation, and regroup decisions.</p><dl className="evidence-grid"><div><dt>Components</dt><dd>{frame.graph.components.length}</dd></div><div><dt>Policy</dt><dd>{frame.graph.policyVersion}</dd></div></dl></>;
  }

  return <motion.aside animate={{ opacity: 1, x: 0 }} aria-label="Trip inspector" className="trip-inspector" initial={reduceMotion ? false : { opacity: 0, x: 18 }} key={`${snapshot.phase}-${snapshot.frameIndex}`} transition={{ duration: reduceMotion ? 0 : .24 }}>{content}</motion.aside>;
}
