import { motion, useReducedMotion } from 'motion/react';
import type { GoldenReplayFrameV1 } from '@loopin/demo-scenarios';

const routeMinimum = 8_500;
const routeMaximum = 11_500;
const xFor = (progress: number) => 80 + Math.max(0, Math.min(1, (progress - routeMinimum) / (routeMaximum - routeMinimum))) * 840;

export function SchematicRouteRenderer({ frame }: { readonly frame: GoldenReplayFrameV1 }) {
  const reduceMotion = useReducedMotion();
  const nodeById = new Map(frame.nodes.map((node) => [node.memberId, node]));
  return (
    <svg aria-label="Convoy route projection" className="route-canvas" role="img" viewBox="0 0 1000 360">
      <path className="route-canvas__road" d="M50 255C210 155 330 266 478 188C622 112 730 174 950 66" />
      <path className="route-canvas__route" d="M50 255C210 155 330 266 478 188C622 112 730 174 950 66" />
      <text className="route-canvas__direction" x="50" y="315">HÀ NỘI</text>
      <text className="route-canvas__direction" textAnchor="end" x="950" y="315">HẠ LONG →</text>
      {frame.graph.edges.map((edge, index) => {
        const ahead = nodeById.get(edge.aheadMemberId)!;
        const behind = nodeById.get(edge.behindMemberId)!;
        return <line className="route-canvas__edge" data-state={edge.state} key={`${edge.aheadMemberId}-${edge.behindMemberId}`} x1={xFor(behind.routeProgressMeters)} x2={xFor(ahead.routeProgressMeters)} y1={235 - index * 34} y2={201 - index * 34} />;
      })}
      {frame.graph.orderedMemberIds.map((memberId, index) => {
        const node = nodeById.get(memberId)!;
        const x = xFor(node.routeProgressMeters);
        const y = 235 - index * 34;
        return (
          <motion.g animate={{ x, y }} aria-label={`${memberId} vehicle node`} initial={false} key={memberId} transition={reduceMotion ? { duration: 0 } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <circle className="route-canvas__halo" data-confidence={node.confidence} r={node.accuracyMeters > 50 ? 22 : 14} />
            <circle className="route-canvas__node" data-confidence={node.confidence} r="8" />
            <text className="route-canvas__label" textAnchor="middle" y="-19">{memberId}</text>
          </motion.g>
        );
      })}
    </svg>
  );
}
