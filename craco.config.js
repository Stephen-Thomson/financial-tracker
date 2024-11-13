const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: {
      resolve: {
        extensions: ['.js', '.json', '.jsx'],
        fallback: {
          stream: require.resolve('stream-browserify'),
          crypto: require.resolve('crypto-browserify'),
          path: require.resolve('path-browserify'),
          buffer: require.resolve('buffer'),
          url: require.resolve('url'),
          timers: require.resolve('timers-browserify'),
          os: require.resolve('os-browserify'),
          process: require.resolve('process/browser.js'),
          fs: require.resolve('browserify-fs'),
          vm: require.resolve('vm-browserify'),
          https: require.resolve('https-browserify'),
          http: require.resolve('stream-http'),
        },
      },
      plugins: [
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser.js',
        }),
      ],
    },
  },
};
