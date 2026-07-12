import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../../app/app_environment.dart';
import '../../auth/auth_repository.dart';

final liveMapRealtimeClientProvider = Provider<LiveMapRealtimeClient>((ref) {
  final config = ref.watch(appEnvironmentProvider);
  final auth = ref.watch(authRepositoryProvider);
  return AppSyncLiveMapRealtimeClient(config: config, auth: auth);
});

abstract interface class LiveMapRealtimeClient {
  Stream<Map<String, Object?>> subscribe(String tripId);
}

final class AppSyncLiveMapRealtimeClient implements LiveMapRealtimeClient {
  const AppSyncLiveMapRealtimeClient({
    required this.config,
    required this.auth,
  });

  final AppEnvironmentConfig config;
  final CognitoAuthRepository auth;

  static const _subscription = r'''
subscription OnRealtimeEvent($tripId: ID!) {
  onRealtimeEvent(tripId: $tripId) {
    schemaVersion
    eventId
    tripId
    snapshotRevision
    graphRevision
    audience
    eventType
    occurredAt
    expiresAt
    payload
  }
}
''';

  @override
  Stream<Map<String, Object?>> subscribe(String tripId) async* {
    final token = await auth.accessToken();
    if (token == null) {
      throw const RealtimeConnectionException('Not signed in.');
    }

    final realtimeUri = _realtimeUri(token);
    final channel = WebSocketChannel.connect(
      realtimeUri,
      protocols: const <String>['graphql-ws'],
    );
    final subscriptionId = 'live-map-$tripId';

    channel.sink.add(jsonEncode(<String, Object?>{'type': 'connection_init'}));
    var started = false;

    try {
      await for (final raw in channel.stream) {
        final message = _readMessage(raw);
        final type = message['type'];
        if (type == 'connection_ack' && !started) {
          channel.sink.add(
            jsonEncode(<String, Object?>{
              'id': subscriptionId,
              'type': 'start',
              'payload': <String, Object?>{
                'data': <String, Object?>{
                  'query': _subscription,
                  'variables': <String, Object?>{'tripId': tripId},
                },
                'extensions': <String, Object?>{
                  'authorization': _authorizationHeader(token),
                },
              },
            }),
          );
          started = true;
          continue;
        }
        if (type == 'data') {
          final payload = message['payload'];
          final payloadMap = payload is Map
              ? payload.cast<String, Object?>()
              : const <String, Object?>{};
          final data = payloadMap['data'];
          final dataMap = data is Map
              ? data.cast<String, Object?>()
              : const <String, Object?>{};
          final event = dataMap['onRealtimeEvent'];
          if (event is Map) {
            yield event.cast<String, Object?>();
          }
        } else if (type == 'error' || type == 'connection_error') {
          throw RealtimeConnectionException(jsonEncode(message));
        }
      }
    } finally {
      channel.sink.add(
        jsonEncode(<String, Object?>{'id': subscriptionId, 'type': 'stop'}),
      );
      await channel.sink.close();
    }
  }

  Uri _realtimeUri(String token) {
    return config.realtimeUrl.replace(
      queryParameters: <String, String>{
        'header': base64.encode(
          utf8.encode(jsonEncode(_authorizationHeader(token))),
        ),
        'payload': base64.encode(utf8.encode('{}')),
      },
    );
  }

  Map<String, String> _authorizationHeader(String token) {
    return <String, String>{
      'host': config.appSyncGraphqlUrl.host,
      'Authorization': token,
    };
  }

  Map<String, Object?> _readMessage(Object? raw) {
    final decoded = raw is String ? jsonDecode(raw) : raw;
    if (decoded is Map) return decoded.cast<String, Object?>();
    throw const RealtimeConnectionException('Invalid realtime message.');
  }
}

final class RealtimeConnectionException implements Exception {
  const RealtimeConnectionException(this.message);

  final String message;

  @override
  String toString() => message;
}
