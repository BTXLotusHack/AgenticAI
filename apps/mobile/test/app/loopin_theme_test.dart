import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:loopin_mobile/app/loopin_theme.dart';

void main() {
  test('uses the warm editorial Loopin palette and accessible controls', () {
    final theme = LoopinTheme.light;

    expect(theme.useMaterial3, isTrue);
    expect(theme.colorScheme.primary, const Color(0xFF18724B));
    expect(theme.colorScheme.onSurface, const Color(0xFF13251C));
    expect(theme.scaffoldBackgroundColor, const Color(0xFFF4F1E8));
    expect(
      theme.elevatedButtonTheme.style?.minimumSize?.resolve(<WidgetState>{}),
      const Size(48, 48),
    );
  });
}
