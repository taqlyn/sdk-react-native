const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../../..");
const sdkRoot = path.resolve(projectRoot, "..");
const navRoot = path.resolve(projectRoot, "../../nav-expo-router");
const contractRoot = path.resolve(projectRoot, "../../sdk-contract");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sdkRoot, navRoot, contractRoot, workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(sdkRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@taqlyn/sdk-react-native": sdkRoot,
  "@taqlyn/nav-expo-router": navRoot,
  "@taqlyn/sdk-contract": contractRoot,
};

config.resolver.disableHierarchicalLookup = true;

module.exports = config;
