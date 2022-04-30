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
// declare global variables so they are available in every function
var sidebarBtns;
var baseLayersImageryContainer;
var baseLayersTerrainContainer;
var viewer, camera;
var bLayerPickerViewModel
var imageryViewModels
var terrainViewModels;

document.addEventListener("DOMContentLoaded", function(event) {
    initializeApplication();
});

function initializeApplication() {
    sidebarBtns = document.querySelectorAll(".sidebarBtn")
    baseLayersImageryContainer = document.querySelector("#base-layers-imagery .accordion-body")
    baseLayersTerrainContainer = document.querySelector("#base-layers-terrain .accordion-body")

    // select Open­Street­Map layer on startup for reduced quota usage during development
    var defaultImageryViewModels = Cesium.createDefaultImageryProviderViewModels();
    var defaultTerrainViewModels = Cesium.createDefaultTerrainProviderViewModels();
    var layerName = "Open­Street­Map"
    var filtered = defaultImageryViewModels.filter( viewModel => {
        return viewModel.name === layerName;
    });
    var imageryToSelect = filtered.length === 1 ? filtered[0] : undefined;
    if(imageryToSelect === undefined) throw new Error("Layer '" + layerName + "' could not be found.");

    // layerName = "WGS84 Ellipsoid"
    // filtered = defaultTerrainViewModels.filter( viewModel => {
    //     return viewModel.name === layerName;
    // });
    // var terrainToSelect = filtered.length === 1 ? filtered[0] : undefined;
    // if(terrainToSelect === undefined) throw new Error("Layer '" + layerName + "' could not be found.");

    // initialize cesium viewer
    viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: Cesium.createWorldTerrain(),
        // has to be provided for some reason, even though the layers are the same
        imageryProviderViewModels: defaultImageryViewModels, 
        terrainProviderViewModels: defaultTerrainViewModels,
        baseLayerPicker: true,
        selectedImageryProviderViewModel: imageryToSelect,
        selectedTerrainProviderViewModel: undefined,
        geocoder: false,
        fullscreenButton: false
    });

    bLayerPickerViewModel = viewer.baseLayerPicker.viewModel;
    imageryViewModels = bLayerPickerViewModel.imageryProviderViewModels;
    terrainViewModels = bLayerPickerViewModel.terrainProviderViewModels;
    viewer.baseLayerPicker.destroy(); // No longer needed, we manage base layers in the sidebar based on the stored references 
    // add osm buildings to scene
    // const buildingsTileset = viewer.scene.primitives.add(Cesium.createOsmBuildings());
    console.log(viewer.dataSources);
    // initialize camera view defined above
    camera = viewer.camera;
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

    // initialize camera position overlay
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

    for(var btn of sidebarBtns) {

        var menuId = btn.dataset.bsTarget
        var menu = document.querySelector(menuId)
        var closeBtn = menu.querySelector(".btn-close"); // only one close btn exists

        // listeners for toggling the menu
        menu.addEventListener('show.bs.offcanvas', function () {
            var menuWidth = getComputedStyle(document.documentElement,null).getPropertyValue('--menu-width');
            // move the scene to the right when menu opens
            // no need to add the sidebar width since it is not in this div
            document.getElementById("cesiumContainer").style.marginLeft = menuWidth;
        })
        
        menu.addEventListener('hide.bs.offcanvas', function () {
            // on menu close move scene back to the left edge
            document.getElementById("cesiumContainer").style.marginLeft = "0";
        });

        // set sidebar button highlight color on click
        btn.addEventListener('click', function(event) {
            // get the menu of the clicked button
            let clickedBtn = event.target;
            var clickedBtnMenuId = clickedBtn.dataset.bsTarget
            var clickedBtnMenu = document.querySelector(clickedBtnMenuId)

            // iterate buttons and remove highlight color
            for(var btn of sidebarBtns) {
                btn.style.setProperty("color", "white", "important")
            }

            // for the clicked button: check if menu is visible and set color based on that
            if(clickedBtnMenu.classList.contains("show")) {
                var highlightColor = getComputedStyle(document.documentElement,null).getPropertyValue('--sidebar-btn-highlight-color');
                clickedBtn.style.setProperty("color", highlightColor, "important")
            }
        });

        // remove highlight color from all sidebar btns
        closeBtn.addEventListener("click", function() {
            for(var btn of sidebarBtns) {
                btn.style.setProperty("color", "white", "important")
            }
        });
    }

    populateBaseLayers('imagery');
    populateBaseLayers('terrain');

    
    // Cesium.GeoJsonDataSource.clampToGround = true; // this leads to polygon outlines not showing and is a bug in Cesium
    // const promise = Cesium.GeoJsonDataSource.load('http://localhost:8080/grid1000_epsg4326.geojson', {
    //     name: "Grid 1000x1000m",
    //     stroke: Cesium.Color.BLACK,
    //     fill: Cesium.Color.GREEN.withAlpha(0.5),
    //     strokeWidth: 10,
    // });
    // promise.then(function (dataSource) {
    //     viewer.dataSources.add(dataSource);
    // });

}

