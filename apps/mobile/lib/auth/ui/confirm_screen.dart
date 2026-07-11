import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_repository.dart';
import 'auth_scaffold.dart';

class ConfirmScreen extends ConsumerStatefulWidget {
  const ConfirmScreen({required this.email, super.key});

  final String email;

  @override
  ConsumerState<ConfirmScreen> createState() => _ConfirmScreenState();
}

class _ConfirmScreenState extends ConsumerState<ConfirmScreen> {
  final _formKey = GlobalKey<FormState>();
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).confirmSignUp(
        email: widget.email,
        code: _code.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Email confirmed — please sign in.')),
      );
      context.go('/sign-in?email=${Uri.encodeQueryComponent(widget.email)}');
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resend() async {
    setState(() => _error = null);
    try {
      await ref.read(authRepositoryProvider).resendCode(widget.email);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('A new code is on its way.')),
        );
      }
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Confirm your email',
      subtitle: 'Enter the 6-digit code sent to ${widget.email}.',
      error: _error,
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            TextFormField(
              controller: _code,
              enabled: !_busy,
              keyboardType: TextInputType.number,
              autofillHints: const <String>[AutofillHints.oneTimeCode],
              decoration: const InputDecoration(labelText: 'Verification code'),
              validator: (v) =>
                  (v == null || v.trim().length < 6) ? 'Enter the 6-digit code' : null,
              onFieldSubmitted: (_) => _confirm(),
            ),
            const SizedBox(height: 28),
            FilledButton(
              onPressed: _busy ? null : _confirm,
              child: _busy
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Confirm'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: _busy ? null : _resend,
              child: const Text('Resend code'),
            ),
          ],
        ),
      ),
    );
  }
}
