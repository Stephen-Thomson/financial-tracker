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
