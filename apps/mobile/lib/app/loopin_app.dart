import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';
import '../auth/ui/confirm_screen.dart';
import '../auth/ui/sign_in_screen.dart';
import '../auth/ui/sign_up_screen.dart';
import '../features/live_map/live_map_controller.dart';
import '../features/live_map/live_map_view.dart';
import '../groups/create_group_controller.dart';
import '../groups/group_notifications.dart';
import '../groups/group_repository.dart';
import 'app_environment.dart';
import 'loopin_theme.dart';

enum AppViewState { loading, ready, error, degraded }

const _authRoutes = <String>{'/sign-in', '/sign-up', '/confirm'};

enum _HomeTab { planning, trips, map, profile }

final _homeTabProvider = NotifierProvider<_HomeTabController, _HomeTab>(
  _HomeTabController.new,
);

final class _HomeTabController extends Notifier<_HomeTab> {
  @override
  _HomeTab build() => _HomeTab.planning;

  void select(_HomeTab tab) => state = tab;
}

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
    _authListenable = ValueNotifier<AuthState>(
      ref.read(authControllerProvider),
    );
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
    final selectedTab = ref.watch(_homeTabProvider);
    final notifications = ref.watch(groupNotificationsProvider);

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
            _NotificationBell(
              count: notifications.length,
              onPressed: () => _showNotificationsSheet(context, ref),
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
      bottomNavigationBar: authed
          ? _LoopinBottomNav(
              selectedTab: selectedTab,
              onTabSelected: (tab) =>
                  ref.read(_homeTabProvider.notifier).select(tab),
              onCreateGroup: () => _showCreateGroupSheet(context, ref),
            )
          : null,
    );
  }

  Future<void> _showCreateGroupSheet(BuildContext context, WidgetRef ref) {
    ref.read(createGroupControllerProvider.notifier).reset();
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const _CreateGroupSheet(),
    );
  }

  Future<void> _showNotificationsSheet(BuildContext context, WidgetRef ref) {
    return showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      builder: (_) => const _NotificationsSheet(),
    );
  }
}

final class _NotificationBell extends StatelessWidget {
  const _NotificationBell({required this.count, required this.onPressed});

