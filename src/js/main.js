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
// derived from initialCameraView in the format needed by cesium
const initialCameraViewFormatted = {
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
}

// declare global variables so they are available in every function
const defaultGlobeColor = "#9A13D5"; // margenta
const defaultUndergroundColor = "#11C91F"; // lime-green
var sidebarBtns;
var baseLayersImageryContainer;
var baseLayersTerrainContainer;
var viewer, camera, scene, globe;
var bLayerPickerViewModel
var imageryViewModels
var terrainViewModels;
var northArrowImg;

document.addEventListener("DOMContentLoaded", function(event) {
    initializeApplication();
});

function initializeApplication() {
    sidebarBtns = document.querySelectorAll(".sidebarBtn")
    baseLayersImageryContainer = document.querySelector("#base-layers-imagery .accordion-body")
    baseLayersTerrainContainer = document.querySelector("#base-layers-terrain .accordion-body")
    northArrowImg = document.querySelector("#north-arrow-overlay")

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
        fullscreenButton: false,
        sceneModePicker: false
        
    });
    viewer.extend(Cesium.viewerCesiumInspectorMixin);
    bLayerPickerViewModel = viewer.baseLayerPicker.viewModel;
    imageryViewModels = bLayerPickerViewModel.imageryProviderViewModels;
    terrainViewModels = bLayerPickerViewModel.terrainProviderViewModels;
    viewer.baseLayerPicker.destroy(); // No longer needed, we manage base layers in the sidebar based on the stored references 
    // add osm buildings to scene
    // const buildingsTileset = viewer.scene.primitives.add(Cesium.createOsmBuildings());

    // initialize camera view defined above
    camera = viewer.camera;
    
    // initialize camera position overlay
    var coordOverlayLat = document.getElementById("coordOverlayLat")
    var coordOverlayLon = document.getElementById("coordOverlayLon")
    var coordOverlayHeight = document.getElementById("coordOverlayHeight")
    var coordOverlayHeading = document.getElementById("coordOverlayHeading")
    var coordOverlayPitch = document.getElementById("coordOverlayPitch")
    var coordOverlayRoll = document.getElementById("coordOverlayRoll")
    // gets called multiple times during camera movement
    camera.changed.addEventListener(function() { 
        // transform coords to radiants, then to degree (lon lat)
        var cartographic = Cesium.Cartographic.fromCartesian(camera.position)
        coordOverlayLat.innerHTML = round(Cesium.Math.toDegrees(cartographic.latitude), 5)
        coordOverlayLon.innerHTML =  round(Cesium.Math.toDegrees(cartographic.longitude), 5);
        coordOverlayHeight.innerHTML = Math.round(cartographic.height); // +- 1 meter should be accurate enough
        // orientation
        var newHeadingDeg = round(Cesium.Math.toDegrees(camera.heading), 5);
        coordOverlayHeading.innerHTML = newHeadingDeg;
        coordOverlayPitch.innerHTML = round(Cesium.Math.toDegrees(camera.pitch), 5);
        var roll = round(Cesium.Math.toDegrees(camera.roll), 5);
        coordOverlayRoll.innerHTML = roll > 359 ? 0 : roll; // display as 0 if it is close to 360 due to rounding errors 

         // rotate north arrow img according to heading
        northArrowImg.style.transform = "rotate(" + (newHeadingDeg * -1) + "deg)";
    });

    camera.setView(initialCameraViewFormatted);
    camera.changed.raiseEvent(); // trigger 'changed' event programmatically since it doesn't fire on initial setView

    // overwrite home button behavior to zoom to our custom initial position instead of the cesium default one, which is in space
    viewer.homeButton.viewModel.command.beforeExecute.addEventListener(
        function(e) {
           e.cancel = true;
           viewer.scene.camera.flyTo(initialCameraViewFormatted);
    });

    scene = viewer.scene;
    globe = scene.globe;

    // globe settings
    var settingsGlobeColor = document.getElementById("settingsGlobeColor");
    const globeColorPicker = createNewColorPicker(settingsGlobeColor, defaultGlobeColor);
    globeColorPicker.on("save", (color, instance) => {
        if(!color) { return }
        const newColor = convertColorPickerResultToCesiumColor(color);
        globe.baseColor  = newColor;
    });
    globe.baseColor = convertColorToCesiumColor(defaultGlobeColor);


    var settingsGlobeTransparencySlider = document.getElementById("settingsGlobeTransparencySlider");
    settingsGlobeTransparencySlider.addEventListener("input", function(event) {
        var value = event.target.value;
        if(value < 100) {
            globe.translucency.enabled = true;
            globe.translucency.frontFaceAlpha = value / 100;
            globe.translucency.backFaceAlpha = value / 100;
        } else {
            globe.translucency.enabled = false;
        }
    });
   
    // underground settings
    var settingsUndergroundCameraSwitch = document.getElementById("settingsUndergroundCameraSwitch");
    scene.screenSpaceCameraController.enableCollisionDetection = true;
    settingsUndergroundCameraSwitch.addEventListener("change", function(event) {
        var chb = event.target;
        // allow camera to move underground
        scene.screenSpaceCameraController.enableCollisionDetection = !(chb.checked); 
    });
    

    var settingsUndergroundColor = document.getElementById("settingsUndergroundColor");
    const undergroundColorPicker = createNewColorPicker(settingsUndergroundColor, defaultUndergroundColor);
    undergroundColorPicker.on("save", (color, instance) => {
        if(!color) { return }
        const newColor = convertColorPickerResultToCesiumColor(color);
        globe.undergroundColor  = newColor;
    });
    globe.undergroundColor = convertColorToCesiumColor(defaultUndergroundColor);
 
    var settingsNearFarScalar = new Cesium.NearFarScalar(
        1000,      // near
        0.5,    // nearValue
        3000000,    // far
        0.5     // farValue
    )
    globe.undergroundColorAlphaByDistance = settingsNearFarScalar

    var settingsGlobeNear = document.getElementById("settingsGlobeNear");
    settingsGlobeNear.value = settingsNearFarScalar.near;
    settingsGlobeNear.addEventListener("input", function(event) {
        console.log("near");
        globe.undergroundColorAlphaByDistance.near = event.target.value;
    });

    var settingsGlobeFar = document.getElementById("settingsGlobeFar");
    settingsGlobeFar.value = settingsNearFarScalar.far;
    settingsGlobeFar.addEventListener("input", function(event) {
        console.log("far");
        globe.undergroundColorAlphaByDistance.far = event.target.value;
        
    });

    var settingsGlobeNearAlpha = document.getElementById("settingsGlobeNearAlpha");
    settingsGlobeNearAlpha.value = settingsNearFarScalar.nearValue * 100;
    settingsGlobeNearAlpha.addEventListener("input", function(event) {
        console.log("NearAlpha");
        globe.undergroundColorAlphaByDistance.nearValue = event.target.value / 100;
    });

    var settingsGlobeFarAlpha= document.getElementById("settingsGlobeFarAlpha");
    settingsGlobeFarAlpha.value = settingsNearFarScalar.farValue * 100;
    settingsGlobeFarAlpha.addEventListener("input", function(event) {
        console.log("FarAlpha");
        globe.undergroundColorAlphaByDistance.farValue = event.target.value / 100;
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
                btn.style.color = "white";
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
                btn.style.color = "white";
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
    import3DModel()

    
}

function import3DModel() {
    // Import a 3D-Model
    // console.log(Cesium.HeightReference.RELATIVE_TO_GROUND);
    // var position = Cesium.Cartesian3.fromDegrees(7.2169987, 51.5451096, 0);
    // var heading = Cesium.Math.toRadians(90);
    // var pitch =  0
    // var roll =  0
    // console.log(heading, pitch, roll);
    // var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, new Cesium.HeadingPitchRoll(heading, pitch, roll));
    // var entity = viewer.entities.add({
    //     position : position,
    //     model : {
    //         uri : '3D-Models/Bahnhofsplatz_16-18.gltf'
    //     },
    //     orientation: orientation
    // });
    var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(7.2169987,51.5451096, 0));
    console.log(modelMatrix);
    const model = scene.primitives.add(Cesium.Model.fromGltf({
        url : '3D-Models/Bahnhofsplatz_16-18.gltf',
        modelMatrix : modelMatrix,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        scene: scene,
        globe: globe
      }));
      
      model.readyPromise.then(function(model) {
        // Play all animations when the model is ready to render
        model.activeAnimations.addAll();
      });


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
        layerDiv.classList.add("menu-content-wrapper")
        
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
            opacitySlider.classList.add("baseLayerOpacitySlider")
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
            opacitySlider.dispatchEvent(new Event("input"))
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
    
            if(layer && slider.dataset.layerName === layer.name) {
                wrapper.classList.remove("opacitySliderWrapperDisabled");
                slider.removeAttribute("disabled");
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


function createNewColorPicker(wrapper, defaultColor) {
    return new Pickr({
        el: wrapper,
        default: defaultColor,
        theme: 'classic',
        lockOpacity: true,
    
        swatches: [
          'rgba(244, 67, 54, 1)',
          'rgba(233, 30, 99, 0.95)',
          'rgba(156, 39, 176, 0.9)',
          'rgba(103, 58, 183, 0.85)',
          'rgba(63, 81, 181, 0.8)',
          'rgba(33, 150, 243, 0.75)',
          'rgba(3, 169, 244, 0.7)',
          'rgba(0, 188, 212, 0.7)',
          'rgba(0, 150, 136, 0.75)',
          'rgba(76, 175, 80, 0.8)',
          'rgba(139, 195, 74, 0.85)',
          'rgba(205, 220, 57, 0.9)',
          'rgba(255, 235, 59, 0.95)',
          'rgba(255, 193, 7, 1)'
        ],
    
        components: {
          preview: true,
          opacity: true,
          hue: true,
    
          interaction: {
            hex: true,
            rgba: true,
            hsva: true,
            input: true,
            clear: true,
            save: true
          }
        }
    });
}

// color is in format: [r(0-255), g(0-255),b(0-255), a(0-1)]
function convertColorPickerResultToCesiumColor(color) {
    var newColor =  {
        red: 0,
        green: 0,
        blue: 0,
        alpha: 1
    }

    var colorPickerResultRGBA = color.toRGBA();
    newColor.red = colorPickerResultRGBA[0] / 256;
    newColor.green = colorPickerResultRGBA[1] / 256;
    newColor.blue = colorPickerResultRGBA[2] / 256;
    newColor.alpha = colorPickerResultRGBA[3];

    return newColor;
}


// works with hex colors for now
function convertColorToCesiumColor(color) {
    var newColor =  {
        red: 0,
        green: 0,
        blue: 0,
        alpha: 1
    }

    var rgb = hexToRgb(color);
    newColor.red = rgb.r / 256;
    newColor.green = rgb.g / 256;
    newColor.blue = rgb.b / 256;
    
    return newColor;
}

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }