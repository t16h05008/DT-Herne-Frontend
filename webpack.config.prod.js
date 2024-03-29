const { merge } = require('webpack-merge');
const baseConfig = require('./webpack.config.base.js');

const path = require('path');
const fs = require('fs');


const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const Dotenv = require('dotenv-webpack');

const distFolderPath = path.resolve(__dirname, 'dist')

module.exports = merge(baseConfig, {
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
        sideEffects: true // apparently the import statements for css files via js count as side effects...
      }
    ]
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        styles: {
          name: "styles",
          type: "css/mini-extract",
          chunks: "all",
          enforce: true,
        },
      },
    },
    minimizer: [
      // For webpack@5 you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin`), uncomment the next line
      `...`,
      new CssMinimizerPlugin(),
    ],
    usedExports: true,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
    new Dotenv({
      path: './.env'
    }),
    // Below is a custom plugin definition
    // For whatever reason webpack creates an additional txt-file in the dist folder.
    // It seem to be part of a dependency of cesiumJS.
    // The plugin uses the hook to remove this file after each build
    {
        apply: (compiler) => {
          compiler.hooks.done.tap('myFileRemoverPlugin', () => {
              let filePath = distFolderPath + "/bundle.js.LICENSE.txt";
              fs.stat(filePath, function (err) {
                  if (err && err.message.includes("no such file or directory")) return // might happen and is fine, no error msg needed
              
                  fs.unlink(filePath, function(err){
                       if(err) return console.error(err.message);
                  });  
              });
          });
        }
      }
  ]
});