import 'package:flutter_test/flutter_test.dart';
import 'package:loopin_mobile/features/trip_setup/trip_setup_state.dart';

void main() {
  test('join trip state only submits when the driver has usable details', () {
    const editing = JoinTripState(
      joinCode: 'HL26',
      displayName: 'An',
      status: JoinTripStatus.editing,
    );

    expect(editing.canSubmit, isTrue);
    expect(editing.copyWith(status: JoinTripStatus.joining).canSubmit, isFalse);
    expect(editing.copyWith(joinCode: 'A').canSubmit, isFalse);
  });

  test(
    'readiness checklist blocks live tracking until foreground and background permissions are ready',
    () {
      const blocked = DriverReadinessChecklist(
        joinedTrip: true,
        foregroundLocation: LocationPermissionState.foregroundGranted,
        backgroundLocation: LocationPermissionState.backgroundDenied,
        notificationsEnabled: true,
        ttsAvailable: true,
      );
      const ready = DriverReadinessChecklist(
        joinedTrip: true,
        foregroundLocation: LocationPermissionState.foregroundGranted,
        backgroundLocation: LocationPermissionState.backgroundGranted,
        notificationsEnabled: true,
        ttsAvailable: true,
      );

      expect(blocked.isReady, isFalse);
      expect(
        blocked.blockingItems,
        contains('Allow background location for live tracking'),
      );
      expect(ready.isReady, isTrue);
      expect(ready.blockingItems, isEmpty);
    },
  );
}
