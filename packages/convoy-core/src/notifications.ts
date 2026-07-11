import type { ConvoyGraph, NotificationRequest, Situation } from "./contracts";

type Locale = "en" | "vi";
type LocaleByMember = Readonly<Record<string, Locale>>;

function formatGap(routeGapMeters: number): string {
  if (routeGapMeters >= 1_000) return `${(routeGapMeters / 1_000).toFixed(1)} km`;
  return `${Math.round(routeGapMeters / 10) * 10} m`;
}

function expiry(createdAt: string, minutes: number): string {
  return new Date(Date.parse(createdAt) + minutes * 60_000).toISOString();
}

function notification(
  situation: Situation,
  graph: ConvoyGraph,
  recipientMemberId: string,
  locale: Locale,
  audience: NotificationRequest["audience"],
  message: string,
  transition: "confirmed" | "resolved",
): NotificationRequest {
  const dedupeKey = `${situation.situationId}:${transition}:${recipientMemberId}:${locale}`;
  return {
    notificationId: `notification:${dedupeKey}`,
    dedupeKey,
    situationId: situation.situationId,
    recipientMemberId,
    locale,
    audience,
    severity: transition === "resolved" ? "info" : situation.severity,
    message,
    graphRevision: graph.graphRevision,
    createdAt: graph.calculatedAt,
    expiresAt: expiry(graph.calculatedAt, transition === "resolved" ? 2 : 5),
    channels: transition === "resolved" ? ["visual", "voice"] : ["visual", "voice", "haptic", "push"],
  };
}

function splitMessage(audience: NotificationRequest["audience"], locale: Locale, gap: string, situation: Situation): string {
  const front = situation.evidence.frontBoundaryMemberId ?? "front boundary";
  const rear = situation.evidence.rearBoundaryMemberId ?? "rear boundary";
  if (locale === "vi") {
    switch (audience) {
      case "leader": return `Đoàn xe tách giữa ${front} và ${rear}; khoảng cách theo tuyến ${gap}. Hãy điều phối tại điểm dừng đã được phê duyệt.`;
      case "front-section": return `Đoạn phía sau cách khoảng ${gap}. Duy trì nhịp độ an toàn trong khi trưởng đoàn điều phối.`;
      case "front-boundary": return `Đoạn theo sau cách khoảng ${gap}. Tiếp tục an toàn và không dừng đột ngột.`;
      case "rear-boundary": return `Bạn đang ở ranh giới sau; đoạn phía trước cách khoảng ${gap}. Giữ tốc độ an toàn và không vội đuổi theo.`;
      case "rear-section": return `Đoạn của bạn cách phía trước khoảng ${gap}. Tiếp tục an toàn trên tuyến đã định.`;
      default: return `Đoàn xe cách nhau khoảng ${gap}. Tiếp tục di chuyển an toàn.`;
    }
  }

  switch (audience) {
    case "leader": return `Convoy split between ${front} and ${rear}; route gap ${gap}. Coordinate a safe regroup at an approved stop.`;
    case "front-section": return `The rear section is about ${gap} behind. Maintain a safe pace while the leader coordinates.`;
    case "front-boundary": return `The following section is about ${gap} behind you. Continue safely and do not stop suddenly.`;
    case "rear-boundary": return `The front section is about ${gap} ahead. Maintain a safe pace and do not rush to catch up.`;
    case "rear-section": return `Your section is about ${gap} behind the front section. Continue safely on the planned route.`;
    default: return `The convoy sections are about ${gap} apart. Continue safely.`;
  }
}

export function createSplitNotifications(
  situation: Situation,
  graph: ConvoyGraph,
  localeByMember: LocaleByMember,
): NotificationRequest[] {
  const frontBoundary = situation.evidence.frontBoundaryMemberId;
  const rearBoundary = situation.evidence.rearBoundaryMemberId;
  const frontComponent = graph.components.find((component) => frontBoundary && component.memberIds.includes(frontBoundary));
  const rearComponent = graph.components.find((component) => rearBoundary && component.memberIds.includes(rearBoundary));
  if (!frontComponent || !rearComponent || situation.evidence.routeGapMeters === undefined) return [];
  const gap = formatGap(situation.evidence.routeGapMeters);

  return graph.orderedMemberIds.map((memberId) => {
    const audience: NotificationRequest["audience"] = memberId === graph.leaderMemberId
      ? "leader"
      : memberId === frontBoundary
        ? "front-boundary"
        : memberId === rearBoundary
          ? "rear-boundary"
          : frontComponent.memberIds.includes(memberId)
            ? "front-section"
            : "rear-section";
    const locale = localeByMember[memberId] ?? "en";
    return notification(situation, graph, memberId, locale, audience, splitMessage(audience, locale, gap, situation), "confirmed");
  });
}

export function createResolutionNotifications(
  situation: Situation,
  graph: ConvoyGraph,
  localeByMember: LocaleByMember,
): NotificationRequest[] {
  return graph.orderedMemberIds.map((memberId) => {
    const locale = localeByMember[memberId] ?? "en";
    const message = locale === "vi"
      ? "Đoàn xe đã kết nối lại. Tiếp tục hành trình an toàn."
      : "The convoy is together again. Continue the journey safely.";
    return notification(situation, graph, memberId, locale, "resolution", message, "resolved");
  });
}
