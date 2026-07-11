import 'package:amazon_cognito_identity_dart_2/cognito.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists Cognito session tokens in the platform keystore/keychain.
///
/// `amazon_cognito_identity_dart_2` caches the access/id/refresh tokens through
/// this [CognitoStorage] interface; backing it with [FlutterSecureStorage]
/// keeps the refresh token (valid for 30 days) off plaintext preferences so a
/// returning driver stays signed in without re-entering credentials.
final class SecureCognitoStorage extends CognitoStorage {
  SecureCognitoStorage([FlutterSecureStorage? storage])
    : _storage =
          storage ??
          const FlutterSecureStorage(
            aOptions: AndroidOptions(encryptedSharedPreferences: true),
          );

  final FlutterSecureStorage _storage;

  @override
  Future<String?> getItem(String key) => _storage.read(key: key);

  @override
  Future<String> setItem(String key, dynamic value) async {
    final stored = value.toString();
    await _storage.write(key: key, value: stored);
    return stored;
  }

  @override
  Future<String?> removeItem(String key) async {
    final existing = await _storage.read(key: key);
    await _storage.delete(key: key);
    return existing;
  }

  @override
  Future<void> clear() => _storage.deleteAll();
}
