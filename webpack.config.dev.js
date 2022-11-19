const { merge } = require('webpack-merge');
const baseConfig = require('./webpack.config.base.js');

const path = require('path');

const Dotenv = require('dotenv-webpack');

module.exports = merge(baseConfig, {
  mode: 'development',
  watchOptions: {
    ignored: ['**/node_modules', '**/dist'],
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
        sideEffects: true // apparently the import statements for css files via js count as side effects...
      }
    ]
  },
  devtool: 'eval',
  optimization: {
    usedExports: true,
  },
  devServer: {
    client: {
      logging: 'log',
      overlay: {
        errors: true,
        warnings: false,
      },
      progress: true,
    },
    compress: true,
    port: 8081,
    watchFiles: {
      paths: [
        'src/**/*.html',
        'src/**/*.css',
      ],
      options: {
        usePolling: false,
      },
    },
  },
  plugins: [
    new Dotenv({
      path: './.env.development'
    }),
  ]
});