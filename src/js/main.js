//import { Ion, Viewer } from 'cesium';
import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";
import "../css/main.css"

// dependencies could be added like this, but they are added in the index file
// import "bootstrap/dist/css/bootstrap.css"
// import "bootstrap/dist/js/bootstrap.bundle"

Cesium.Ion.defaultAccessToken = process.env.CESIUM_ION_ACCESS_TOKEN;
const initialCameraView = {
  position: {
    lat: 51.54062,
    lon: 7.22472,
    height: 240 // meter
  },
  orientation: { // in degree
    heading: 295,
    pitch: -30,
    roll: 0.0,
  }
}

var imageryViewModels = [];
imageryViewModels.push(new Cesium.ProviderViewModel({
    name: 'Sentinel-2',
    iconUrl: Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/sentinel-2.png'),
    tooltip: 'Sentinel-2 cloudless',
    creationFunction: function () {
        return new Cesium.IonImageryProvider({ assetId: 3954 });
    }
}));

var viewer = new Cesium.Viewer('cesiumContainer', {
    terrainProvider: Cesium.createWorldTerrain(),
    imageryProviderViewModels: imageryViewModels,
    baseLayerPicker: false, // probably enable later down the line
    geocoder: false

});

var camera = viewer.camera;
var coordOverlayLat = document.getElementById("coordOverlayLat")
var coordOverlayLon = document.getElementById("coordOverlayLon")
var coordOverlayHeight = document.getElementById("coordOverlayHeight")
var coordOverlayHeading = document.getElementById("coordOverlayHeading")
var coordOverlayPitch = document.getElementById("coordOverlayPitch")
var coordOverlayRoll = document.getElementById("coordOverlayRoll")
camera.moveEnd.addEventListener(function() { 
  // the camera stopped moving
  // transform coords to radiants, then to degree (lon lat)
  var cartographic = Cesium.Cartographic.fromCartesian(camera.position)
  coordOverlayLat.innerHTML = round(Cesium.Math.toDegrees(cartographic.latitude), 5)
  coordOverlayLon.innerHTML =  round(Cesium.Math.toDegrees(cartographic.longitude), 5);
  coordOverlayHeight.innerHTML = Math.round(cartographic.height); // +- 1 meter should be accurate enough
  // orientation
  coordOverlayHeading.innerHTML = round(Cesium.Math.toDegrees(camera.heading), 5);
  coordOverlayPitch.innerHTML = round(Cesium.Math.toDegrees(camera.pitch), 5);
  var roll = round(Cesium.Math.toDegrees(camera.roll), 5);
  coordOverlayRoll.innerHTML = roll > 359 ? 0 : roll; // display as 0 if it is close to 360 due to rounding errors 
});
// set initial camera view defined above
camera.setView({
  destination : Cesium.Cartesian3.fromDegrees(
    initialCameraView.position.lon,
    initialCameraView.position.lat,
    initialCameraView.position.height
  ),
  orientation : {
    heading: Cesium.Math.toRadians(initialCameraView.orientation.heading),
    pitch: Cesium.Math.toRadians(initialCameraView.orientation.pitch),
    roll: Cesium.Math.toRadians(initialCameraView.orientation.roll)
  }
});

var menu = document.getElementById('menu')
menu.addEventListener('show.bs.offcanvas', function () {
  var menuWidth = getComputedStyle(document.documentElement,null).getPropertyValue('--menu-width');
  // no need to add the sidebar width since it is not in this div
  document.getElementById("cesiumContainer").style.marginLeft = menuWidth;
})

menu.addEventListener('hide.bs.offcanvas', function () {
  document.getElementById("cesiumContainer").style.marginLeft = "0";
});


// switch base layer to OSM
// let imageryLayers = viewer.baseLayerPicker.viewModel.imageryProviderViewModels;
// let osmImageryLayer = imageryLayers.filter( layer => {
//     return layer.name === "Open­Street­Map"
// })
// osmImageryLayer = osmImageryLayer[0];
// //viewer.baseLayerPicker.viewModel.selectedImagery = osmImageryLayer;


// Add Cesium OSM Buildings, a global 3D buildings layer.
const buildingsTileset = viewer.scene.primitives.add(Cesium.createOsmBuildings());   



// A simple rounding method for utility.
// Not accurate in some edge cases
// e.g. round(1.005, 2) should be 1.01 but result is 1
const round = (num, places) => {
  var x = Math.pow(10, places)
  return Math.round(num * x) / x;
}
