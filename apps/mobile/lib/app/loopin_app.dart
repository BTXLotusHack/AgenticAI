import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'app_environment.dart';
import 'loopin_theme.dart';

enum AppViewState { loading, ready, error, degraded }

final class LoopinApp extends StatefulWidget {
  const LoopinApp({
    required this.config,
    this.initialState = AppViewState.ready,
    super.key,
  });

  final AppEnvironmentConfig config;
  final AppViewState initialState;

  @override
  State<LoopinApp> createState() => _LoopinAppState();
}

final class _LoopinAppState extends State<LoopinApp> {
  late final GoRouter _router = _createRouter(widget.initialState);

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      overrides: [appEnvironmentProvider.overrideWithValue(widget.config)],
      child: MaterialApp.router(
        title: 'Loopin',
        debugShowCheckedModeBanner: false,
        theme: LoopinTheme.light,
        routerConfig: _router,
      ),
    );
  }
}

GoRouter _createRouter(AppViewState initialState) {
  return GoRouter(
    routes: <RouteBase>[
      ShellRoute(
        builder: (context, state, child) => _AppShell(child: child),
        routes: <RouteBase>[
          GoRoute(
            path: '/',
            builder: (context, state) => _FoundationView(state: initialState),
          ),
        ],
      ),
    ],
  );
}

final class _AppShell extends ConsumerWidget {
  const _AppShell({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appEnvironmentProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Loopin'),
        actions: <Widget>[
          Padding(
            padding: const EdgeInsets.only(right: 20),
            child: Center(
              child: Semantics(
                label: '${config.environment.name} environment',
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
        ],
      ),
      body: SafeArea(child: child),
    );
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
        title: 'Ready for a safer group drive',
        detail: 'Driver setup and live-trip features arrive in the next slice.',
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
