/*
This is the "base" webpack config, which means the part that is equal for development and production.
*/
const path = require('path');
const fs = require('fs')

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');

const WebpackLicensePlugin = require('webpack-license-plugin');

const nodeModulePathConstant = "node_modules/";
const cesiumSourcePathConstant = 'node_modules/cesium/Source';
const cesiumStaticFilesPathConstant = 'static/cesiumJS/';
const distFolderPathConstant = path.resolve(__dirname, 'dist');


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
      // These are used by Cesium and lead to errors with webpack 5, since polyfills are no longer added automatically
      // Fow now we don't provide polyfills
      fs: '{}', 
      http: false,
      https: false,
      zlib: false,
      url: false
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
        template: 'src/index.html'
    }),
    new WebpackPwaManifest({
      name: "Digitaler Zwilling Herne",
      icons: [
        { src: path.resolve('src/icon-192.png'), sizes: '192x192' },
        { src: path.resolve('src/icon-512.png'), sizes: '512x512' }
      ]
    }),
    new WebpackLicensePlugin({
      outputFilename: "licenses.json",
      unacceptableLicenseTest: (licenseIdentifier) => {
        return ['GPL', 'AGPL', 'LGPL', 'NGPL'].includes(licenseIdentifier)
      },
      licenseOverrides: {
        'turf-jsts@1.2.3': 'EPL-1.0' // Has (EDL-1.0 OR EPL-1.0) in package.json
      },
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
          // TODO specify files to copy to reduce size of dist folder. Licenses are copied by a plugin anyway.
          { from: nodeModulePathConstant + 'bootstrap/dist', to: 'dependencies/bootstrap/' },
          { from: nodeModulePathConstant + '@fortawesome/fontawesome-free', to: 'dependencies/fontawesome'},
          { from: nodeModulePathConstant + 'range-slider-element/dist', to: 'dependencies/range-slider-element'},
          { from: nodeModulePathConstant + '@simonwep/pickr/dist', to: 'dependencies/pickr'},
          { from: nodeModulePathConstant + 'txml/dist/', to: 'dependencies/txml'},
          { from: nodeModulePathConstant + '@turf/turf/dist/', to: 'dependencies/turf/'},
          { from: nodeModulePathConstant + 'uuidjs/dist', to: 'dependencies/uuidjs'},
          { from: nodeModulePathConstant + 'marked', to: 'dependencies/marked'},
          { from: nodeModulePathConstant + 'dompurify/dist', to: 'dependencies/dompurify'},
          { from: nodeModulePathConstant + 'proj4/dist', to: 'dependencies/proj4'},
          { from: nodeModulePathConstant + 'three/build', to: 'dependencies/three'},
          { from: nodeModulePathConstant + 'uevent', to: 'dependencies/uevent'},
          { from: nodeModulePathConstant + 'echarts/dist', to: 'dependencies/echarts'},
          { from: nodeModulePathConstant + 'photo-sphere-viewer/dist', to: 'dependencies/photo-sphere-viewer'},
          // Renaming only one file here. First copy other files, then the file while renaming it.
          { from: nodeModulePathConstant + '@thomasloven/round-slider', to: 'dependencies/round-slider',
            globOptions: {
              ignore: ["**/round-slider.js", "**/round-slider.iife.js"]
            }
          },
          { from: nodeModulePathConstant + '@thomasloven/round-slider/round-slider.iife.js', to: 'dependencies/round-slider/round-slider.js'},
          
          { from: "src/libs/toggle-switchy/toggle-switchy.css", to: "dependencies/toggle-switchy/toggle-switchy.css"},
          // Copy images
          { from: 'src/images', to: 'static/images/'},
          { from: nodeModulePathConstant + 'bootstrap-icons/icons/', to: 'static/icons/bootstrap/' },
          // Copy favicon
          { from: 'src/favicon.ico', to: 'favicon.ico'}
      ]
    }),
    new webpack.DefinePlugin({
      // Define relative base path in cesium for loading assets
      // This is an environment variable
      CESIUM_BASE_URL: JSON.stringify('./static/cesiumJS/')
    }),
    // Below is a custom plugin definition
    // For whatever reason webpack creates an additional png-file in the dist folder.
    // It seem to be part of a dependency of cesiumJS and is not a valid image either.
    // The plugin uses the hook to remove this file after each build.
    {
      apply: (compiler) => {
        compiler.hooks.done.tap('myFileRemoverPlugin', () => {
            let filePath = distFolderPathConstant + "/2a0c2998445d1ea07470.png";
            fs.stat(filePath, function (err) {
                if (err && err.message.includes("no such file or directory")) return // Might happen and is fine, no error msg needed
            
                fs.unlink(filePath, function(err){
                     if(err) return console.error(err.message);
                });  
            });
        });
      }
    },
  ]
};