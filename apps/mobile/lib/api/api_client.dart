import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../app/app_environment.dart';
import '../auth/auth_repository.dart';

/// A failed control-plane API call, carrying the backend's `error.code`.
final class ApiException implements Exception {
  const ApiException(this.statusCode, this.code, this.message);

  final int statusCode;
  final String code;
  final String message;

  @override
  String toString() => 'ApiException($statusCode $code): $message';
}

final apiClientProvider = Provider<LoopinApiClient>((ref) {
  final config = ref.watch(appEnvironmentProvider);
  return LoopinApiClient(
    baseUrl: config.apiBaseUrl,
    auth: ref.watch(authRepositoryProvider),
  );
});

/// Thin JSON client for the API Gateway control plane. Every request carries a
/// fresh Cognito access token (auto-refreshed by the repository), matching the
/// backend's JWT authorizer. Paths are relative and must not start with `/`.
final class LoopinApiClient {
  LoopinApiClient({
    required this.baseUrl,
    required CognitoAuthRepository auth,
    http.Client? client,
  }) : _auth = auth,
       _client = client ?? http.Client();

  final Uri baseUrl;
  final CognitoAuthRepository _auth;
  final http.Client _client;

  Future<Map<String, dynamic>> get(String path) => _send('GET', path);
  Future<Map<String, dynamic>> post(String path, [Object? body]) => _send('POST', path, body);
  Future<Map<String, dynamic>> put(String path, [Object? body]) => _send('PUT', path, body);
  Future<Map<String, dynamic>> delete(String path) => _send('DELETE', path);

  Future<Map<String, dynamic>> _send(String method, String path, [Object? body]) async {
    final token = await _auth.accessToken();
    if (token == null) {
      throw const ApiException(401, 'unauthenticated', 'Not signed in.');
    }

    final request = http.Request(method, baseUrl.resolve(path))
      ..headers['authorization'] = 'Bearer $token';
    if (body != null) {
      request.headers['content-type'] = 'application/json';
      request.body = jsonEncode(body);
    }

    final response = await http.Response.fromStream(await _client.send(request));
    final decoded = response.body.isEmpty ? const <String, dynamic>{} : jsonDecode(response.body);
    final map = decoded is Map<String, dynamic>
        ? decoded
        : <String, dynamic>{'data': decoded};

    if (response.statusCode >= 200 && response.statusCode < 300) return map;

    final error = map['error'];
    throw ApiException(
      response.statusCode,
      error is Map && error['code'] is String ? error['code'] as String : 'error',
      error is Map && error['message'] is String
          ? error['message'] as String
          : 'Request failed (${response.statusCode}).',
    );
  }
}
