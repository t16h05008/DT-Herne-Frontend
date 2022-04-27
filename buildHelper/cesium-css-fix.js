/*
The main script imports a cesium css file in the beginning by calling: import "cesium/Build/Cesium/Widgets/widgets.css";
However, this conflicts with webpack since webpack 5 respects the package.json "exports" field and the css file is not listed there.
In order to keep the initial cesium installation clean (e. g. don't manually edit the package.json) this script is used.
More information in the issue here: https://github.com/CesiumGS/cesium/issues/9212
Below code was posted as an answer: https://github.com/CesiumGS/cesium/issues/9212#issuecomment-1018683286 (slightly modified it)
*/
const fs = require('fs');
const fileName = require.resolve('cesium/package.json');
// try to load the file
try {
  const jsonString = fs.readFileSync(fileName);
  const file = JSON.parse(jsonString);
  // add new field for proper exporting widgets.css
  file.exports["./Build/Cesium/Widgets/widgets.css"] = "./Build/Cesium/Widgets/widgets.css";
  //file.exports["./Source/Widgets/widgets.css"] = "./Source/Widgets/widgets.css";
  // write the file (pretty printed)
  fs.writeFile(fileName, JSON.stringify(file, null, 4), function writeJSON(err) {
    if (err) return console.log(err);
  });
} catch (err) {
  console.error(err)
};