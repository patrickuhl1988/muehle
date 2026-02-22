// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const optionalPackages = [
  'react-native-google-mobile-ads',
  'react-native-purchases',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (optionalPackages.includes(moduleName)) {
    const packagePath = path.join(__dirname, 'node_modules', moduleName);
    if (!fs.existsSync(packagePath)) {
      const stubFile = `${moduleName}.js`;
      const stubPath = path.join(__dirname, 'lib', 'stubs', stubFile);
      if (fs.existsSync(stubPath)) {
        return { filePath: stubPath, type: 'sourceFile' };
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
