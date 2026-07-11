import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_controller.dart';
import '../auth_repository.dart';
import 'auth_scaffold.dart';

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final email = _email.text.trim();
    try {
      await ref.read(authControllerProvider.notifier).signIn(
        email: email,
        password: _password.text,
      );
      // On success the auth state flips to authenticated and the router
      // redirects away from this screen — no manual navigation needed.
    } on AuthException catch (e) {
      if (!mounted) return;
      if (e.isUserNotConfirmed) {
        context.go('/confirm?email=${Uri.encodeQueryComponent(email)}');
        return;
      }
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Welcome back',
      subtitle: 'Sign in to coordinate your group drive.',
      error: _error,
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            TextFormField(
              controller: _email,
              enabled: !_busy,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const <String>[AutofillHints.email],
              decoration: const InputDecoration(labelText: 'Email'),
              validator: validateEmail,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _password,
              enabled: !_busy,
              obscureText: true,
              autofillHints: const <String>[AutofillHints.password],
              decoration: const InputDecoration(labelText: 'Password'),
              validator: (v) =>
                  (v == null || v.isEmpty) ? 'Enter your password' : null,
              onFieldSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Sign in'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: _busy ? null : () => context.go('/sign-up'),
              child: const Text('Create an account'),
            ),
          ],
        ),
      ),
    );
  }
}
