// Monorepo bridge: Expo's AppEntry.js resolves ../../App to this file
// when the expo package is hoisted to root node_modules by npm workspaces.
// This re-exports the actual App component from apps/mobile/.
export { default } from './apps/mobile/App';
