import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';
import '../auth/ui/confirm_screen.dart';
import '../auth/ui/sign_in_screen.dart';
import '../auth/ui/sign_up_screen.dart';
import 'app_environment.dart';
import 'loopin_theme.dart';

enum AppViewState { loading, ready, error, degraded }

const _authRoutes = <String>{'/sign-in', '/sign-up', '/confirm'};

final class LoopinApp extends StatelessWidget {
  const LoopinApp({
    required this.config,
    this.initialState = AppViewState.ready,
    this.overrides = const <Override>[],
    super.key,
  });

  final AppEnvironmentConfig config;
  final AppViewState initialState;

  /// Extra provider overrides, used by tests to seed auth state without
  /// touching real Cognito or secure storage.
  final List<Override> overrides;

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      overrides: <Override>[
        appEnvironmentProvider.overrideWithValue(config),
        ...overrides,
      ],
      child: _LoopinRouterHost(initialState: initialState),
    );
  }
}

/// Owns the [GoRouter] and keeps it in sync with auth state so sign-in/out
/// redirects happen automatically.
final class _LoopinRouterHost extends ConsumerStatefulWidget {
  const _LoopinRouterHost({required this.initialState});

  final AppViewState initialState;

  @override
  ConsumerState<_LoopinRouterHost> createState() => _LoopinRouterHostState();
}

final class _LoopinRouterHostState extends ConsumerState<_LoopinRouterHost> {
  late final ValueNotifier<AuthState> _authListenable;
  late final ProviderSubscription<AuthState> _subscription;
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _authListenable = ValueNotifier<AuthState>(ref.read(authControllerProvider));
    _subscription = ref.listenManual<AuthState>(
      authControllerProvider,
      (_, next) => _authListenable.value = next,
    );
    _router = _createRouter();
  }

  @override
  void dispose() {
    _subscription.close();
    _router.dispose();
    _authListenable.dispose();
    super.dispose();
  }

  GoRouter _createRouter() {
    return GoRouter(
      refreshListenable: _authListenable,
      redirect: _redirect,
      routes: <RouteBase>[
        GoRoute(path: '/sign-in', builder: (_, _) => const SignInScreen()),
        GoRoute(path: '/sign-up', builder: (_, _) => const SignUpScreen()),
        GoRoute(
          path: '/confirm',
          builder: (_, state) =>
              ConfirmScreen(email: state.uri.queryParameters['email'] ?? ''),
        ),
        ShellRoute(
          builder: (_, _, child) => _AppShell(child: child),
          routes: <RouteBase>[
            GoRoute(
              path: '/',
              builder: (_, _) => _HomeView(initialState: widget.initialState),
            ),
          ],
        ),
      ],
    );
  }

  String? _redirect(BuildContext context, GoRouterState state) {
    final auth = ref.read(authControllerProvider);
    final location = state.matchedLocation;

    // Still restoring a persisted session: park on the splash ('/') so a
    // returning user is never flashed the sign-in screen.
    if (auth is AuthUnknown) return location == '/' ? null : '/';

    final loggedIn = auth is AuthAuthenticated;
    final onAuthRoute = _authRoutes.contains(location);
    if (!loggedIn && !onAuthRoute) return '/sign-in';
    if (loggedIn && onAuthRoute) return '/';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Loopin',
      debugShowCheckedModeBanner: false,
      theme: LoopinTheme.light,
      routerConfig: _router,
    );
  }
}

final class _AppShell extends ConsumerWidget {
  const _AppShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appEnvironmentProvider);
    final authed = ref.watch(authControllerProvider) is AuthAuthenticated;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 28,
              height: 28,
              decoration: const BoxDecoration(
                color: LoopinTheme.loopinGreen,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.route_outlined,
                color: Colors.white,
                size: 17,
              ),
            ),
            const SizedBox(width: 10),
            const Text('Loopin'),
          ],
        ),
        actions: <Widget>[
          if (config.environment != AppEnvironment.prod)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Semantics(
                  label: '${config.environment.name} environment',
                  excludeSemantics: true,
                  child: Text(
                    config.environment.name.toUpperCase(),
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: LoopinTheme.loopinGreen,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
              ),
            ),
          if (authed)
            IconButton(
              tooltip: 'Sign out',
              icon: const Icon(Icons.logout),
              onPressed: () =>
                  ref.read(authControllerProvider.notifier).signOut(),
            ),
        ],
      ),
      body: SafeArea(child: child),
    );
  }
}

final class _HomeView extends ConsumerWidget {
  const _HomeView({required this.initialState});

