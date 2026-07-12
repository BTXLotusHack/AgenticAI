import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

final groupRepositoryProvider = Provider<GroupRepository>((ref) {
  return ApiGroupRepository(ref.watch(apiClientProvider));
});

abstract interface class GroupRepository {
  Future<CreatedTeam> createGroup(String name);
  Future<TeamInvite> inviteMember({
    required String teamId,
    required String email,
  });
  Future<TeamMembership> acceptInvite({
    required String teamId,
    required String inviteId,
    required String token,
  });
  Future<List<TeamMembership>> listMyTeams();
  Future<List<TeamMembership>> listTeamMembers(String teamId);
  Future<LeadershipTransfer> transferLeader({
    required String teamId,
    required String userId,
  });
  Future<MemberRemoval> removeMember({
    required String teamId,
    required String userId,
  });
}

final class ApiGroupRepository implements GroupRepository {
  const ApiGroupRepository(this._client);

  final LoopinApiClient _client;

  @override
  Future<CreatedTeam> createGroup(String name) async {
    final response = await _client.post('teams', <String, String>{
      'name': name.trim(),
    });
    final rawTeam = response['team'];
    if (rawTeam is! Map) {
      throw const ApiException(
        502,
        'invalid_team_response',
        'Loopin could not read the created group.',
      );
    }
    return CreatedTeam.fromJson(rawTeam.cast<String, Object?>());
  }

  @override
  Future<TeamInvite> inviteMember({
    required String teamId,
    required String email,
  }) async {
    final response = await _client.post(
      'teams/${Uri.encodeComponent(teamId)}/invites',
      <String, String>{'email': email.trim().toLowerCase()},
    );
    final rawInvite = response['invite'];
    if (rawInvite is! Map) {
      throw const ApiException(
        502,
        'invalid_invite_response',
        'Loopin could not read the invitation.',
      );
    }
    return TeamInvite.fromJson(rawInvite.cast<String, Object?>());
  }

  @override
  Future<TeamMembership> acceptInvite({
    required String teamId,
    required String inviteId,
    required String token,
  }) async {
    final response = await _client.post(
      'teams/${Uri.encodeComponent(teamId)}/invites/${Uri.encodeComponent(inviteId)}/accept',
      <String, String>{'token': token},
    );
    final rawMembership = response['membership'];
    if (rawMembership is! Map) {
      throw const ApiException(
        502,
        'invalid_membership_response',
        'Loopin could not read the joined membership.',
      );
    }
    return TeamMembership.fromJson(rawMembership.cast<String, Object?>());
  }

  @override
  Future<List<TeamMembership>> listMyTeams() async {
    final response = await _client.get('me/teams');
    return _readMembershipList(response['teams']);
  }

  @override
  Future<List<TeamMembership>> listTeamMembers(String teamId) async {
    final response = await _client.get(
      'teams/${Uri.encodeComponent(teamId)}/members',
    );
    return _readMembershipList(response['members']);
  }

  @override
  Future<LeadershipTransfer> transferLeader({
    required String teamId,
    required String userId,
  }) async {
    final response = await _client.put(
      'teams/${Uri.encodeComponent(teamId)}/leader',
      <String, String>{'userId': userId},
    );
    return LeadershipTransfer.fromJson(response);
  }

  @override
  Future<MemberRemoval> removeMember({
    required String teamId,
    required String userId,
  }) async {
    final response = await _client.delete(
      'teams/${Uri.encodeComponent(teamId)}/members/${Uri.encodeComponent(userId)}',
    );
    return MemberRemoval.fromJson(response);
  }

  List<TeamMembership> _readMembershipList(Object? raw) {
    if (raw is! List) {
      throw const ApiException(
        502,
        'invalid_membership_response',
        'Loopin could not read the membership list.',
      );
    }
    return raw
        .map((item) {
          if (item is! Map) {
            throw const ApiException(
              502,
              'invalid_membership_response',
              'Loopin could not read the membership list.',
            );
          }
          return TeamMembership.fromJson(item.cast<String, Object?>());
        })
        .toList(growable: false);
  }
}

final class CreatedTeam {
  const CreatedTeam({
    required this.teamId,
    required this.name,
    required this.leaderUserId,
    required this.createdAt,
  });

  final String teamId;
  final String name;
  final String leaderUserId;
  final DateTime createdAt;

