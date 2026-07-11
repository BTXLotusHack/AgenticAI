import 'package:flutter/material.dart';

import '../../app/loopin_theme.dart';
import 'live_trip_view_model.dart';

final class LiveTripView extends StatelessWidget {
  const LiveTripView({
    required this.presentation,
    this.onAcknowledge,
    this.onReportIssue,
    this.onLeaveFormation,
    super.key,
  });

  final LiveTripPresentation presentation;
  final VoidCallback? onAcknowledge;
  final VoidCallback? onReportIssue;
  final VoidCallback? onLeaveFormation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Icon(
                  Icons.route_outlined,
                  color: presentation.statusLabel == 'Split'
                      ? LoopinTheme.safetyAmber
                      : LoopinTheme.loopinGreen,
                  size: 32,
                ),
                const SizedBox(width: 12),
                Text(
                  presentation.statusLabel,
                  style: theme.textTheme.headlineMedium,
                ),
              ],
            ),
            const SizedBox(height: 28),
            Text(
              presentation.primaryAction,
              style: theme.textTheme.headlineSmall?.copyWith(
                color: LoopinTheme.roadInk,
                height: 1.25,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 28),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: <Widget>[
                _StatusChip(
                  icon: Icons.gps_fixed_outlined,
                  label: presentation.confidenceLabel,
                ),
                _StatusChip(
                  icon: Icons.wifi_tethering_outlined,
                  label: presentation.connectivityLabel,
                ),
                _StatusChip(
                  icon: Icons.schedule_outlined,
                  label: presentation.freshnessLabel,
                ),
              ],
            ),
            const Spacer(),
            if (presentation.requiresAcknowledgement)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: onAcknowledge,
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('Acknowledge'),
                ),
              ),
            if (onReportIssue != null || onLeaveFormation != null) ...<Widget>[
              const SizedBox(height: 12),
              Row(
                children: <Widget>[
                  if (onReportIssue != null)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onReportIssue,
                        icon: const Icon(Icons.report_outlined),
                        label: const Text('Report issue'),
                      ),
                    ),
                  if (onReportIssue != null && onLeaveFormation != null)
                    const SizedBox(width: 12),
                  if (onLeaveFormation != null)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onLeaveFormation,
                        icon: const Icon(Icons.logout_outlined),
                        label: const Text('Leave formation'),
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

final class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: LoopinTheme.softSage,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(icon, size: 18, color: LoopinTheme.roadInk),
            const SizedBox(width: 8),
            Text(label),
          ],
        ),
      ),
    );
  }
}
