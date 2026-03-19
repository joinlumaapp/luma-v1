const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// ─── FIX: Disable Expo's automatic workspace-root detection ──────────
// Expo's getDefaultConfig() auto-detects the npm-workspace root and sets
// both config.server.unstable_serverRoot and the manifest middleware's
// getMetroServerRoot() to the monorepo root.  This causes two problems:
//
// 1. The manifest reports mainModuleName as "apps/mobile/index" (relative
//    to the monorepo root), producing a bundle URL like
//    /apps/mobile/index.bundle
//
// 2. Metro resolves that URL relative to unstable_serverRoot.  If we
//    override unstable_serverRoot to projectRoot (apps/mobile/) the path
//    becomes apps/mobile/apps/mobile/index → 404.  If we leave it as
//    the monorepo root, then a plain /index.bundle request fails because
//    there is no index.js at the monorepo root.
//
// Setting EXPO_NO_METRO_WORKSPACE_ROOT BEFORE calling getDefaultConfig
// disables this entirely.  Both Metro and the manifest middleware then
// treat apps/mobile/ as the root, so:
//   - mainModuleName = "index"
//   - bundle URL    = /index.bundle
//   - Metro resolves /index.bundle → apps/mobile/index.js  ✓
process.env.EXPO_NO_METRO_WORKSPACE_ROOT = '1';

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the shared package so @luma/shared sources are visible to Metro,
// plus the root node_modules where hoisted dependencies live.
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages', 'shared'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Look up hoisted dependencies in root node_modules (npm workspaces)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Exclude .bin symlinks and .git from watching (avoids EACCES on Windows)
config.watcher = {
  ...config.watcher,
  additionalExclusions: [
    '**/node_modules/.bin/**',
    '**/.git/**',
  ],
};

config.resolver.blockList = [
  /node_modules[/\\]\.bin[/\\].*/,
  /\.git[/\\].*/,
];

// Redirect Expo's AppEntry.js imports to apps/mobile/ equivalents.
// When expo is hoisted to the monorepo root node_modules, AppEntry.js
// does `import App from '../../App'` which resolves to the monorepo root
// instead of apps/mobile/. This resolver fixes that.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // AppEntry.js: import App from '../../App' → apps/mobile/App.tsx
  if (moduleName === '../../App') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(projectRoot, 'App.tsx'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
