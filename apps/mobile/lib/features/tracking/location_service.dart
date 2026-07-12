import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'tracking_coordinator.dart';

final locationServiceProvider = Provider<LocationService>((ref) {
  return LocationService();
});

class LocationService {
  LocationService();

  Stream<LocationObservation> get locationStream {
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 0, // We handle filtering manually
    );

    Position? lastPosition;
    DateTime? lastUpdateTime;

    return Geolocator.getPositionStream(locationSettings: locationSettings).map((position) {
      final now = DateTime.now();

      // Threshold logic: 2 meters OR 5 seconds
      bool shouldUpdate = false;
      if (lastPosition == null || lastUpdateTime == null) {
        shouldUpdate = true;
      } else {
        final distance = Geolocator.distanceBetween(
          lastPosition!.latitude,
          lastPosition!.longitude,
          position.latitude,
          position.longitude,
        );
        final timeDiff = now.difference(lastUpdateTime!).inSeconds;

        if (distance >= 2.0 || timeDiff >= 5) {
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        lastPosition = position;
        lastUpdateTime = now;
        return LocationObservation(
          latitude: position.latitude,
          longitude: position.longitude,
          accuracyMeters: position.accuracy,
          speedKmh: position.speed * 3.6,
          headingDegrees: position.heading,
          batteryPercent: null, // Battery info not provided by geolocator directly
          observedAt: position.timestamp.toIso8601String(),
        );
      }

      return null;
    }).where((obs) => obs != null).cast<LocationObservation>();
  }

  Future<bool> checkPermissions() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }

    if (permission == LocationPermission.deniedForever) return false;

    return true;
  }
}
