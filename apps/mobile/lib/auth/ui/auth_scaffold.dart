import 'package:flutter/material.dart';

import '../../app/loopin_theme.dart';

/// Shared framing for the auth screens: centered, width-constrained, with a
/// heading, optional error banner, and the form body. Keeps the three screens
/// visually consistent and responsive without repeating layout.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    required this.title,
    required this.subtitle,
    required this.child,
    this.error,
    super.key,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final String? error;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Icon(
                    Icons.directions_car_filled_outlined,
                    size: 40,
                    color: LoopinTheme.loopinGreen,
                  ),
                  const SizedBox(height: 24),
                  Text(title, style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 8),
                  Text(subtitle, style: Theme.of(context).textTheme.bodyLarge),
                  if (error != null) ...<Widget>[
                    const SizedBox(height: 20),
                    _ErrorBanner(message: error!),
                  ],
                  const SizedBox(height: 28),
                  child,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.errorContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: <Widget>[
          Icon(Icons.error_outline, color: scheme.onErrorContainer, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Semantics(
              liveRegion: true,
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: scheme.onErrorContainer,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String? validateEmail(String? value) {
  final v = value?.trim() ?? '';
  if (v.isEmpty) return 'Enter your email';
  if (!v.contains('@') || !v.contains('.')) return 'Enter a valid email';
  return null;
}

/// Mirrors the deployed Cognito password policy: >= 8 chars with lower, upper
/// and a number (symbols not required).
String? validatePassword(String? value) {
  final v = value ?? '';
  if (v.length < 8) return 'At least 8 characters';
  if (!v.contains(RegExp('[a-z]'))) return 'Add a lowercase letter';
  if (!v.contains(RegExp('[A-Z]'))) return 'Add an uppercase letter';
  if (!v.contains(RegExp('[0-9]'))) return 'Add a number';
  return null;
}
