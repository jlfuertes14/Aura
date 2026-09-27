const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Expo Config Plugin to enable Core Library Desugaring on :app.
 * Required when dependencies (such as NewPipeExtractor) require Java 8+ APIs.
 */
function withDesugaring(config) {
  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    // 1. Ensure compileOptions with coreLibraryDesugaringEnabled is present in android { ... }
    if (!contents.includes('coreLibraryDesugaringEnabled true')) {
      if (contents.includes('compileOptions {')) {
        contents = contents.replace(
          /compileOptions\s*\{/,
          `compileOptions {\n        coreLibraryDesugaringEnabled true`
        );
      } else {
        contents = contents.replace(
          /android\s*\{/,
          `android {\n    compileOptions {\n        coreLibraryDesugaringEnabled true\n        sourceCompatibility JavaVersion.VERSION_1_8\n        targetCompatibility JavaVersion.VERSION_1_8\n    }`
        );
      }
    }

    // 2. Add desugar_jdk_libs dependency
    // NOTE: Must check for the specific artifact, NOT just 'coreLibraryDesugaring'
    // because 'coreLibraryDesugaringEnabled' (injected above) contains that substring.
    if (!contents.includes('desugar_jdk_libs')) {
      contents = contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.0.4'`
      );
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

module.exports = withDesugaring;
