const { override } = require('customize-cra');

module.exports = override((config) => {
  config.resolve.fallback = {
    fs: require.resolve('browserify-fs'),
    vm: require.resolve('vm-browserify'),
    https: require.resolve('https-browserify'),
  };
  return config;
});
