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

  test('safety amber controls use accessible foreground contrast', () {
    final colors = LoopinTheme.light.colorScheme;

    expect(colors.onTertiary, LoopinTheme.roadInk);
    expect(
      _contrastRatio(colors.tertiary, colors.onTertiary),
      greaterThanOrEqualTo(4.5),
    );
  });
}

double _contrastRatio(Color first, Color second) {
  final lighter = first.computeLuminance() > second.computeLuminance()
      ? first.computeLuminance()
      : second.computeLuminance();
  final darker = first.computeLuminance() > second.computeLuminance()
      ? second.computeLuminance()
      : first.computeLuminance();

  return (lighter + 0.05) / (darker + 0.05);
}
