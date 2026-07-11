import 'package:flutter/material.dart';

abstract final class LoopinTheme {
  static const loopinGreen = Color(0xFF18724B);
  static const roadInk = Color(0xFF13251C);
  static const warmBone = Color(0xFFF4F1E8);
  static const softSage = Color(0xFFDCE8DE);
  static const safetyAmber = Color(0xFFE5A83A);
  static const clayLine = Color(0xFFC8CEC9);
  static const mutedInk = Color(0xFF596960);
  static const deepRoad = Color(0xFF12271C);

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
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: roadInk,
          minimumSize: const Size(48, 48),
          side: const BorderSide(color: clayLine),
        ),
      ),
      cardTheme: const CardThemeData(
        color: Color(0xFFEEEAE0),
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(8)),
          side: BorderSide(color: clayLine),
        ),
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          color: roadInk,
          fontSize: 44,
          fontWeight: FontWeight.w700,
          height: 0.98,
        ),
        headlineMedium: TextStyle(
          color: roadInk,
          fontSize: 30,
          fontWeight: FontWeight.w700,
          height: 1.15,
        ),
        bodyLarge: TextStyle(color: roadInk, fontSize: 17, height: 1.5),
        labelSmall: TextStyle(
          color: mutedInk,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1,
        ),
      ),
    );
  }
}
