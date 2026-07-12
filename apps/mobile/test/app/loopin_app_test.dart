import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:loopin_mobile/app/app_environment.dart';
import 'package:loopin_mobile/app/loopin_app.dart';
import 'package:loopin_mobile/auth/auth_controller.dart';
import 'package:loopin_mobile/auth/auth_state.dart';
import 'package:loopin_mobile/groups/group_repository.dart';

/// Seeds [AuthController] with a fixed state so widget tests never touch real
/// Cognito or secure storage.
class _StubAuthController extends AuthController {
  _StubAuthController(this._state);

  final AuthState _state;

  @override
  AuthState build() => _state;
}

List<Override> _auth(AuthState state) => <Override>[
  authControllerProvider.overrideWith(() => _StubAuthController(state)),
];

final _signedIn = AuthAuthenticated(
  const AuthUser(userId: 'u1', email: 'driver@example.com'),
);

final class _FakeGroupRepository implements GroupRepository {
  String? createdName;
  String? invitedTeamId;
  String? invitedEmail;

  @override
  Future<CreatedTeam> createGroup(String name) async {
    createdName = name;
    return CreatedTeam(
      teamId: 'team-123',
      name: name,
      leaderUserId: 'u1',
      createdAt: DateTime.utc(2026, 7, 12),
    );
  }

  @override
  Future<TeamInvite> inviteMember({
    required String teamId,
    required String email,
  }) async {
    invitedTeamId = teamId;
    invitedEmail = email;
    return TeamInvite(
      inviteId: 'invite-123',
      teamId: teamId,
      email: email,
      status: InviteStatus.pending,
      expiresAt: DateTime.utc(2026, 7, 13),
    );
  }

  @override
  Future<TeamMembership> acceptInvite({
    required String teamId,
    required String inviteId,
    required String token,
  }) async {
    return TeamMembership(
      teamId: teamId,
      userId: 'u2',
      role: TeamRole.member,
      joinedAt: DateTime.utc(2026, 7, 12),
    );
  }

  @override
  Future<List<TeamMembership>> listMyTeams() async {
    return <TeamMembership>[
      TeamMembership(
        teamId: 'team-123',
        userId: 'u1',
        role: TeamRole.leader,
        joinedAt: DateTime.utc(2026, 7, 12),
      ),
    ];
  }

  @override
  Future<List<TeamMembership>> listTeamMembers(String teamId) async {
    return <TeamMembership>[
      TeamMembership(
        teamId: teamId,
        userId: 'u1',
        role: TeamRole.leader,
        joinedAt: DateTime.utc(2026, 7, 12),
      ),
    ];
  }

  @override
  Future<LeadershipTransfer> transferLeader({
    required String teamId,
    required String userId,
  }) async {
    return LeadershipTransfer(teamId: teamId, leaderUserId: userId);
  }

  @override
  Future<MemberRemoval> removeMember({
    required String teamId,
    required String userId,
  }) async {
    return MemberRemoval(teamId: teamId, userId: userId, removed: true);
  }
}