function populateBaseLayers(type) {

    var layers, layerContainerDom;

    if(type !== "imagery" && type !== "terrain")
        throw new Error("Parameter 'type' was neither 'imagery' nor 'terrain'");
    
    if(type === "imagery") {
        layers = imageryViewModels;
        layerContainerDom = baseLayersImageryContainer;
    }

    if(type === "terrain") {
        layers = terrainViewModels;
        layerContainerDom = baseLayersTerrainContainer;
    }

    for(const layer of layers) {
        var layerDiv = document.createElement("div");
        layerDiv.classList.add("menu-base-layer-entry");
        
        var radioBtn = document.createElement("input");
        radioBtn.classList.add("form-check-input")
        radioBtn.type = "radio";
        radioBtn.name = (type === "imagery") ? "radioImagery" : "radioTerrain";
        radioBtn.value = layer.name;
        if(bLayerPickerViewModel.selectedImagery === layer) {
            radioBtn.checked = true;
        }
        if(bLayerPickerViewModel.selectedTerrain === layer) {
            radioBtn.checked = true;
        }

        radioBtn.addEventListener("click", function(event) {
            changeBaseLayer(event, type, layer);
        });

        layerDiv.appendChild(radioBtn)

        var thumb = new Image(64, 64);
        thumb.src = layer.iconUrl;
        thumb.alt = "Layer Vorschaubild";
        thumb.style.borderRadius = "10%";
        layerDiv.appendChild(thumb);

        if(type === "imagery") {
            var innerDiv = document.createElement("div");

            var span = document.createElement("span");
            span.style.display = "block";
            span.style.width = "100%";
            span.style.marginTop = "10px";
            span.innerHTML = layer.name;
            innerDiv.appendChild(span);
    
            var opacitySlider = document.createElement("range-slider");
            opacitySlider.value = 100;
            opacitySlider.classList.add("opacitySlider")
            if( !radioBtn.checked ) opacitySlider.disabled = true; // only visually disabled
            opacitySlider.dataset.layerName = layer.name;
            opacitySlider.addEventListener("input", function(event) {
                var value = event.target.value;
                for(var i=0; i<viewer.imageryLayers.length;i++) {
                    var layer = viewer.imageryLayers.get(i);
                    if(layer.isBaseLayer) {
                        layer.alpha = value / 100;
                    }
                }
            });
            // The easiest method to disable the slider is to wrap it inside a div and disable pointer events on that.
            var opacitySliderWrapper = document.createElement("div");
            opacitySliderWrapper.classList.add("opacitySliderWrapper");
            if( !radioBtn.checked ) {
                opacitySliderWrapper.classList.add("opacitySliderWrapperDisabled")
            }
            
            opacitySliderWrapper.appendChild(opacitySlider)
            innerDiv.appendChild(opacitySliderWrapper)
    
            layerDiv.appendChild(innerDiv)
        } else {
            // no opacity slider needed for terrain
            var span = document.createElement("span");
            span.innerHTML = layer.name;
            layerDiv.appendChild(span);
        }

        var infoBtn = document.createElement("i");
        infoBtn.classList.add("fa-solid", "fa-lg", "fa-circle-info");
        infoBtn.style.marginLeft = "auto";
        infoBtn.dataset.bsToggle = "tooltip";
        infoBtn.dataset.bsPlacement = "bottom";
        infoBtn.title = layer.tooltip;
        layerDiv.appendChild(infoBtn)

        layerContainerDom.appendChild(layerDiv);

        // add a spacer below
        var spacer = document.createElement("hr");
        spacer.classList.add("layerSpacer");
        layerContainerDom.appendChild(spacer);
    }

    // TODO only for imagery for now. Terrain leads to an error.
    if(type === "imagery") {
        // add option to remove layer as last entry
        var layerDiv = document.createElement("div");
        layerDiv.classList.add("menu-base-layer-entry");
            
        var radioBtn = document.createElement("input");
        radioBtn.classList.add("form-check-input")
        radioBtn.type = "radio";
        radioBtn.name = "radioImagery";
        radioBtn.value = "";
            
        radioBtn.addEventListener("click", function(event) {
            changeBaseLayer(event, type, undefined);
        });
        
        layerDiv.appendChild(radioBtn)
        
        var canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        canvas.style.display = "block";
        canvas.style.borderRadius = "6px";
        var ctx = canvas.getContext("2d");
        ctx.strokeStyle = 'red';
        ctx.moveTo(0,0);
        ctx.lineTo(64,64);
        ctx.moveTo(64,0);
        ctx.lineTo(0,64);
        ctx.stroke();
        layerDiv.appendChild(canvas);
        
        var span = document.createElement("span");
        span.innerHTML = "Kein Layer";
        layerDiv.appendChild(span);
        
        layerContainerDom.appendChild(layerDiv);
    }
}


