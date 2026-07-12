import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import 'group_notifications.dart';
import 'group_repository.dart';

final createGroupControllerProvider =
    NotifierProvider<CreateGroupController, CreateGroupState>(
      CreateGroupController.new,
    );

final class CreateGroupState {
  const CreateGroupState({
    this.isLoading = false,
    this.team,
    this.selectedTeamId,
    this.invite,
    this.members = const <TeamMembership>[],
    this.myTeams = const <TeamMembership>[],
    this.acceptedMembership,
    this.leadershipTransfer,
    this.memberRemoval,
    this.successMessage,
    this.errorMessage,
  });

  final bool isLoading;
  final CreatedTeam? team;
  final String? selectedTeamId;
  final TeamInvite? invite;
  final List<TeamMembership> members;
  final List<TeamMembership> myTeams;
  final TeamMembership? acceptedMembership;
  final LeadershipTransfer? leadershipTransfer;
  final MemberRemoval? memberRemoval;
  final String? successMessage;
  final String? errorMessage;

  String? get shareLink =>
      team == null ? null : 'https://loopin.app/join/${team!.teamId}';

  CreateGroupState copyWith({
    bool? isLoading,
    CreatedTeam? team,
    String? selectedTeamId,
    TeamInvite? invite,
    List<TeamMembership>? members,
    List<TeamMembership>? myTeams,
    TeamMembership? acceptedMembership,
    LeadershipTransfer? leadershipTransfer,
    MemberRemoval? memberRemoval,
    String? successMessage,
    String? errorMessage,
    bool clearInvite = false,
    bool clearAcceptedMembership = false,
    bool clearLeadershipTransfer = false,
    bool clearMemberRemoval = false,
    bool clearMessages = false,
  }) {
    return CreateGroupState(
      isLoading: isLoading ?? this.isLoading,
      team: team ?? this.team,
      selectedTeamId: selectedTeamId ?? this.selectedTeamId,
      invite: clearInvite ? null : invite ?? this.invite,
      members: members ?? this.members,
      myTeams: myTeams ?? this.myTeams,
      acceptedMembership: clearAcceptedMembership
          ? null
          : acceptedMembership ?? this.acceptedMembership,
      leadershipTransfer: clearLeadershipTransfer
          ? null
          : leadershipTransfer ?? this.leadershipTransfer,
      memberRemoval: clearMemberRemoval
          ? null
          : memberRemoval ?? this.memberRemoval,
      successMessage: clearMessages
          ? null
          : successMessage ?? this.successMessage,
      errorMessage: clearMessages ? null : errorMessage ?? this.errorMessage,
    );
  }
}

final class CreateGroupController extends Notifier<CreateGroupState> {
  @override
  CreateGroupState build() => const CreateGroupState();

  Future<void> createGroup(String name) async {
    state = state.copyWith(isLoading: true, clearMessages: true);
    try {
      final team = await ref.read(groupRepositoryProvider).createGroup(name);
      final members = await ref
          .read(groupRepositoryProvider)
          .listTeamMembers(team.teamId);
      state = state.copyWith(
        isLoading: false,
        team: team,
        selectedTeamId: team.teamId,
        members: members,
        successMessage: '${team.name} created.',
      );
      ref
          .read(groupNotificationsProvider.notifier)
          .push(title: 'Group created', body: team.name, teamId: team.teamId);
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _messageFor(error),
      );
    }
  }

  Future<void> inviteMember(String email) async {
    final teamId = state.team?.teamId ?? state.selectedTeamId;
    if (teamId == null) {
      state = state.copyWith(
        errorMessage: 'Create a group before inviting members.',
      );
      return;
    }
    state = state.copyWith(isLoading: true, clearMessages: true);
    try {
      final invite = await ref
          .read(groupRepositoryProvider)
          .inviteMember(teamId: teamId, email: email);
      state = state.copyWith(
        isLoading: false,
        invite: invite,
        successMessage: 'Invitation sent to ${invite.email}.',
      );
      ref
          .read(groupNotificationsProvider.notifier)
          .push(
            title: 'Invite sent',
            body: invite.email,
            teamId: invite.teamId,
            inviteId: invite.inviteId,
          );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _messageFor(error),
      );
    }
  }

  Future<void> acceptInvite({
    required String teamId,
    required String inviteId,
    required String token,
  }) async {
    state = state.copyWith(isLoading: true, clearMessages: true);
    try {
      final membership = await ref
          .read(groupRepositoryProvider)
          .acceptInvite(teamId: teamId, inviteId: inviteId, token: token);
      state = state.copyWith(
        isLoading: false,
        acceptedMembership: membership,
        selectedTeamId: membership.teamId,
        successMessage: 'Joined group ${membership.teamId}.',
      );
      ref
          .read(groupNotificationsProvider.notifier)
          .push(
            title: 'Joined group',
            body: membership.teamId,
            teamId: membership.teamId,
          );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _messageFor(error),
      );
    }
  }

  Future<void> loadMyTeams() async {
    state = state.copyWith(isLoading: true, clearMessages: true);
    try {
      final teams = await ref.read(groupRepositoryProvider).listMyTeams();
      state = state.copyWith(isLoading: false, myTeams: teams);
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _messageFor(error),
      );
    }
  }

  Future<void> loadTeamMembers(String teamId) async {
    state = state.copyWith(isLoading: true, clearMessages: true);
    try {
      final members = await ref
          .read(groupRepositoryProvider)
          .listTeamMembers(teamId);
      state = state.copyWith(
        isLoading: false,
        selectedTeamId: teamId,
        members: members,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _messageFor(error),
      );
    }
  }

  Future<void> transferLeader({
    required String teamId,
    required String userId,
  }) async {
    state = state.copyWith(isLoading: true, clearMessages: true);
    try {
      final transfer = await ref
          .read(groupRepositoryProvider)
          .transferLeader(teamId: teamId, userId: userId);
      state = state.copyWith(
        isLoading: false,
        leadershipTransfer: transfer,
        successMessage: 'Leadership transferred.',
      );
      ref
          .read(groupNotificationsProvider.notifier)
          .push(
            title: 'Leader changed',
            body: transfer.leaderUserId,
            teamId: transfer.teamId,
          );
      await loadTeamMembers(teamId);
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _messageFor(error),
      );
    }
  }

  Future<void> removeMember({
    required String teamId,
    required String userId,
  }) async {
    state = state.copyWith(isLoading: true, clearMessages: true);
    try {
      final removal = await ref
          .read(groupRepositoryProvider)
          .removeMember(teamId: teamId, userId: userId);
      final members = state.members
          .where((member) => member.userId != removal.userId)
          .toList(growable: false);
      state = state.copyWith(
        isLoading: false,
        memberRemoval: removal,
        members: members,
        successMessage: 'Member removed.',
      );
      ref
          .read(groupNotificationsProvider.notifier)
          .push(
            title: 'Member removed',
            body: removal.userId,
            teamId: removal.teamId,
          );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _messageFor(error),
      );
    }
  }

  void reset() => state = const CreateGroupState();

  String _messageFor(Object error) {
    if (error is ApiException) return error.message;
    return 'Loopin could not reach the grouping API. Check the selected environment and network connection.';
  }
}
