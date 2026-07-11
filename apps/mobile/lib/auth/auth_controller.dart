import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_repository.dart';
import 'auth_state.dart';

/// Holds the app-wide [AuthState]. Restores any persisted session on creation,
/// then exposes the session-changing actions (sign in / sign out). Sign-up and
/// confirmation do not change session state, so they live on the repository.
final authControllerProvider = NotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    _bootstrap();
    return const AuthUnknown();
  }

  CognitoAuthRepository get _repository => ref.read(authRepositoryProvider);

  Future<void> _bootstrap() async {
    final user = await _repository.restoreSession();
    state = user == null ? const AuthUnauthenticated() : AuthAuthenticated(user);
  }

  Future<void> signIn({required String email, required String password}) async {
    final user = await _repository.signIn(email: email, password: password);
    state = AuthAuthenticated(user);
  }

  Future<void> signOut() async {
    await _repository.signOut();
    state = const AuthUnauthenticated();
  }
}
