import 'dart:convert';

import 'package:amazon_cognito_identity_dart_2/cognito.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../app/app_environment.dart';
import 'auth_state.dart';
import 'token_store.dart';

/// A user-presentable authentication failure with a stable machine code.
final class AuthException implements Exception {
  const AuthException(this.code, this.message);

  final String code;
  final String message;

  bool get isUserNotConfirmed => code == 'UserNotConfirmedException';

  @override
  String toString() => message;
}

/// The Cognito user pool, backed by secure token storage. One instance per app
/// so a single cached session is shared across features.
final cognitoUserPoolProvider = Provider<CognitoUserPool>((ref) {
  final config = ref.watch(appEnvironmentProvider);
  return CognitoUserPool(
    config.cognitoUserPoolId,
    config.cognitoClientId,
    storage: SecureCognitoStorage(),
  );
});

final authRepositoryProvider = Provider<CognitoAuthRepository>((ref) {
  return CognitoAuthRepository(ref.watch(cognitoUserPoolProvider));
});

/// Cognito authentication over the pure-Dart SRP flow.
///
/// The deployed app client is public (no secret) and allows only
/// `USER_SRP_AUTH` + refresh, which `authenticateUser` uses by default. The
/// repository never exposes SDK types; it returns [AuthUser] / throws
/// [AuthException] so the controller and UI stay engine-agnostic.
final class CognitoAuthRepository {
  CognitoAuthRepository(this._pool);

  final CognitoUserPool _pool;

  /// Register a new account. Returns whether Cognito already treats the user as
  /// confirmed (false means an email verification code was sent).
  Future<bool> signUp({required String email, required String password}) async {
    try {
      final data = await _pool.signUp(
        email,
        password,
        userAttributes: <AttributeArg>[AttributeArg(name: 'email', value: email)],
      );
      return data.userConfirmed ?? false;
    } on CognitoClientException catch (e) {
      throw _mapError(e);
    }
  }

  /// Confirm a sign-up with the emailed verification code.
  Future<void> confirmSignUp({required String email, required String code}) async {
    final user = CognitoUser(email, _pool);
    try {
      await user.confirmRegistration(code);
    } on CognitoClientException catch (e) {
      throw _mapError(e);
    }
  }

  /// Re-send the email verification code for an unconfirmed account.
  Future<void> resendCode(String email) async {
    final user = CognitoUser(email, _pool);
    try {
      await user.resendConfirmationCode();
    } on CognitoClientException catch (e) {
      throw _mapError(e);
    }
  }

  /// Sign in with email + password (SRP). Persists the session via storage.
  Future<AuthUser> signIn({required String email, required String password}) async {
    final user = CognitoUser(email, _pool);
    final details = AuthenticationDetails(username: email, password: password);
    try {
      final session = await user.authenticateUser(details);
      if (session == null || !session.isValid()) {
        throw const AuthException('invalid_session', 'Could not start a session. Please try again.');
      }
      return _userFromSession(session);
    } on CognitoClientException catch (e) {
      throw _mapError(e);
    } on CognitoUserConfirmationNecessaryException {
      throw const AuthException(
        'UserNotConfirmedException',
        'Please confirm your email before signing in.',
      );
    }
  }

  /// Restore a persisted session on launch. Any failure is treated as
  /// signed-out rather than surfaced, so a bad cache never blocks the app.
  Future<AuthUser?> restoreSession() async {
    try {
      final user = await _pool.getCurrentUser();
      if (user == null) return null;
      final session = await user.getSession();
      if (session == null || !session.isValid()) return null;
      return _userFromSession(session);
    } catch (_) {
      return null;
    }
  }

  /// A valid access token for the API Gateway JWT authorizer, refreshing it
  /// automatically when expired. Null when there is no usable session.
  Future<String?> accessToken() async {
    final user = await _pool.getCurrentUser();
    if (user == null) return null;
    final session = await user.getSession();
    if (session == null || !session.isValid()) return null;
    return session.getAccessToken().getJwtToken();
  }

  Future<void> signOut() async {
    final user = await _pool.getCurrentUser();
    await user?.signOut();
  }

  AuthUser _userFromSession(CognitoUserSession session) {
    final claims = _decodeJwt(session.getIdToken().getJwtToken());
    return AuthUser(
      userId: (claims['sub'] as String?) ?? '',
      email: (claims['email'] as String?) ?? '',
    );
  }

  Map<String, dynamic> _decodeJwt(String? token) {
    if (token == null) return const <String, dynamic>{};
    final parts = token.split('.');
    if (parts.length != 3) return const <String, dynamic>{};
    try {
      final payload = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
      final decoded = jsonDecode(payload);
      return decoded is Map<String, dynamic> ? decoded : const <String, dynamic>{};
    } catch (_) {
      return const <String, dynamic>{};
    }
  }

  AuthException _mapError(CognitoClientException e) {
    return AuthException(
      e.code ?? 'unknown_error',
      e.message ?? 'Authentication failed. Please try again.',
    );
  }
}