  final AppViewState initialState;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    // Show a loading splash until the session is resolved; the router keeps an
    // unauthenticated user off this route entirely.
    final state = auth is AuthAuthenticated ? initialState : AppViewState.loading;
    return _FoundationView(state: state);
  }
}

final class _FoundationView extends StatelessWidget {
  const _FoundationView({required this.state});

  final AppViewState state;

  @override
  Widget build(BuildContext context) {
    final presentation = switch (state) {
      AppViewState.loading => const _StatePresentation(
        icon: Icons.route_outlined,
        title: 'Preparing your trip',
        detail: 'Checking the driver experience and public services.',
        showProgress: true,
      ),
      AppViewState.ready => const _StatePresentation(
        icon: Icons.directions_car_filled_outlined,
        title: 'TRIP001 driver workspace',
        detail:
            'Capture stays on this device. Convoy state and approved guidance come from Loopin services.',
      ),
      AppViewState.error => const _StatePresentation(
        icon: Icons.error_outline,
        title: 'Loopin needs attention',
        detail: 'Try again when it is safe to use your phone.',
      ),
      AppViewState.degraded => const _StatePresentation(
        icon: Icons.cloud_off_outlined,
        title: 'Connection is limited',
        detail: 'Saved updates will send when the connection returns.',
      ),
    };

    if (state == AppViewState.ready) {
      return const _DriverWorkspace();
    }

    return _TransientStateView(presentation: presentation, state: state);
  }
}

final class _TransientStateView extends StatelessWidget {
  const _TransientStateView({required this.presentation, required this.state});

  final _StatePresentation presentation;
  final AppViewState state;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(
                presentation.icon,
                size: 40,
                color: state == AppViewState.error
                    ? Theme.of(context).colorScheme.error
                    : LoopinTheme.loopinGreen,
              ),
              const SizedBox(height: 28),
              Text(
                presentation.title,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 12),
              Text(
                presentation.detail,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              if (presentation.showProgress) ...<Widget>[
                const SizedBox(height: 28),
                Semantics(
                  label: 'Loading',
                  child: const LinearProgressIndicator(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

final class _DriverWorkspace extends ConsumerWidget {
  const _DriverWorkspace();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appEnvironmentProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(18, 10, 18, 28),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const _DriverHero(),
              const SizedBox(height: 18),
              const _LiveGuidancePanel(),
              const SizedBox(height: 18),
              const _ReadinessChecklist(),
              const SizedBox(height: 18),
              _ServiceBoundaryPanel(config: config),
              const SizedBox(height: 20),
              Row(
                children: <Widget>[
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.qr_code_scanner_outlined),
                      label: const Text('Join TRIP001'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton.outlined(
                    tooltip: 'Voice preference',
                    onPressed: () {},
                    icon: const Icon(Icons.record_voice_over_outlined),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _DriverHero extends StatelessWidget {
  const _DriverHero();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Driver trip overview for TRIP001 from Hanoi to Ha Long',
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: LoopinTheme.deepRoad,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const _Kicker('Driver mode'),
            const SizedBox(height: 10),
            Text(
              'Ha Noi to Ha Long',
              style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                color: Colors.white,
                fontSize: 40,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'M004 is ready to publish trip-scoped telemetry after consent. '
              'Live guidance remains server-authorized.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: const Color(0xFFD8E8DD),
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 26),
            const _RouteStrip(),
          ],
        ),
      ),
    );
  }
}

final class _RouteStrip extends StatelessWidget {
  const _RouteStrip();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 76,
      child: CustomPaint(
        painter: _RouteStripPainter(),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: <Widget>[
            _RouteStop(label: 'Start', value: 'HN'),
            _RouteStop(label: 'Regroup', value: 'POI001'),
            _RouteStop(label: 'Finish', value: 'HL'),
          ],
        ),
      ),
    );
  }
}

final class _RouteStripPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final basePaint = Paint()
      ..color = const Color(0xFF597064)
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    final activePaint = Paint()
      ..color = const Color(0xFFA8DFB6)
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    final y = size.height * 0.58;
    canvas.drawLine(Offset(24, y), Offset(size.width - 24, y), basePaint);
    var x = 24.0;
    while (x < size.width - 24) {
      canvas.drawLine(Offset(x, y), Offset(x + 8, y), activePaint);
      x += 18;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

final class _RouteStop extends StatelessWidget {
  const _RouteStop({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: <Widget>[
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: LoopinTheme.loopinGreen, width: 3),
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: const Color(0xFF9EB0A7),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

final class _LiveGuidancePanel extends StatelessWidget {
  const _LiveGuidancePanel();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                const Expanded(child: _Kicker('Current guidance')),
                _StatusPill(
                  icon: Icons.verified_outlined,
                  label: 'Server approved',
                  color: LoopinTheme.loopinGreen,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Rear section observing',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 10),
            Text(
              'Continue on the planned route. Regroup navigation appears only '
              'after the leader approves a verified stop.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: LoopinTheme.mutedInk,
              ),
            ),
            const SizedBox(height: 18),
            const _MetricGrid(),
          ],
        ),
      ),
    );
  }
}

