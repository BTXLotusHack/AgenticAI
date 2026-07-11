import { GOLDEN_R001, type GoldenReplayFrameV1 } from '@loopin/demo-scenarios';

export function ConvoyRail({ frame }: { readonly frame: GoldenReplayFrameV1 }) {
  const nodeById = new Map(frame.nodes.map((node) => [node.memberId, node]));
  const memberById = new Map<string, (typeof GOLDEN_R001.members)[number]>(
    GOLDEN_R001.members.map((member) => [member.memberId, member]),
  );
  const boundary = frame.situation?.evidence;
  return (
    <aside className="convoy-rail">
      <div className="workspace-heading"><p>Convoy order</p><span>Route progress</span></div>
      <ol aria-label="Ordered convoy">
        {frame.graph.orderedMemberIds.map((memberId, index) => {
          const member = memberById.get(memberId)!;
          const node = nodeById.get(memberId)!;
          const component = frame.graph.components.findIndex((item) => item.memberIds.includes(memberId));
          const boundaryRole = boundary?.frontBoundaryMemberId === memberId ? 'Front boundary' : boundary?.rearBoundaryMemberId === memberId ? 'Rear boundary' : null;
          return (
            <li aria-label={`${member.name}, ${member.vehicleLabel}`} data-member-id={memberId} key={memberId}>
              <span className="convoy-rail__order">0{index + 1}</span>
              <div className="convoy-rail__member"><strong>{member.name}</strong><span>{member.vehicleLabel} · {member.role === 'leader' ? 'Leader' : `Component ${component + 1}`}</span></div>
              <div className="convoy-rail__telemetry"><strong>{node.speedKmh ?? 0} km/h</strong><span>{node.confidence} confidence · {Math.round(node.accuracyMeters)} m accuracy</span></div>
              <span className="convoy-rail__connection" data-confidence={node.confidence}>{boundaryRole ?? node.connectivity}</span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
