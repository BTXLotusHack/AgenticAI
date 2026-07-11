import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_repository.dart';
import 'auth_scaffold.dart';

class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});

  @override
  ConsumerState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends ConsumerState<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
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
      final alreadyConfirmed = await ref.read(authRepositoryProvider).signUp(
        email: email,
        password: _password.text,
      );
      if (!mounted) return;
      // Either way the next step is the confirmation code screen; if Cognito
      // reports the account already confirmed, the user can head to sign-in.
      final target = alreadyConfirmed ? '/sign-in' : '/confirm';
      context.go('$target?email=${Uri.encodeQueryComponent(email)}');
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Create your account',
      subtitle: 'Use your email so your group can find you.',
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
              autofillHints: const <String>[AutofillHints.newPassword],
              decoration: const InputDecoration(labelText: 'Password'),
              validator: validatePassword,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _confirm,
              enabled: !_busy,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirm password'),
              validator: (v) =>
                  v != _password.text ? 'Passwords do not match' : null,
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
                  : const Text('Create account'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: _busy ? null : () => context.go('/sign-in'),
              child: const Text('I already have an account'),
            ),
          ],
        ),
      ),
    );
  }
}