void main() {
  final config = AppEnvironmentConfig.forName('local');

  testWidgets('authenticated shell presents the ready foundation state', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Loopin'), findsOneWidget);
    expect(
      find.text('Plan a route before anyone shares location.'),
      findsOneWidget,
    );
    expect(find.text('Create group'), findsNothing);
    expect(find.text('Group'), findsOneWidget);
    expect(find.text('Planning'), findsOneWidget);
    expect(find.text('Trips'), findsOneWidget);
    expect(find.text('Map'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
    expect(find.text('LOCAL'), findsOneWidget);
  });

  testWidgets('unauthenticated users land on the sign-in screen', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(config: config, overrides: _auth(const AuthUnauthenticated())),
    );
    await tester.pumpAndSettle();

    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Create an account'), findsOneWidget);
  });

  testWidgets('ready workspace explains server-authorized live guidance', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Map'));
    await tester.pumpAndSettle();

    expect(find.text('Server approved'), findsOneWidget);
    expect(
      find.textContaining('Regroup navigation appears only after the leader'),
      findsOneWidget,
    );
    expect(find.text('Control API'), findsOneWidget);
    expect(find.text('Telemetry path'), findsOneWidget);
    expect(find.text('Realtime graph'), findsOneWidget);
  });

  testWidgets('driver workspace keeps mobile as capture and queue surface', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    expect(find.text('Trip-scoped location consent'), findsOneWidget);
    expect(find.text('Offline buffer'), findsOneWidget);
    expect(
      find.text('Ordered telemetry waits in SQLite when disconnected.'),
      findsOneWidget,
    );
  });

  testWidgets('create group button opens a setup popup', (tester) async {
    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Group'));
    await tester.pumpAndSettle();

    expect(find.widgetWithText(ElevatedButton, 'Create group'), findsOneWidget);
    expect(find.text('Group name'), findsOneWidget);
    expect(find.text('Where is this group going?'), findsOneWidget);
    expect(find.text('Ha Long'), findsOneWidget);
    expect(find.text('Food loop'), findsOneWidget);
  });

  testWidgets('create group submits to the groups API and shows a share link', (
    tester,
  ) async {
    final fakeGroups = _FakeGroupRepository();

    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: <Override>[
          ..._auth(_signedIn),
          groupRepositoryProvider.overrideWithValue(fakeGroups),
        ],
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Group'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'Sunday riders');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Create group'));
    await tester.pumpAndSettle();

    expect(fakeGroups.createdName, 'Sunday riders');
    expect(find.text('Sunday riders is ready'), findsOneWidget);
    expect(find.text('https://loopin.app/join/team-123'), findsOneWidget);
    expect(find.text('Copy link'), findsOneWidget);
    expect(find.text('Invite by email'), findsOneWidget);
    expect(find.text('u1'), findsOneWidget);
    expect(find.text('LEADER'), findsOneWidget);
  });

  testWidgets('create group can invite a member by email', (tester) async {
    final fakeGroups = _FakeGroupRepository();

    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: <Override>[
          ..._auth(_signedIn),
          groupRepositoryProvider.overrideWithValue(fakeGroups),
        ],
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Group'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'Sunday riders');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Create group'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Member email'),
      'Friend@Example.com',
    );
    final sendInviteButton = find.widgetWithText(OutlinedButton, 'Send invite');
    await tester.ensureVisible(sendInviteButton);
    await tester.tap(sendInviteButton);
    await tester.pumpAndSettle();

    expect(fakeGroups.invitedTeamId, 'team-123');
    expect(fakeGroups.invitedEmail, 'Friend@Example.com');
    expect(find.text('Invitation sent to Friend@Example.com.'), findsOneWidget);
    expect(find.text('Friend@Example.com - PENDING'), findsOneWidget);
  });

  testWidgets('trips tab manages group access and notification navigation', (
    tester,
  ) async {
    final fakeGroups = _FakeGroupRepository();

    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: <Override>[
          ..._auth(_signedIn),
          groupRepositoryProvider.overrideWithValue(fakeGroups),
        ],
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Trips'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Refresh groups'));
    await tester.pumpAndSettle();
    expect(find.text('team-123'), findsOneWidget);

    await tester.tap(find.text('team-123'));
    await tester.pumpAndSettle();
    expect(find.text('Selected group'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextField, 'Invite email'),
      'member@example.com',
    );
    final inviteButton = find.widgetWithText(OutlinedButton, 'Invite member');
    await tester.ensureVisible(inviteButton);
    await tester.tap(inviteButton);
    await tester.pumpAndSettle();
    expect(fakeGroups.invitedEmail, 'member@example.com');

    await tester.tap(find.byIcon(Icons.notifications_none));
    await tester.pumpAndSettle();
    expect(find.text('Invite sent'), findsOneWidget);
    await tester.tap(find.text('Invite sent'));
    await tester.pumpAndSettle();
    expect(find.text('Selected group'), findsOneWidget);
  });

  testWidgets('live map simulator draws members, links, and alerts', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Map'));
    await tester.pumpAndSettle();
    expect(find.text('Live convoy map'), findsOneWidget);

    final simulatorButton = find.widgetWithText(
      OutlinedButton,
      'Start simulator',
    );
    await tester.ensureVisible(simulatorButton);
    await tester.tap(simulatorButton);
    await tester.pump();
    expect(find.text('Graph 1 - together'), findsOneWidget);
    expect(find.text('M001'), findsWidgets);
    expect(find.text('M004'), findsWidgets);

    await tester.pump(const Duration(seconds: 7));
    expect(find.text('Split observed'), findsOneWidget);
    expect(find.text('Graph 4 - split'), findsOneWidget);
  });

  testWidgets('create group validates short names before calling the API', (
    tester,
  ) async {
    final fakeGroups = _FakeGroupRepository();

    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.ready,
        overrides: <Override>[
          ..._auth(_signedIn),
          groupRepositoryProvider.overrideWithValue(fakeGroups),
        ],
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Group'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'A');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Create group'));
    await tester.pumpAndSettle();

    expect(find.text('Group name must be 2 to 80 characters.'), findsOneWidget);
    expect(fakeGroups.createdName, isNull);
  });

  testWidgets(
    'bottom navigation switches between planning, trips, map, and profile',
    (tester) async {
      await tester.pumpWidget(
        LoopinApp(
          config: config,
          initialState: AppViewState.ready,
          overrides: _auth(_signedIn),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Planning'));
      await tester.pumpAndSettle();
      expect(
        find.text('Plan a route before anyone shares location.'),
        findsOneWidget,
      );
      expect(find.text('Create trip plan'), findsOneWidget);

      await tester.tap(find.text('Trips'));
      await tester.pumpAndSettle();
      expect(find.text('Your group drives.'), findsOneWidget);
      expect(find.text('Weekend food loop'), findsOneWidget);

      await tester.tap(find.text('Map'));
      await tester.pumpAndSettle();
      expect(find.text('Route-aware live map.'), findsOneWidget);
      expect(find.text('Rear section observing'), findsOneWidget);

      await tester.tap(find.text('Profile'));
      await tester.pumpAndSettle();
      expect(find.text('Driver preferences and privacy.'), findsOneWidget);
      expect(find.text('driver@example.com'), findsOneWidget);
    },
  );

  testWidgets('non-production environment has one concise announcement', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        LoopinApp(
          config: config,
          initialState: AppViewState.ready,
          overrides: _auth(_signedIn),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        tester.getSemantics(find.text('LOCAL')).label,
        'local environment',
      );
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('production does not expose an environment badge', (
    tester,
  ) async {
    await tester.pumpWidget(
      LoopinApp(
        config: AppEnvironmentConfig.forName('prod'),
        initialState: AppViewState.ready,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('PROD'), findsNothing);
  });

  for (final scenario in <({AppViewState state, String message})>[
    (state: AppViewState.loading, message: 'Preparing your trip'),
    (state: AppViewState.error, message: 'Loopin needs attention'),
    (state: AppViewState.degraded, message: 'Connection is limited'),
  ]) {
    testWidgets('presents an explicit ${scenario.state.name} state', (
      tester,
    ) async {
      await tester.pumpWidget(
        LoopinApp(
          config: config,
          initialState: scenario.state,
          overrides: _auth(_signedIn),
        ),
      );
      await tester.pump();

      expect(find.text(scenario.message), findsOneWidget);
    });
  }

  testWidgets('degraded state explains offline delivery', (tester) async {
    await tester.pumpWidget(
      LoopinApp(
        config: config,
        initialState: AppViewState.degraded,
        overrides: _auth(_signedIn),
      ),
    );
    await tester.pump();

    expect(
      find.text('Saved updates will send when the connection returns.'),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.cloud_off_outlined), findsOneWidget);
  });
}
