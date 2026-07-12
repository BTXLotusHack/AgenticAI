import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../app/loopin_theme.dart';
import 'live_map_controller.dart';
import 'live_map_models.dart';

final class LiveMapPanel extends ConsumerStatefulWidget {
  const LiveMapPanel({this.initialTripId, super.key});

  final String? initialTripId;

  @override
  ConsumerState<LiveMapPanel> createState() => _LiveMapPanelState();
}

final class _LiveMapPanelState extends ConsumerState<LiveMapPanel> {
  late final TextEditingController _tripController;

  @override
  void initState() {
    super.initState();
    _tripController = TextEditingController(
      text: widget.initialTripId ?? 'TRIP001',
    );
  }

  @override
  void dispose() {
    _tripController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(liveMapControllerProvider);
    final controller = ref.read(liveMapControllerProvider.notifier);
    return Column(
      children: <Widget>[
        _LiveMapToolbar(
          controller: _tripController,
          state: state,
          onConnect: () => controller.connect(_tripController.text.trim()),
          onDemo: controller.startSimulation,
          onStop: controller.stop,
        ),
        const SizedBox(height: 12),
        _LiveMapCanvas(state: state, onMemberTap: controller.focusMember),
        const SizedBox(height: 12),
        _LiveMapBottomPanel(state: state, onMemberTap: controller.focusMember),
      ],
    );
  }
}

final class _LiveMapToolbar extends StatelessWidget {
  const _LiveMapToolbar({
    required this.controller,
    required this.state,
    required this.onConnect,
    required this.onDemo,
    required this.onStop,
  });