/**
 * changes base imagery or terrain
 */
function changeBaseLayer(event, type, layer) {
    // disable all opacity sliders except the one of the clicked layer
    // if terrain layer was clicked do nothing
    var sliderValue;
    if(type !== "terrain") {
        var opacitySliderWrappers = document.querySelectorAll("#base-layers-imagery .opacitySliderWrapper")
        sliderValue = 100;
    
        for(var wrapper of opacitySliderWrappers) {
            var slider = wrapper.querySelector("range-slider");
    
            if(slider.dataset.layerName === layer.name) {
                wrapper.classList.remove("opacitySliderWrapperDisabled");
                slider.removeAttribute("disabled")
                sliderValue = slider.value;
            } else {
                wrapper.classList.add("opacitySliderWrapperDisabled");
                slider.disabled = true;
            }
        }
    }

    try {
        if(type === "imagery") {
            bLayerPickerViewModel.selectedImagery = layer;
            // set opacity according to slider
            for(var i=0; i<viewer.imageryLayers.length;i++) {
                var layer = viewer.imageryLayers.get(i);
                if(layer.isBaseLayer) {
                    console.log(layer);
                    layer.alpha = sliderValue / 100;
                }
            };
        }
        if(type === "terrain") bLayerPickerViewModel.selectedTerrain = layer;
    } catch (e) {
        console.error("Something went wrong while changing base layers.")
        console.error(e); 
    }
}

// switch base layer to OSM
// let imageryLayers = viewer.baseLayerPicker.viewModel.imageryProviderViewModels;
// let osmImageryLayer = imageryLayers.filter( layer => {
//     return layer.name === "Open­Street­Map"
// })
// osmImageryLayer = osmImageryLayer[0];
// //viewer.baseLayerPicker.viewModel.selectedImagery = osmImageryLayer;

// A simple rounding method for utility.
// Not accurate in some edge cases
// e.g. round(1.005, 2) should be 1.01 but result is 1
const round = (num, places) => {
  var x = Math.pow(10, places)
  return Math.round(num * x) / x;
}
