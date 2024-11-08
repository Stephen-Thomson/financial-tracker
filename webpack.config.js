const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: {
      resolve: {
        extensions: ['.js', '.json'], // Remove .jsx if not needed
        fallback: {
          stream: require.resolve('stream-browserify'),
          crypto: require.resolve('crypto-browserify'),
          path: require.resolve('path-browserify'),
          buffer: require.resolve('buffer'),
          url: require.resolve('url'),
          timers: require.resolve('timers-browserify'),
          os: require.resolve('os-browserify'),
          process: require.resolve('process'),
          assert: require.resolve('assert'),
          vm: require.resolve('vm-browserify'),
          https: require.resolve('https-browserify'),
          fs: require.resolve("browserify-fs")
        },
      },
      plugins: [
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process',
        }),
      ],
    },
  },
};
