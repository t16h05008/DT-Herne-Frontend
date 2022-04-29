/*
This is the "base" webpack config, which means the part that is equal for development and production.
*/
const path = require('path');
const fs = require('fs')

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

const nodeModulePathConstant = "node_modules/";
const cesiumSourcePathConstant = 'node_modules/cesium/Source';
const cesiumStaticFilesPathConstant = 'static/cesiumJS/'
const distFolderPathConstant = path.resolve(__dirname, 'dist')


module.exports = {
  mode: 'development',
  entry: './src/js/main.js',
  output: {
    filename: 'bundle.js',
    path: distFolderPathConstant,
    clean: true,
    sourcePrefix: '' // Needed to compile multiline strings in Cesium
  },
  module: {
    rules: [
      {
        test: /\.(png|gif|jpg|jpeg|svg|xml|json)$/,
        use: [ 'url-loader' ]
      }
    ]
  },
  amd: {
    toUrlUndefined: true // Enable webpack-friendly use of require in Cesium
  },
  resolve: {
    fallback: {
      fs: "{}" // Recommended for cesiumJS
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
        template: 'src/index.html'
    }),
    // Workaround since devServer.client.progress is bugged
    // https://github.com/webpack/webpack-dev-server/issues/201
    new webpack.ProgressPlugin(),
    new CopyWebpackPlugin({ 
      patterns: [
          // Copy Cesium Assets, Widgets, and Workers to a static directory
          { from: path.resolve(cesiumSourcePathConstant, '../Build/Cesium/Workers'), to: path.join(cesiumStaticFilesPathConstant, "Workers") },
          { from: path.join(cesiumSourcePathConstant, 'Assets'), to: path.join(cesiumStaticFilesPathConstant, "Assets") },
          { from: path.join(cesiumSourcePathConstant, 'Widgets'), to: path.join(cesiumStaticFilesPathConstant, "Widgets") },
          { from: path.join(cesiumSourcePathConstant, 'ThirdParty'), to: path.join(cesiumStaticFilesPathConstant, "ThirdParty") },
          // Copy dist folders of dependencies
          // TODO specify files to copy to reduce size of dist folder
          { from: nodeModulePathConstant + 'bootstrap/dist', to: 'dependencies/bootstrap/' },
          { from: nodeModulePathConstant + '@fortawesome/fontawesome-free', to: 'dependencies/fontawesome'},
          // Copy images
          { from: 'src/images', to: 'static/images/'}
      ]
    }),
    new webpack.DefinePlugin({
      // Define relative base path in cesium for loading assets
      CESIUM_BASE_URL: JSON.stringify('/static/cesiumJS/')
    }),
    new Dotenv(),
    // Below is a custom plugin definition
    // For whatever reason webpack creates an additional png-file in the dist folder.
    // It seem to be part of a dependency of cesiumJS and is not a valid image either.
    // The plugin uses the hook to remove this file after each build.
    {
      apply: (compiler) => {
        compiler.hooks.done.tap('myFileRemoverPlugin', () => {
            let filePath = distFolderPathConstant + "/2a0c2998445d1ea07470.png";
            fs.stat(filePath, function (err) {
                if (err && err.message.includes("no such file or directory")) return // might happen and is fine, no error msg needed
            
                fs.unlink(filePath, function(err){
                     if(err) return console.error(err.message);
                });  
            });
        });
      }
    },
  ]
};