  final int count;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: <Widget>[
        IconButton(
          tooltip: 'Notifications',
          onPressed: onPressed,
          icon: const Icon(Icons.notifications_none),
        ),
        if (count > 0)
          Positioned(
            right: 8,
            top: 8,
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: const BoxDecoration(
                  color: LoopinTheme.safetyAmber,
                  shape: BoxShape.circle,
                ),
                child: Padding(
                  padding: const EdgeInsets.all(4),
                  child: Text(
                    count > 9 ? '9+' : '$count',
                    style: const TextStyle(
                      color: LoopinTheme.roadInk,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

final class _NotificationsSheet extends ConsumerWidget {
  const _NotificationsSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(groupNotificationsProvider);
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Text(
                'Notifications',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const Spacer(),
              if (notifications.isNotEmpty)
                TextButton(
                  onPressed: () =>
                      ref.read(groupNotificationsProvider.notifier).clear(),
                  child: const Text('Clear'),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (notifications.isEmpty)
            const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: Text(
                'Group updates will appear here in real time while the app is open.',
                style: TextStyle(color: LoopinTheme.mutedInk),
              ),
            )
          else
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: notifications.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final notification = notifications[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(
                      Icons.notifications_active_outlined,
                      color: LoopinTheme.loopinGreen,
                    ),
                    title: Text(notification.title),
                    subtitle: Text(notification.body),
                    trailing: notification.teamId == null
                        ? null
                        : const Icon(Icons.chevron_right),
                    onTap: notification.memberId != null
                        ? () {
                            ref
                                .read(_homeTabProvider.notifier)
                                .select(_HomeTab.map);
                            ref
                                .read(liveMapControllerProvider.notifier)
                                .focusMember(notification.memberId!);
                            Navigator.of(context).pop();
                          }
                        : notification.teamId == null
                        ? null
                        : () async {
                            ref
                                .read(_homeTabProvider.notifier)
                                .select(_HomeTab.trips);
                            await ref
                                .read(createGroupControllerProvider.notifier)
                                .loadTeamMembers(notification.teamId!);
                            if (context.mounted) Navigator.of(context).pop();
                          },
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

final class _LoopinBottomNav extends StatelessWidget {
  const _LoopinBottomNav({
    required this.selectedTab,
    required this.onTabSelected,
    required this.onCreateGroup,
  });

  final _HomeTab selectedTab;
  final ValueChanged<_HomeTab> onTabSelected;
  final VoidCallback onCreateGroup;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: DecoratedBox(
        decoration: const BoxDecoration(
          color: Color(0xFFEEEAE0),
          border: Border(top: BorderSide(color: LoopinTheme.clayLine)),
        ),
        child: SizedBox(
          height: 78,
          child: Row(
            children: <Widget>[
              _BottomNavItem(
                icon: Icons.edit_road_outlined,
                label: 'Planning',
                selected: selectedTab == _HomeTab.planning,
                onPressed: () => onTabSelected(_HomeTab.planning),
              ),
              _BottomNavItem(
                icon: Icons.format_list_bulleted_outlined,
                label: 'Trips',
                selected: selectedTab == _HomeTab.trips,
                onPressed: () => onTabSelected(_HomeTab.trips),
              ),
              Expanded(
                child: Center(
                  child: SizedBox(
                    width: 78,
                    child: _CreateGroupButton(onPressed: onCreateGroup),
                  ),
                ),
              ),
              _BottomNavItem(
                icon: Icons.map_outlined,
                label: 'Map',
                selected: selectedTab == _HomeTab.map,
                onPressed: () => onTabSelected(_HomeTab.map),
              ),
              _BottomNavItem(
                icon: Icons.person_outline,
                label: 'Profile',
                selected: selectedTab == _HomeTab.profile,
                onPressed: () => onTabSelected(_HomeTab.profile),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _BottomNavItem extends StatelessWidget {
  const _BottomNavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final color = selected ? LoopinTheme.loopinGreen : LoopinTheme.mutedInk;
    return Expanded(
      child: Semantics(
        selected: selected,
        button: true,
        label: label,
        child: InkWell(
          onTap: onPressed,
          child: SizedBox(
            height: 78,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Icon(icon, color: color, size: 23),
                const SizedBox(height: 5),
                Text(
                  label,
                  maxLines: 1,
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
        ),
      ),
    );
  }
}

final class _CreateGroupButton extends StatelessWidget {
  const _CreateGroupButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Create group',
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onPressed,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: LoopinTheme.loopinGreen,
                borderRadius: BorderRadius.circular(18),
                boxShadow: const <BoxShadow>[
                  BoxShadow(
                    color: Color(0x3318724B),
                    blurRadius: 16,
                    offset: Offset(0, 7),
                  ),
                ],
              ),
              child: const Icon(Icons.group_add_outlined, color: Colors.white),
            ),
            const SizedBox(height: 3),
            Text(
              'Group',
              maxLines: 1,
              style: TextStyle(
                color: LoopinTheme.roadInk,
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

final class _HomeView extends ConsumerWidget {
  const _HomeView({required this.initialState});

  final AppViewState initialState;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final selectedTab = ref.watch(_homeTabProvider);
    // Show a loading splash until the session is resolved; the router keeps an
    // unauthenticated user off this route entirely.
    final state = auth is AuthAuthenticated
        ? initialState
        : AppViewState.loading;
    return _FoundationView(state: state, selectedTab: selectedTab);
  }
}

final class _FoundationView extends StatelessWidget {
  const _FoundationView({required this.state, required this.selectedTab});

  final AppViewState state;
  final _HomeTab selectedTab;

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
      return _DriverWorkspace(selectedTab: selectedTab);
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
  const _DriverWorkspace({required this.selectedTab});

  final _HomeTab selectedTab;

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
              _TabHeader(tab: selectedTab),
              const SizedBox(height: 18),
              _TabContent(tab: selectedTab, config: config),
            ],
          ),
        ),
      ),
    );
  }
}

final class _TabHeader extends StatelessWidget {
  const _TabHeader({required this.tab});

  final _HomeTab tab;

  @override
  Widget build(BuildContext context) {
    return switch (tab) {
      _HomeTab.planning => const _SimpleHero(
        icon: Icons.edit_road_outlined,
        kicker: 'Trip planning',
        title: 'Plan a route before anyone shares location.',
        detail:
            'Draft stops, departure time and readiness checks before turning on live tracking.',
      ),
      _HomeTab.trips => const _SimpleHero(
        icon: Icons.format_list_bulleted_outlined,
        kicker: 'Trips',
        title: 'Your group drives.',
        detail:
            'Review active, ready and draft trips with freshness and readiness visible.',
      ),
      _HomeTab.map => const _SimpleHero(
        icon: Icons.map_outlined,
        kicker: 'Map',
        title: 'Route-aware live map.',
        detail:
            'Show server-authorized snapshots and confidence labels without making the phone a safety authority.',
      ),
      _HomeTab.profile => const _SimpleHero(
        icon: Icons.person_outline,
        kicker: 'Profile',
        title: 'Driver preferences and privacy.',
        detail:
            'Manage identity, voice alerts, trip-scoped location consent and retention preferences.',
      ),
    };
  }
}

final class _TabContent extends StatelessWidget {
  const _TabContent({required this.tab, required this.config});

  final _HomeTab tab;
  final AppEnvironmentConfig config;

  @override
  Widget build(BuildContext context) {
    return switch (tab) {
      _HomeTab.planning => const _PlanningTab(),
      _HomeTab.trips => const _TripsTab(),
      _HomeTab.map => _MapTab(config: config),
      _HomeTab.profile => const _ProfileTab(),
    };
  }
}

final class _SimpleHero extends StatelessWidget {
  const _SimpleHero({
    required this.icon,
    required this.kicker,
    required this.title,
    required this.detail,
  });

  final IconData icon;
  final String kicker;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: LoopinTheme.deepRoad,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, color: const Color(0xFFA8DFB6), size: 30),
          const SizedBox(height: 16),
          _Kicker(kicker),
          const SizedBox(height: 10),
          Text(
            title,
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
              color: Colors.white,
              fontSize: 38,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            detail,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: const Color(0xFFD8E8DD),
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
}

final class _PlanningTab extends StatelessWidget {
  const _PlanningTab();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        const _TripRoutePreview(),
        const SizedBox(height: 18),
        _ActionPanel(
          title: 'Planning controls',
          detail:
              'Choose a destination, stage verified stops and ask members to finish readiness checks.',
          icon: Icons.alt_route_outlined,
          actionLabel: 'Create trip plan',
          onPressed: () {},
        ),
      ],
    );
  }
}

final class _TripsTab extends ConsumerStatefulWidget {
  const _TripsTab();

  @override
  ConsumerState<_TripsTab> createState() => _TripsTabState();
}

final class _TripsTabState extends ConsumerState<_TripsTab> {
  final _inviteEmailController = TextEditingController();
  final _acceptTeamController = TextEditingController();
  final _acceptInviteController = TextEditingController();
  final _acceptTokenController = TextEditingController();

  @override
  void dispose() {
    _inviteEmailController.dispose();
    _acceptTeamController.dispose();
    _acceptInviteController.dispose();
    _acceptTokenController.dispose();
    super.dispose();
  }

  Future<void> _inviteSelected() async {
    await ref
        .read(createGroupControllerProvider.notifier)
        .inviteMember(_inviteEmailController.text.trim());
  }

  Future<void> _acceptInvite() async {
    await ref
        .read(createGroupControllerProvider.notifier)
        .acceptInvite(
          teamId: _acceptTeamController.text.trim(),
          inviteId: _acceptInviteController.text.trim(),
          token: _acceptTokenController.text.trim(),
        );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(createGroupControllerProvider);
    final controller = ref.read(createGroupControllerProvider.notifier);

    return Column(
      children: <Widget>[
        _GroupsAccessPanel(
          state: state,
          inviteEmailController: _inviteEmailController,
          acceptTeamController: _acceptTeamController,
          acceptInviteController: _acceptInviteController,
          acceptTokenController: _acceptTokenController,
          onRefreshTeams: controller.loadMyTeams,
          onInvite: _inviteSelected,
          onAcceptInvite: _acceptInvite,
          onSelectTeam: controller.loadTeamMembers,
          onTransferLeader: (teamId, userId) =>
              controller.transferLeader(teamId: teamId, userId: userId),
          onRemoveMember: (teamId, userId) =>
              controller.removeMember(teamId: teamId, userId: userId),
        ),
        const SizedBox(height: 18),
        const _TripListItem(
          title: 'Ha Noi to Ha Long',
          state: 'Active',
          detail: '4 ready - live guidance available',
        ),
        const SizedBox(height: 10),
        const _TripListItem(
          title: 'Weekend food loop',
          state: 'Draft',
          detail: '2 members - route refresh needed',
        ),
      ],
    );
  }
}

final class _GroupsAccessPanel extends StatelessWidget {
  const _GroupsAccessPanel({
    required this.state,
    required this.inviteEmailController,
    required this.acceptTeamController,
    required this.acceptInviteController,
    required this.acceptTokenController,
    required this.onRefreshTeams,
    required this.onInvite,
    required this.onAcceptInvite,
    required this.onSelectTeam,
    required this.onTransferLeader,
    required this.onRemoveMember,
  });

  final CreateGroupState state;
  final TextEditingController inviteEmailController;
  final TextEditingController acceptTeamController;
  final TextEditingController acceptInviteController;
  final TextEditingController acceptTokenController;
  final VoidCallback onRefreshTeams;
  final VoidCallback onInvite;
  final VoidCallback onAcceptInvite;
  final ValueChanged<String> onSelectTeam;
  final void Function(String teamId, String userId) onTransferLeader;
  final void Function(String teamId, String userId) onRemoveMember;

  @override
  Widget build(BuildContext context) {
    final selectedTeamId = state.selectedTeamId;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                const Icon(
                  Icons.groups_2_outlined,
                  color: LoopinTheme.loopinGreen,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Group access',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                ),
                IconButton.outlined(
                  tooltip: 'Refresh groups',
                  onPressed: state.isLoading ? null : onRefreshTeams,
                  icon: state.isLoading
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (state.successMessage != null) ...<Widget>[
              _InlineNotice(
                icon: Icons.check_circle_outline,
                text: state.successMessage!,
                color: LoopinTheme.loopinGreen,
              ),
              const SizedBox(height: 10),
            ],
            if (state.errorMessage != null) ...<Widget>[
              _InlineNotice(
                icon: Icons.error_outline,
                text: state.errorMessage!,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 10),
            ],
            _MyTeamsList(
              teams: state.myTeams,
              selectedTeamId: selectedTeamId,
              onSelectTeam: onSelectTeam,
            ),
            const SizedBox(height: 14),
            _SelectedGroupTools(
              selectedTeamId: selectedTeamId,
              members: state.members,
              inviteEmailController: inviteEmailController,
              onInvite: onInvite,
              onTransferLeader: onTransferLeader,
              onRemoveMember: onRemoveMember,
            ),
            const SizedBox(height: 14),
            _AcceptInvitePanel(
              teamController: acceptTeamController,
              inviteController: acceptInviteController,
              tokenController: acceptTokenController,
              isLoading: state.isLoading,
              onAccept: onAcceptInvite,
            ),
          ],
        ),
      ),
    );
  }
}

final class _MyTeamsList extends StatelessWidget {
  const _MyTeamsList({
    required this.teams,
    required this.selectedTeamId,
    required this.onSelectTeam,
  });

  final List<TeamMembership> teams;
  final String? selectedTeamId;
  final ValueChanged<String> onSelectTeam;

  @override
  Widget build(BuildContext context) {
    if (teams.isEmpty) {
      return const Text(
        'Tap refresh to load groups you can access.',
        style: TextStyle(color: LoopinTheme.mutedInk),
      );
    }
    return Column(
      children: <Widget>[
        for (final membership in teams)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: ListTile(
              shape: RoundedRectangleBorder(
                side: BorderSide(
                  color: membership.teamId == selectedTeamId
                      ? LoopinTheme.loopinGreen
                      : LoopinTheme.clayLine,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              title: Text(
                membership.teamId,
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              subtitle: Text('Your role: ${membership.role.wireName}'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => onSelectTeam(membership.teamId),
            ),
          ),
      ],
    );
  }
}

final class _SelectedGroupTools extends StatelessWidget {
  const _SelectedGroupTools({
    required this.selectedTeamId,
    required this.members,
    required this.inviteEmailController,
    required this.onInvite,
    required this.onTransferLeader,
    required this.onRemoveMember,
  });

  final String? selectedTeamId;
  final List<TeamMembership> members;
  final TextEditingController inviteEmailController;
  final VoidCallback onInvite;
  final void Function(String teamId, String userId) onTransferLeader;
  final void Function(String teamId, String userId) onRemoveMember;

  @override
  Widget build(BuildContext context) {
    if (selectedTeamId == null) {
      return const SizedBox.shrink();
    }
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: LoopinTheme.clayLine),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Selected group',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 4),
            Text(
              selectedTeamId!,
              style: const TextStyle(color: LoopinTheme.mutedInk),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: inviteEmailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Invite email',
                prefixIcon: Icon(Icons.mail_outline),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onInvite,
                icon: const Icon(Icons.send_outlined),
                label: const Text('Invite member'),
              ),
            ),
            const SizedBox(height: 12),
            _MemberActionsList(
              teamId: selectedTeamId!,
              members: members,
              onTransferLeader: onTransferLeader,
              onRemoveMember: onRemoveMember,
            ),
          ],
        ),
      ),
    );
  }
}

final class _MemberActionsList extends StatelessWidget {
  const _MemberActionsList({
    required this.teamId,
    required this.members,
    required this.onTransferLeader,
    required this.onRemoveMember,
  });

  final String teamId;
  final List<TeamMembership> members;
  final void Function(String teamId, String userId) onTransferLeader;
  final void Function(String teamId, String userId) onRemoveMember;

  @override
  Widget build(BuildContext context) {
    if (members.isEmpty) {
      return const Text(
        'Load this group to see members.',
        style: TextStyle(color: LoopinTheme.mutedInk),
      );
    }
    return Column(
      children: <Widget>[
        for (final member in members)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    '${member.userId} - ${member.role.wireName}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                IconButton(
                  tooltip: 'Transfer leader',
                  onPressed: member.role == TeamRole.leader
                      ? null
                      : () => onTransferLeader(teamId, member.userId),
                  icon: const Icon(Icons.workspace_premium_outlined),
                ),
                IconButton(
                  tooltip: 'Remove member',
                  onPressed: () => onRemoveMember(teamId, member.userId),
                  icon: const Icon(Icons.person_remove_outlined),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

final class _AcceptInvitePanel extends StatelessWidget {
  const _AcceptInvitePanel({
    required this.teamController,
    required this.inviteController,
    required this.tokenController,
    required this.isLoading,
    required this.onAccept,
  });

  final TextEditingController teamController;
  final TextEditingController inviteController;
  final TextEditingController tokenController;
  final bool isLoading;
  final VoidCallback onAccept;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: LoopinTheme.clayLine),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Accept invite',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: teamController,
              decoration: const InputDecoration(labelText: 'Team ID'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: inviteController,
              decoration: const InputDecoration(labelText: 'Invite ID'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: tokenController,
              decoration: const InputDecoration(labelText: 'Invite token'),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isLoading ? null : onAccept,
                icon: const Icon(Icons.login),
                label: const Text('Accept invite'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _GroupTripChoice { destination, haLong, foodLoop }

final class _CreateGroupSheet extends ConsumerStatefulWidget {
  const _CreateGroupSheet();

  @override
  ConsumerState<_CreateGroupSheet> createState() => _CreateGroupSheetState();
}

final class _CreateGroupSheetState extends ConsumerState<_CreateGroupSheet> {
  final _groupNameController = TextEditingController(text: 'Ha Long crew');
  final _destinationController = TextEditingController(text: 'Ha Long Bay');
  final _inviteEmailController = TextEditingController();
  var _choice = _GroupTripChoice.destination;
  String? _validationMessage;
  String? _inviteValidationMessage;

  @override
  void dispose() {
    _groupNameController.dispose();
    _destinationController.dispose();
    _inviteEmailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _groupNameController.text.trim();
    if (name.length < 2 || name.length > 80) {
      setState(() {
        _validationMessage = 'Group name must be 2 to 80 characters.';
      });
      return;
    }
    setState(() => _validationMessage = null);
    await ref.read(createGroupControllerProvider.notifier).createGroup(name);
  }

  Future<void> _invite() async {
    final email = _inviteEmailController.text.trim();
    final looksLikeEmail = RegExp(
      r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
    ).hasMatch(email);
    if (!looksLikeEmail) {
      setState(() {
        _inviteValidationMessage = 'Enter a valid email address.';
      });
      return;
    }
    setState(() => _inviteValidationMessage = null);
    await ref.read(createGroupControllerProvider.notifier).inviteMember(email);
  }

  Future<void> _copyShareLink(String link) async {
    await Clipboard.setData(ClipboardData(text: link));
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Share link copied')));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(createGroupControllerProvider);
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(18, 16, 18, 18 + bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                const Icon(
                  Icons.group_add_outlined,
                  color: LoopinTheme.loopinGreen,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Create group',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                ),
                IconButton(
                  tooltip: 'Close',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _groupNameController,
              textInputAction: TextInputAction.next,
              maxLength: 80,
              decoration: InputDecoration(
                labelText: 'Group name',
                errorText: _validationMessage,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Where is this group going?',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 8),
            SegmentedButton<_GroupTripChoice>(
              segments: const <ButtonSegment<_GroupTripChoice>>[
                ButtonSegment<_GroupTripChoice>(
                  value: _GroupTripChoice.destination,
                  icon: Icon(Icons.place_outlined),
                  label: Text('New'),
                ),
                ButtonSegment<_GroupTripChoice>(
                  value: _GroupTripChoice.haLong,
                  icon: Icon(Icons.route_outlined),
                  label: Text('Ha Long'),
                ),
                ButtonSegment<_GroupTripChoice>(
                  value: _GroupTripChoice.foodLoop,
                  icon: Icon(Icons.restaurant_outlined),
                  label: Text('Food loop'),
                ),
              ],
              selected: <_GroupTripChoice>{_choice},
              onSelectionChanged: state.isLoading
                  ? null
                  : (selection) => setState(() => _choice = selection.first),
            ),
            const SizedBox(height: 12),
            if (_choice == _GroupTripChoice.destination)
              TextField(
                controller: _destinationController,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: 'Destination',
                  prefixIcon: Icon(Icons.search),
                ),
              )
            else
              _SelectedTripSummary(choice: _choice),
            const SizedBox(height: 16),
            if (state.successMessage != null) ...<Widget>[
              _InlineNotice(
                icon: Icons.check_circle_outline,
                text: state.successMessage!,
                color: LoopinTheme.loopinGreen,
              ),
              const SizedBox(height: 12),
            ],
            if (state.errorMessage != null) ...<Widget>[
              _InlineNotice(
                icon: Icons.error_outline,
                text: state.errorMessage!,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 12),
            ],
            if (state.team != null && state.shareLink != null) ...<Widget>[
              _ShareLinkPanel(
                groupName: state.team!.name,
                link: state.shareLink!,
                onCopy: () => _copyShareLink(state.shareLink!),
              ),
              const SizedBox(height: 12),
              _InviteByEmailPanel(
                controller: _inviteEmailController,
                errorText: _inviteValidationMessage,
                invite: state.invite,
                isLoading: state.isLoading,
                onInvite: _invite,
              ),
              const SizedBox(height: 12),
              _MembersPanel(members: state.members),
              const SizedBox(height: 12),
            ],
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: state.isLoading ? null : _submit,
                icon: state.isLoading
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.add),
                label: Text(
                  state.isLoading ? 'Creating group' : 'Create group',
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'You become LEADER. Members can join from a share link once invite tokens are issued by the backend.',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: LoopinTheme.mutedInk),
            ),
          ],
        ),
      ),
    );
  }
}

final class _SelectedTripSummary extends StatelessWidget {
  const _SelectedTripSummary({required this.choice});

  final _GroupTripChoice choice;

  @override
  Widget build(BuildContext context) {
    final title = switch (choice) {
      _GroupTripChoice.haLong => 'Ha Noi to Ha Long',
      _GroupTripChoice.foodLoop => 'Weekend food loop',
      _GroupTripChoice.destination => 'New destination',
    };
    final detail = switch (choice) {
      _GroupTripChoice.haLong => 'Existing trip draft - 142 km',
      _GroupTripChoice.foodLoop => 'Draft trip - 4 planned stops',
      _GroupTripChoice.destination => 'Create from destination',
    };
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: LoopinTheme.clayLine),
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        leading: const Icon(Icons.check_circle, color: LoopinTheme.loopinGreen),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(detail),
      ),
    );
  }
}

final class _InlineNotice extends StatelessWidget {
  const _InlineNotice({
    required this.icon,
    required this.text,
    required this.color,
  });

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, color: color, size: 19),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

final class _ShareLinkPanel extends StatelessWidget {
  const _ShareLinkPanel({
    required this.groupName,
    required this.link,
    required this.onCopy,
  });

  final String groupName;
  final String link;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFFE8F4ED),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFB6D8C2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              '$groupName is ready',
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            SelectableText(link),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: onCopy,
                icon: const Icon(Icons.copy),
                label: const Text('Copy link'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _InviteByEmailPanel extends StatelessWidget {
  const _InviteByEmailPanel({
    required this.controller,
    required this.errorText,
    required this.invite,
    required this.isLoading,
    required this.onInvite,
  });

  final TextEditingController controller;
  final String? errorText;
  final TeamInvite? invite;
  final bool isLoading;
  final VoidCallback onInvite;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: LoopinTheme.clayLine),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Invite by email',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: controller,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => isLoading ? null : onInvite(),
              decoration: InputDecoration(
                labelText: 'Member email',
                prefixIcon: const Icon(Icons.mail_outline),
                errorText: errorText,
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: isLoading ? null : onInvite,
                icon: const Icon(Icons.send_outlined),
                label: const Text('Send invite'),
              ),
            ),
            if (invite != null) ...<Widget>[
              const SizedBox(height: 10),
              Text(
                '${invite!.email} - ${invite!.status.wireName}',
                style: const TextStyle(
                  color: LoopinTheme.mutedInk,
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

final class _MembersPanel extends StatelessWidget {
  const _MembersPanel({required this.members});

  final List<TeamMembership> members;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: LoopinTheme.clayLine),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Members',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            if (members.isEmpty)
              const Text(
                'Roster will appear after the backend confirms membership.',
                style: TextStyle(color: LoopinTheme.mutedInk),
              )
            else
              for (final member in members)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: <Widget>[
                      const Icon(
                        Icons.person_outline,
                        color: LoopinTheme.loopinGreen,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          member.userId,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                      Text(
                        member.role.wireName,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: LoopinTheme.mutedInk,
                        ),
                      ),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

final class _MapTab extends StatelessWidget {
  const _MapTab({required this.config});

  final AppEnvironmentConfig config;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        const LiveMapPanel(),
        const SizedBox(height: 18),
        const _LiveGuidancePanel(),
        const SizedBox(height: 18),
        _ServiceBoundaryPanel(config: config),
      ],
    );
  }
}

final class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: <Widget>[
        _ReadinessChecklist(),
        SizedBox(height: 18),
        _ProfilePanel(),
      ],
    );
  }
}

final class _ActionPanel extends StatelessWidget {
  const _ActionPanel({
    required this.title,
    required this.detail,
    required this.icon,
    required this.actionLabel,
    required this.onPressed,
  });

