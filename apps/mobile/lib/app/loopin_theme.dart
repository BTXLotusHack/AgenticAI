import 'package:flutter/material.dart';

abstract final class LoopinTheme {
  static const loopinGreen = Color(0xFF18724B);
  static const roadInk = Color(0xFF13251C);
  static const warmBone = Color(0xFFF4F1E8);
  static const softSage = Color(0xFFDCE8DE);
  static const safetyAmber = Color(0xFFE5A83A);

  static ThemeData get light {
    final colorScheme =
        ColorScheme.fromSeed(
          seedColor: loopinGreen,
          brightness: Brightness.light,
          surface: warmBone,
        ).copyWith(
          primary: loopinGreen,
          onPrimary: Colors.white,
          onSurface: roadInk,
          secondaryContainer: softSage,
          tertiary: safetyAmber,
          onTertiary: roadInk,
        );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: warmBone,
      appBarTheme: const AppBarTheme(
        backgroundColor: warmBone,
        foregroundColor: roadInk,
        centerTitle: false,
        elevation: 0,
      ),
      elevatedButtonTheme: const ElevatedButtonThemeData(
        style: ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(48, 48))),
      ),
      textTheme: const TextTheme(
        headlineMedium: TextStyle(
          color: roadInk,
          fontSize: 30,
          fontWeight: FontWeight.w700,
          height: 1.15,
        ),
        bodyLarge: TextStyle(color: roadInk, fontSize: 17, height: 1.5),
      ),
    );
  }
}
