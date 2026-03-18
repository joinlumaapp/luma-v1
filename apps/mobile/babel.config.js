module.exports = function (api) {
  // Cache based on NODE_ENV so dev/prod get different configs
  api.cache.using(() => process.env.NODE_ENV);

  const plugins = [];

  // Strip all console.* calls in production builds only
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