  factory CreatedTeam.fromJson(Map<String, Object?> json) {
    final teamId = json['teamId'];
    final name = json['name'];
    final leaderUserId = json['leaderUserId'];
    final createdAt = json['createdAt'];
    if (teamId is! String ||
        teamId.isEmpty ||
        name is! String ||
        name.isEmpty ||
        leaderUserId is! String ||
        leaderUserId.isEmpty ||
        createdAt is! String) {
      throw const ApiException(
        502,
        'invalid_team_response',
        'Loopin could not read the created group.',
      );
    }
    return CreatedTeam(
      teamId: teamId,
      name: name,
      leaderUserId: leaderUserId,
      createdAt: DateTime.parse(createdAt),
    );
  }
}

enum TeamRole {
  leader('LEADER'),
  member('MEMBER');

  const TeamRole(this.wireName);

  final String wireName;

  static TeamRole fromWire(String value) {
    return TeamRole.values.firstWhere(
      (role) => role.wireName == value,
      orElse: () => throw const ApiException(
        502,
        'invalid_role_response',
        'Loopin could not read the team role.',
      ),
    );
  }
}

enum InviteStatus {
  pending('PENDING'),
  accepted('ACCEPTED'),
  expired('EXPIRED'),
  revoked('REVOKED');

  const InviteStatus(this.wireName);

  final String wireName;

  static InviteStatus fromWire(String value) {
    return InviteStatus.values.firstWhere(
      (status) => status.wireName == value,
      orElse: () => throw const ApiException(
        502,
        'invalid_invite_response',
        'Loopin could not read the invitation status.',
      ),
    );
  }
}

final class TeamInvite {
  const TeamInvite({
    required this.inviteId,
    required this.teamId,
    required this.email,
    required this.status,
    required this.expiresAt,
  });

  final String inviteId;
  final String teamId;
  final String email;
  final InviteStatus status;
  final DateTime expiresAt;

  factory TeamInvite.fromJson(Map<String, Object?> json) {
    final inviteId = json['inviteId'];
    final teamId = json['teamId'];
    final email = json['email'];
    final status = json['status'];
    final expiresAt = json['expiresAt'];
    if (inviteId is! String ||
        inviteId.isEmpty ||
        teamId is! String ||
        teamId.isEmpty ||
        email is! String ||
        email.isEmpty ||
        status is! String ||
        expiresAt is! String) {
      throw const ApiException(
        502,
        'invalid_invite_response',
        'Loopin could not read the invitation.',
      );
    }
    return TeamInvite(
      inviteId: inviteId,
      teamId: teamId,
      email: email,
      status: InviteStatus.fromWire(status),
      expiresAt: DateTime.parse(expiresAt),
    );
  }
}

final class TeamMembership {
  const TeamMembership({
    required this.teamId,
    required this.userId,
    required this.role,
    required this.joinedAt,
  });

  final String teamId;
  final String userId;
  final TeamRole role;
  final DateTime joinedAt;

  factory TeamMembership.fromJson(Map<String, Object?> json) {
    final teamId = json['teamId'];
    final userId = json['userId'];
    final role = json['role'];
    final joinedAt = json['joinedAt'];
    if (teamId is! String ||
        teamId.isEmpty ||
        userId is! String ||
        userId.isEmpty ||
        role is! String ||
        joinedAt is! String) {
      throw const ApiException(
        502,
        'invalid_membership_response',
        'Loopin could not read the membership.',
      );
    }
    return TeamMembership(
      teamId: teamId,
      userId: userId,
      role: TeamRole.fromWire(role),
      joinedAt: DateTime.parse(joinedAt),
    );
  }
}

final class LeadershipTransfer {
  const LeadershipTransfer({required this.teamId, required this.leaderUserId});

  final String teamId;
  final String leaderUserId;

  factory LeadershipTransfer.fromJson(Map<String, Object?> json) {
    final teamId = json['teamId'];
    final leaderUserId = json['leaderUserId'];
    if (teamId is! String ||
        teamId.isEmpty ||
        leaderUserId is! String ||
        leaderUserId.isEmpty) {
      throw const ApiException(
        502,
        'invalid_leader_response',
        'Loopin could not read the leader transfer.',
      );
    }
    return LeadershipTransfer(teamId: teamId, leaderUserId: leaderUserId);
  }
}

final class MemberRemoval {
  const MemberRemoval({
    required this.teamId,
    required this.userId,
    required this.removed,
  });

  final String teamId;
  final String userId;
  final bool removed;

  factory MemberRemoval.fromJson(Map<String, Object?> json) {
    final teamId = json['teamId'];
    final userId = json['userId'];
    final removed = json['removed'];
    if (teamId is! String ||
        teamId.isEmpty ||
        userId is! String ||
        userId.isEmpty ||
        removed is! bool) {
      throw const ApiException(
        502,
        'invalid_remove_response',
        'Loopin could not read the member removal.',
      );
    }
    return MemberRemoval(teamId: teamId, userId: userId, removed: removed);
  }
}
