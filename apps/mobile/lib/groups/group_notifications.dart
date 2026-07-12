import 'package:flutter_riverpod/flutter_riverpod.dart';

final groupNotificationsProvider =
    NotifierProvider<GroupNotificationsController, List<GroupNotification>>(
      GroupNotificationsController.new,
    );

final class GroupNotification {
  const GroupNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    this.teamId,
    this.inviteId,
  });

  final String id;
  final String title;
  final String body;
  final DateTime createdAt;
  final String? teamId;
  final String? inviteId;
}

final class GroupNotificationsController
    extends Notifier<List<GroupNotification>> {
  @override
  List<GroupNotification> build() => const <GroupNotification>[];

  void push({
    required String title,
    required String body,
    String? teamId,
    String? inviteId,
  }) {
    final now = DateTime.now();
    final notification = GroupNotification(
      id: '${now.microsecondsSinceEpoch}:$title',
      title: title,
      body: body,
      createdAt: now,
      teamId: teamId,
      inviteId: inviteId,
    );
    state = <GroupNotification>[notification, ...state].take(20).toList();
  }

  void dismiss(String id) {
    state = state
        .where((notification) => notification.id != id)
        .toList(growable: false);
  }

  void clear() => state = const <GroupNotification>[];
}
