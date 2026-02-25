const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo root'unu izle (shared package değişiklikleri için)
config.watchFolders = [...(config.watchFolders || []), monorepoRoot];

// Root node_modules'a da bak (npm workspaces hoisting)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Backup resolver: AppEntry.js ../../App importunu apps/mobile/App.tsx'e yönlendir.
// Root App.js bridge dosyası birincil çözümdür, bu sadece yedektir.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '../../App') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(projectRoot, 'App.tsx'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
