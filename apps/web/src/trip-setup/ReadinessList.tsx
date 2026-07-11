import { GOLDEN_R001 } from '@loopin/demo-scenarios';
import type { DemoSessionV1 } from '../demo-session/schema';

export function ReadinessList({
  consents,
  onConsentChange,
}: {
  readonly consents: DemoSessionV1['consents'];
  readonly onConsentChange: (memberId: keyof DemoSessionV1['consents'], checked: boolean) => void;
}) {
  return (
    <section aria-labelledby="readiness-title" className="setup-readiness">
      <div className="setup-section-heading">
        <div><p className="product-kicker">Before departure</p><h2 id="readiness-title">Member readiness</h2></div>
        <p>Every driver controls trip-scoped location sharing.</p>
      </div>
      <div className="readiness-table-wrap">
        <table aria-label="Member readiness">
          <thead><tr><th>Member</th><th>Vehicle</th><th>Location</th><th>GPS</th><th>Voice</th><th>Battery</th></tr></thead>
          <tbody>
            {GOLDEN_R001.members.map((member) => (
              <tr key={member.memberId}>
                <th scope="row"><strong>{member.name}</strong><span>{member.role === 'leader' ? 'Trip leader' : member.memberId}</span></th>
                <td>{member.vehicleLabel}</td>
                <td>
                  <label className="consent-toggle">
                    <input
                      aria-label={`Share location for ${member.name}`}
                      checked={consents[member.memberId]}
                      onChange={(event) => onConsentChange(member.memberId, event.currentTarget.checked)}
                      type="checkbox"
                    />
                    <span>{consents[member.memberId] ? member.privacySetting : 'Paused'}</span>
                  </label>
                </td>
                <td><span className="status-copy status-copy--ready">Ready</span></td>
                <td><span className={member.voiceEnabled ? 'status-copy status-copy--ready' : 'status-copy'}>{member.voiceEnabled ? 'Voice ready' : 'Voice off'}</span></td>
                <td>{member.batteryPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