  final TextEditingController controller;
  final LiveMapState state;
  final VoidCallback onConnect;
  final VoidCallback onDemo;
  final VoidCallback onStop;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                const Icon(Icons.map_outlined, color: LoopinTheme.loopinGreen),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Live convoy map',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                ),
                _StatusPill(
                  icon: Icons.circle,
                  label: state.status.name,
                  color: _statusColor(state.status),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Team / trip channel',
                prefixIcon: Icon(Icons.hub_outlined),
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: <Widget>[
                ElevatedButton.icon(
                  onPressed: onConnect,
                  icon: const Icon(Icons.sensors_outlined),
                  label: const Text('Connect realtime'),
                ),
                OutlinedButton.icon(
                  onPressed: onDemo,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Start simulator'),
                ),
                IconButton.outlined(
                  tooltip: 'Stop live map',
                  onPressed: onStop,
                  icon: const Icon(Icons.stop),
                ),
              ],
            ),
            if (state.errorMessage != null) ...<Widget>[
              const SizedBox(height: 10),
              Text(
                state.errorMessage!,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.error,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

final class _LiveMapCanvas extends StatelessWidget {
  const _LiveMapCanvas({required this.state, required this.onMemberTap});

  final LiveMapState state;
  final ValueChanged<String> onMemberTap;

  @override
  Widget build(BuildContext context) {
    final membersById = <String, LiveMapMember>{
      for (final member in state.members) member.memberId: member,
    };
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        height: 360,
        child: FlutterMap(
          key: ValueKey<String>(
            'live-map-${state.focusedMemberId ?? state.tripId ?? 'idle'}',
          ),
          options: MapOptions(
            initialCenter: state.center,
            initialZoom: state.members.isEmpty ? 12 : 13,
            minZoom: 5,
            maxZoom: 18,
          ),
          children: <Widget>[
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'loopin_mobile',
            ),
            CircleLayer(
              circles: <CircleMarker>[
                for (final member in state.members)
                  CircleMarker(
                    point: member.point,
                    radius: member.accuracyMeters.clamp(12, 80).toDouble(),
                    useRadiusInMeter: true,
                    color: liveMapColorForMember(
                      member,
                    ).withValues(alpha: 0.16),
                    borderStrokeWidth: 1.5,
                    borderColor: liveMapColorForMember(
                      member,
                    ).withValues(alpha: 0.55),
                  ),
              ],
            ),
            PolylineLayer(
              polylines: <Polyline>[
                for (final link in state.links)
                  if (membersById[link.aheadMemberId] != null &&
                      membersById[link.behindMemberId] != null)
                    Polyline(
                      points: <LatLng>[
                        membersById[link.aheadMemberId]!.point,
                        membersById[link.behindMemberId]!.point,
                      ],
                      strokeWidth: 5,
                      color: liveMapColorForLink(link.state),
                    ),
              ],
            ),
            MarkerLayer(
              markers: <Marker>[
                for (final member in state.members)
                  Marker(
                    point: member.point,
                    width: 70,
                    height: 58,
                    child: _MemberMarker(
                      member: member,
                      focused: member.memberId == state.focusedMemberId,
                      onTap: () => onMemberTap(member.memberId),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

final class _MemberMarker extends StatelessWidget {
  const _MemberMarker({
    required this.member,
    required this.focused,
    required this.onTap,
  });

  final LiveMapMember member;
  final bool focused;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = liveMapColorForMember(member);
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          DecoratedBox(
            decoration: BoxDecoration(
              color: focused ? LoopinTheme.deepRoad : color,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white, width: 2),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
              child: Text(
                member.memberId,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
          Icon(Icons.navigation, color: color, size: 22),
        ],
      ),
    );
  }
}

final class _LiveMapBottomPanel extends StatelessWidget {
  const _LiveMapBottomPanel({required this.state, required this.onMemberTap});

  final LiveMapState state;
  final ValueChanged<String> onMemberTap;

  @override
  Widget build(BuildContext context) {
    final focused = state.focusedMember;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    'Graph ${state.graphRevision} - ${state.overallState}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                Text(
                  '${state.members.length} members',
                  style: const TextStyle(color: LoopinTheme.mutedInk),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (focused != null)
              _FocusedMember(member: focused)
            else
              const Text(
                'Tap a marker or alert to focus a vehicle.',
                style: TextStyle(color: LoopinTheme.mutedInk),
              ),
            const SizedBox(height: 12),
            _MembersStrip(members: state.members, onTap: onMemberTap),
            if (state.alerts.isNotEmpty) ...<Widget>[
              const SizedBox(height: 12),
              Text(
                'Live alerts',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 6),
              for (final alert in state.alerts)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  leading: const Icon(
                    Icons.notifications_active_outlined,
                    color: LoopinTheme.loopinGreen,
                  ),
                  title: Text(alert.title),
                  subtitle: Text(alert.message),
                  trailing: alert.memberId == null
                      ? null
                      : const Icon(Icons.center_focus_strong_outlined),
                  onTap: alert.memberId == null
                      ? null
                      : () => onMemberTap(alert.memberId!),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

final class _FocusedMember extends StatelessWidget {
  const _FocusedMember({required this.member});

  final LiveMapMember member;

  @override
  Widget build(BuildContext context) {
    final speed = member.speedKmh == null
        ? 'speed unknown'
        : '${member.speedKmh!.round()} km/h';
    return Text(
      '${member.memberId}: ${member.confidenceLabel} confidence, '
      '${member.connectivityLabel}, ${member.accuracyMeters.round()} m accuracy, $speed.',
      style: const TextStyle(color: LoopinTheme.mutedInk, height: 1.35),
    );
  }
}

final class _MembersStrip extends StatelessWidget {
  const _MembersStrip({required this.members, required this.onTap});

  final List<LiveMapMember> members;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    if (members.isEmpty) {
      return const Text(
        'Connect realtime or start the simulator to draw members and links.',
        style: TextStyle(color: LoopinTheme.mutedInk),
      );
    }
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: <Widget>[
        for (final member in members)
          ActionChip(
            avatar: Icon(
              Icons.circle,
              color: liveMapColorForMember(member),
              size: 12,
            ),
            label: Text(member.memberId),
            onPressed: () => onTap(member.memberId),
          ),
      ],
    );
  }
}

Color _statusColor(LiveMapConnectionStatus status) {
  return switch (status) {
    LiveMapConnectionStatus.connected ||
    LiveMapConnectionStatus.simulating => LoopinTheme.loopinGreen,
    LiveMapConnectionStatus.connecting => LoopinTheme.safetyAmber,
    LiveMapConnectionStatus.degraded => const Color(0xFFB42318),
    LiveMapConnectionStatus.disconnected ||
    LiveMapConnectionStatus.idle => LoopinTheme.mutedInk,
  };
}

final class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.45)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(icon, color: color, size: 13),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
