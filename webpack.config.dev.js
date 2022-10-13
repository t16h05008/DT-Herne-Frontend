const { merge } = require('webpack-merge');
const baseConfig = require('./webpack.config.base.js');

const path = require('path');

const Dotenv = require('dotenv-webpack');

module.exports = merge(baseConfig, {
  mode: 'development',
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
    static: {
      directory: path.join(__dirname, "dist")
    },
    client: {
      logging: 'log',
      overlay: {
        errors: true,
        warnings: false,
      },
      progress: true,
    },
    compress: true,
    port: 8080,
    watchFiles: {
      paths: [
        'src/**/*.html',
        'src/**/*.css'
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