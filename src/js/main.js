//import { Ion, Viewer } from 'cesium';
import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";
import "../css/main.css"


Cesium.Ion.defaultAccessToken = process.env.CESIUM_ION_ACCESS_TOKEN;

let viewer = new Cesium.Viewer('cesiumContainer', {
    terrainProvider: Cesium.createWorldTerrain()
});

let imageryLayers = viewer.baseLayerPicker.viewModel.imageryProviderViewModels;
let osmImageryLayer = imageryLayers.filter( layer => {
    return layer.name === "Open­Street­Map"
})
osmImageryLayer = osmImageryLayer[0];
viewer.baseLayerPicker.viewModel.selectedImagery = osmImageryLayer;


// Add Cesium OSM Buildings, a global 3D buildings layer.
const buildingsTileset = viewer.scene.primitives.add(Cesium.createOsmBuildings());   
// Fly the camera to San Francisco at the given longitude, latitude, and height.
viewer.camera.setView({
  destination : Cesium.Cartesian3.fromDegrees(7.2180656, 51.5431457, 1200), //lon, lat, height in meter
  orientation : {
    heading : Cesium.Math.toRadians(-20),
    pitch : Cesium.Math.toRadians(-60.0),
  }
});
