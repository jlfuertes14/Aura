const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Expo Config Plugin to enable Core Library Desugaring on :app.
 * Required when dependencies (such as NewPipeExtractor) require Java 8+ APIs.
 */
function withDesugaring(config) {
  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    // 1. Enable coreLibraryDesugaringEnabled true in compileOptions
    if (!contents.includes('coreLibraryDesugaringEnabled true')) {
      contents = contents.replace(
        /compileOptions\s*\{/,
        `compileOptions {\n        coreLibraryDesugaringEnabled true`
      );
    }

    // 2. Add desugar_jdk_libs dependency
    if (!contents.includes('coreLibraryDesugaring')) {
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
