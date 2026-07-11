enum JoinTripStatus { editing, joining, joined, failed }

enum LocationPermissionState {
  unknown,
  foregroundDenied,
  foregroundGranted,
  backgroundDenied,
  backgroundGranted,
  permanentlyDenied,
}

final class JoinTripState {
  const JoinTripState({
    required this.joinCode,
    required this.displayName,
    required this.status,
    this.errorMessage,
  });

  final String joinCode;
  final String displayName;
  final JoinTripStatus status;
  final String? errorMessage;

  bool get canSubmit =>
      status != JoinTripStatus.joining &&
      joinCode.trim().length >= 4 &&
      displayName.trim().isNotEmpty;

  JoinTripState copyWith({
    String? joinCode,
    String? displayName,
    JoinTripStatus? status,
    String? errorMessage,
  }) {
    return JoinTripState(
      joinCode: joinCode ?? this.joinCode,
      displayName: displayName ?? this.displayName,
      status: status ?? this.status,
      errorMessage: errorMessage,
    );
  }
}

final class DriverReadinessChecklist {
  const DriverReadinessChecklist({
    required this.joinedTrip,
    required this.foregroundLocation,
    required this.backgroundLocation,
    required this.notificationsEnabled,
    required this.ttsAvailable,
  });

  final bool joinedTrip;
  final LocationPermissionState foregroundLocation;
  final LocationPermissionState backgroundLocation;
  final bool notificationsEnabled;
  final bool ttsAvailable;

  bool get isReady =>
      joinedTrip &&
      foregroundLocation == LocationPermissionState.foregroundGranted &&
      backgroundLocation == LocationPermissionState.backgroundGranted &&
      notificationsEnabled &&
      ttsAvailable;

  List<String> get blockingItems {
    final items = <String>[];
    if (!joinedTrip) items.add('Join a trip');
    if (foregroundLocation != LocationPermissionState.foregroundGranted) {
      items.add('Allow location while using the app');
    }
    if (backgroundLocation != LocationPermissionState.backgroundGranted) {
      items.add('Allow background location for live tracking');
    }
    if (!notificationsEnabled) items.add('Enable alerts');
    if (!ttsAvailable) items.add('Enable voice guidance');
    return items;
  }
}
