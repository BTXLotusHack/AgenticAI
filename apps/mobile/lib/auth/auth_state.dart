/// The authenticated user, projected from the Cognito id-token claims.
final class AuthUser {
  const AuthUser({required this.userId, required this.email});

  /// Cognito `sub` — the stable id the backend authorizes against.
  final String userId;
  final String email;
}

/// Authentication status the router and UI react to.
///
/// [AuthUnknown] is the bootstrap state while a stored session is being
/// restored; the router parks on a splash until it resolves so a returning
/// user is never briefly bounced to sign-in.
sealed class AuthState {
  const AuthState();
}

final class AuthUnknown extends AuthState {
  const AuthUnknown();
}

final class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.user);
  final AuthUser user;
}

final class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}
