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
        title: const Text('Loopin'),
        actions: <Widget>[
          if (config.environment != AppEnvironment.prod)
            Padding(
              padding: const EdgeInsets.only(right: 8),
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
              onPressed: () => ref.read(authControllerProvider.notifier).signOut(),
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
