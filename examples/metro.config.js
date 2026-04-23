const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the SDK source at the workspace root
config.watchFolders = [workspaceRoot];

// Resolve node_modules from both the example app and the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Explicitly point Metro to the SDK source so it doesn't rely on symlink resolution
config.resolver.extraNodeModules = {
  '@userback/react-native-sdk': workspaceRoot,
};

module.exports = config;
