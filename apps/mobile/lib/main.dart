import 'package:flutter/widgets.dart';

import 'app/app_environment.dart';
import 'app/loopin_app.dart';

void main() {
  const environmentName = String.fromEnvironment(
    'LOOPIN_ENV',
    defaultValue: 'prod',
  );
  final config = AppEnvironmentConfig.forName(environmentName);

  runApp(LoopinApp(config: config));
}