final class _MetricGrid extends StatelessWidget {
  const _MetricGrid();

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      childAspectRatio: 2.6,
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      children: const <Widget>[
        _MetricTile(label: 'Freshness', value: '6 s'),
        _MetricTile(label: 'Accuracy', value: '18 m'),
        _MetricTile(label: 'Queue', value: '0 pending'),
        _MetricTile(label: 'Policy', value: 'POLICY-2026-07'),
      ],
    );
  }
}

final class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: LoopinTheme.clayLine),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(label, style: Theme.of(context).textTheme.labelSmall),
            const SizedBox(height: 4),
            Flexible(
              child: Text(
                value,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: LoopinTheme.roadInk,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _ReadinessChecklist extends StatelessWidget {
  const _ReadinessChecklist();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: const <Widget>[
        _Kicker('Readiness'),
        SizedBox(height: 10),
        _ChecklistRow(
          icon: Icons.location_on_outlined,
          title: 'Trip-scoped location consent',
          detail: 'Required before publishing telemetry.',
          state: 'Ready',
        ),
        _ChecklistRow(
          icon: Icons.battery_charging_full_outlined,
          title: 'Battery and GPS',
          detail: 'Foreground capture can continue safely.',
          state: 'Ready',
        ),
        _ChecklistRow(
          icon: Icons.cloud_queue_outlined,
          title: 'Offline buffer',
          detail: 'Ordered telemetry waits in SQLite when disconnected.',
          state: 'Empty',
        ),
        _ChecklistRow(
          icon: Icons.volume_up_outlined,
          title: 'Voice alerts',
          detail: 'Short, interruptible messages only.',
          state: 'On',
        ),
      ],
    );
  }
}

final class _ChecklistRow extends StatelessWidget {
  const _ChecklistRow({
    required this.icon,
    required this.title,
    required this.detail,
    required this.state,
  });

  final IconData icon;
  final String title;
  final String detail;
  final String state;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(14),
      decoration: const BoxDecoration(
        border: Border(
          top: BorderSide(color: LoopinTheme.clayLine),
        ),
      ),
      child: Row(
        children: <Widget>[
          Icon(icon, color: LoopinTheme.loopinGreen),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  detail,
                  style: const TextStyle(
                    color: LoopinTheme.mutedInk,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          _StatusPill(
            icon: Icons.check_circle_outline,
            label: state,
            color: LoopinTheme.loopinGreen,
          ),
        ],
      ),
    );
  }
}

final class _ServiceBoundaryPanel extends StatelessWidget {
  const _ServiceBoundaryPanel({required this.config});

  final AppEnvironmentConfig config;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const _Kicker('API boundary'),
            const SizedBox(height: 12),
            _BoundaryRow(
              icon: Icons.http_outlined,
              title: 'Control API',
              detail: config.apiBaseUrl.toString(),
            ),
            const _BoundaryRow(
              icon: Icons.sensors_outlined,
              title: 'Telemetry path',
              detail: 'AWS IoT Core to Kinesis to processor Lambda',
            ),
            _BoundaryRow(
              icon: Icons.sync_alt_outlined,
              title: 'Realtime graph',
              detail: config.realtimeUrl.toString(),
            ),
          ],
        ),
      ),
    );
  }
}

final class _BoundaryRow extends StatelessWidget {
  const _BoundaryRow({
    required this.icon,
    required this.title,
    required this.detail,
  });

  final IconData icon;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, color: LoopinTheme.loopinGreen, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 3),
                Text(
                  detail,
                  style: const TextStyle(
                    color: LoopinTheme.mutedInk,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
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
    return Semantics(
      label: label,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(icon, color: color, size: 15),
            const SizedBox(width: 5),
            Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _Kicker extends StatelessWidget {
  const _Kicker(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
        color: LoopinTheme.loopinGreen,
      ),
    );
  }
}

final class _StatePresentation {
  const _StatePresentation({
    required this.icon,
    required this.title,
    required this.detail,
    this.showProgress = false,
  });

  final IconData icon;
  final String title;
  final String detail;
  final bool showProgress;
}
