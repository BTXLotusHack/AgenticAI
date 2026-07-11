import type { GoldenReplayFrameV1 } from '@loopin/demo-scenarios';

export function TripTimeline({ frames }: { readonly frames: readonly GoldenReplayFrameV1[] }) {
  const events = [
    { frame: frames[0], label: 'Together', detail: 'Four vehicles connected on R001.' },
    { frame: frames[1], label: 'Weak GPS', detail: 'M004 degraded; no split confirmed.' },
    { frame: frames.find((item) => item.phase === 'stretched'), label: 'Stretched', detail: 'Boundary persistence begins.' },
    { frame: frames.find((item) => item.phase === 'split'), label: 'Split', detail: 'M003 → M004 confirmed at 900 m.' },
    { frame: frames.find((item) => item.phase === 'recovering'), label: 'Regroup approved', detail: 'POI001 · Minh Châu Rest Stop.' },
    { frame: frames.at(-1), label: 'Reconnected', detail: 'One connected component restored.' },
  ];
  return (
    <ol aria-label="Trip event timeline" className="summary-timeline">
      {events.map((event) => <li key={event.label}><time>{event.frame?.occurredAt.slice(11, 19)}</time><i aria-hidden="true" /><div><strong>{event.label}</strong><p>{event.detail}</p></div></li>)}
    </ol>
  );
}