  final String title;
  final String detail;
  final IconData icon;
  final String actionLabel;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Icon(icon, color: LoopinTheme.loopinGreen, size: 28),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text(
              detail,
              style: Theme.of(
                context,
              ).textTheme.bodyLarge?.copyWith(color: LoopinTheme.mutedInk),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onPressed,
                child: Text(actionLabel),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _TripRoutePreview extends StatelessWidget {
  const _TripRoutePreview();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const _Kicker('Route draft'),
            const SizedBox(height: 10),
            Text(
              'Ha Noi to Ha Long',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 14),
            const _RouteStrip(),
          ],
        ),
      ),
    );
  }
}

final class _TripListItem extends StatelessWidget {
  const _TripListItem({
    required this.title,
    required this.state,
    required this.detail,
  });

  final String title;
  final String state;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        minVerticalPadding: 18,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(detail),
        trailing: _StatusPill(
          icon: Icons.circle_outlined,
          label: state,
          color: state == 'Active'
              ? LoopinTheme.loopinGreen
              : LoopinTheme.safetyAmber,
        ),
      ),
    );
  }
}

final class _ProfilePanel extends StatelessWidget {
  const _ProfilePanel();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const _Kicker('Account'),
            const SizedBox(height: 10),
            Text(
              'driver@example.com',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            const Text(
              'Voice alerts on. Trip location sharing only during active trips.',
              style: TextStyle(color: LoopinTheme.mutedInk, height: 1.4),
            ),
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
          style: Theme.of(
            context,
          ).textTheme.labelSmall?.copyWith(color: const Color(0xFF9EB0A7)),
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
              style: Theme.of(
                context,
              ).textTheme.bodyLarge?.copyWith(color: LoopinTheme.mutedInk),
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
        border: Border(top: BorderSide(color: LoopinTheme.clayLine)),
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
            _BoundaryRow(
              icon: Icons.graphic_eq_outlined,
              title: 'AppSync GraphQL',
              detail: config.appSyncGraphqlUrl.toString(),
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
            _BoundaryRow(
              icon: Icons.hub_outlined,
              title: 'IoT topic',
              detail: config.iotTelemetryTopicFilter,
            ),
            _BoundaryRow(
              icon: Icons.stream_outlined,
              title: 'Kinesis stream',
              detail: config.kinesisStreamName,
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
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
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
      style: Theme.of(
        context,
      ).textTheme.labelSmall?.copyWith(color: LoopinTheme.loopinGreen),
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
