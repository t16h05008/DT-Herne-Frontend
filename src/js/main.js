'use strict';

import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";
import "../css/main.css"
import * as Util from "./util.mjs";

// dependencies could also be added like this, but they are added in the index file
// import "bootstrap/dist/css/bootstrap.css"
// import "bootstrap/dist/js/bootstrap.bundle"

// GLOBAL VARIABLES / SETTINGS
Cesium.Ion.defaultAccessToken = process.env.CESIUM_ION_ACCESS_TOKEN;
const initialCameraView = {
  position: {
    lat: 51.54005,
    lon: 7.22795,
    height: 120 // meter TODO set back to 240 
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
const defaultGlobeColor = "#1e8fc3"; // water blue
const defaultUndergroundColor = "#383F38"; // dark gray
let viewer, camera, scene, globe;
const tilingManager = new Worker(new URL("./webworkers/tilesManagerWebworker.js", import.meta.url));
//let gltfModelStoreDB;
let buildingTilesInfo;
const backendBaseUri = "http://localhost:8000/";



document.addEventListener("DOMContentLoaded", function(event) {
    initializeViewer(initialCameraViewFormatted);
    createCustomOverlayComponents();
    setHomeLocation(initialCameraViewFormatted);
    initializeSidebar();
    //initializeIndexedDB();
    initializeTilingManager();
    importBuildings();
});

/**
 * Initializes the cesium viewer and sets the camera view
 * @param {*} initialCameraViewFormatted 
 */
function initializeViewer(initialCameraViewFormatted) {
    // Select Open­Street­Map layer on startup for reduced quota usage during development
    let defaultImageryViewModels = Cesium.createDefaultImageryProviderViewModels();
    let defaultTerrainViewModels = Cesium.createDefaultTerrainProviderViewModels();
    let layerName = "Open­Street­Map";
    let filtered = defaultImageryViewModels.filter( viewModel => {
        return viewModel.name === layerName;
    });
    let imageryToSelect = filtered.length === 1 ? filtered[0] : undefined;
    if(imageryToSelect === undefined) throw new Error("Layer '" + layerName + "' could not be found.");
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
    camera = viewer.camera;
    scene = viewer.scene;
    globe = scene.globe;

    // Decrease the distance the camera has to change before the "changed" event is fired.
    camera.percentageChanged = 0.1; 
    camera.setView(initialCameraViewFormatted); 
    changeBaseLayer("terrain", viewer.baseLayerPicker.viewModel.terrainProviderViewModels[0]) // select WGS84 ellipsoid for testing
    viewer.baseLayerPicker.destroy(); // No longer needed, we manage base layers in the sidebar based on the stored references
}

/**
 * creates and adds custom overlays to the viewer
 */
function createCustomOverlayComponents() {
    // Initialize camera position overlay
    // Gets called multiple times during camera movement
    camera.changed.addEventListener(function() { 
        // We round to one decimal place since we don't need to show it that accurate.
        let newHeadingDeg = Util.round(Cesium.Math.toDegrees(camera.heading), 1);
        let newPitchDeg = Util.round(Cesium.Math.toDegrees(camera.roll), 1);
        let newRollDeg = Util.round(Cesium.Math.toDegrees(camera.roll), 1);
        let coordOverlayLat = document.getElementById("coordOverlayLat")
        let coordOverlayLon = document.getElementById("coordOverlayLon")
        let coordOverlayHeight = document.getElementById("coordOverlayHeight")
        let coordOverlayHeading = document.getElementById("coordOverlayHeading")
        let coordOverlayPitch = document.getElementById("coordOverlayPitch")
        let coordOverlayRoll = document.getElementById("coordOverlayRoll")
        
        // Transform coords to radiants, then to degree (lon lat)
        let posCarto = camera.positionCartographic;
        coordOverlayLat.innerHTML = Util.round(Cesium.Math.toDegrees(posCarto.latitude), 5)
        coordOverlayLon.innerHTML =  Util.round(Cesium.Math.toDegrees(posCarto.longitude), 5);
        coordOverlayHeight.innerHTML = Math.round(posCarto.height); // +- 1 meter should be accurate enough
        // Orientation
        coordOverlayHeading.innerHTML = newHeadingDeg;
        coordOverlayPitch.innerHTML = newPitchDeg == 360 ? 0 : newPitchDeg;
        coordOverlayRoll.innerHTML = newRollDeg == 360 ? 0 : newRollDeg;
    });

    // Rotate north arrow img according to heading
    camera.changed.addEventListener(function() {
        let northArrowImg = document.querySelector("#north-arrow-overlay")
        let newHeadingDeg = Util.round(Cesium.Math.toDegrees(camera.heading), 5);
        northArrowImg.style.transform = "rotate(" + (newHeadingDeg * -1) + "deg)";
    });

    camera.changed.raiseEvent(); // trigger 'changed' event programmatically to call the listeners initially

    // Add overlay to control the camera with sliders
    let cesiumToolbar = document.querySelector(".cesium-viewer-toolbar"); // There should only be one toolbar
    let cameraControlBtn = document.createElement("button");
    let icon = document.createElement("i");
    let cameraControlHeadingSlider = document.querySelector("#cameraControlHeadingSlider");
    let cameraControlHeadingInput = document.querySelector("#cameraControlHeadingInput");
    let cameraControlPitchSlider = document.querySelector("#cameraControlPitchSlider");
    let cameraControlPitchInput = document.querySelector("#cameraControlPitchInput");
    let cameraControlRollSlider = document.querySelector("#cameraControlRollSlider");
    let cameraControlRollInput = document.querySelector("#cameraControlRollInput");
    let cameraControlHeightSlider = document.querySelector("#cameraControlHeightSlider");
    let cameraControlHeightInput = document.querySelector("#cameraControlHeightInput");

    cesiumToolbar.insertBefore(cameraControlBtn, cesiumToolbar.firstChild);
    cameraControlBtn.classList.add("cesium-button", "cesium-toolbar-button");
    icon.classList.add("fa-solid", "fa-lg", "fa-camera");
    cameraControlBtn.appendChild(icon);

    cameraControlBtn.addEventListener("click", function(event) {
        // Show or hide camera control overlay
        let cameraControlOverlay = document.querySelector("#cameraControlOverlay");
        let isVisible = (cameraControlOverlay.style.visibility === "visible");
        if(isVisible) {
            cameraControlOverlay.style.visibility = "hidden";
        } else {
            camera.changed.raiseEvent(); // trigger 'changed' event programmatically to update controls
            cameraControlOverlay.style.visibility = "visible";
        }
    });
    // Add listeners to sliders and text inputs
    cameraControlHeadingSlider.addEventListener("value-changing", function(event) {
        let value = event.target.value
        value = value * 3.6; // slider is bugged if we set a max value other than 100 :(
        camera.setView({
            orientation: {
                heading : Cesium.Math.toRadians(value),
                pitch: camera.pitch,
                roll: camera.roll
            }
        });
    });
    cameraControlHeadingInput.addEventListener("change", function(event) {
        let value = event.target.value;
        camera.setView({
            orientation: {
                heading : Cesium.Math.toRadians(value),
                pitch: camera.pitch,
                roll: camera.roll
            }
        });
    });
    cameraControlPitchSlider.addEventListener("input", function(event) {
        let value = event.target.value;
        value *= -1 // invert
        camera.setView({
            orientation: {
                Heading : camera.heading,
                pitch: Cesium.Math.toRadians(value),
                roll: camera.roll
            }
        });
    });
    cameraControlPitchInput.addEventListener("change", function(event) {
        let value = event.target.value;
        value *= -1 // invert
        camera.setView({
            orientation: {
                Heading : camera.heading,
                pitch: Cesium.Math.toRadians(value),
                roll: camera.roll
            }
        });
    });
    cameraControlHeightSlider.addEventListener("input", function(event) {
        let value = event.target.value;
        value *= -1 // invert
        let posCarto = camera.positionCartographic;
        let lon = Util.round(Cesium.Math.toDegrees(posCarto.longitude), 5);
        let lat = Util.round(Cesium.Math.toDegrees(posCarto.latitude), 5);
        camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, value),
            orientation: { heading: camera.heading, pitch: camera.pitch, roll: camera.roll }
        });
    });
    cameraControlHeightInput.addEventListener("change", function(event) {
        let value = parseInt(event.target.value);
        let posCarto = camera.positionCartographic;
        let lon = Util.round(Cesium.Math.toDegrees(posCarto.longitude), 5);
        let lat = Util.round(Cesium.Math.toDegrees(posCarto.latitude), 5);
        camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, value),
            orientation: { heading: camera.heading, pitch: camera.pitch, roll: camera.roll }
        });
    });
    cameraControlRollSlider.addEventListener("input", function(event) {
        let value = event.target.value;
        camera.setView({
            orientation: {
                Heading : camera.heading,
                pitch: camera.pitch,
                roll: Cesium.Math.toRadians(value)
            }
        });
        // For some reason the camera.changed event is only fired once.
        // This might be a bug in Cesium, since there were some bugs related to this in the past.
        // Fire event manually to update text input.
        camera.changed.raiseEvent();
    });
    cameraControlRollInput.addEventListener("change", function(event) {
        let value = event.target.value;
        camera.setView({
            orientation: {
                Heading : camera.heading,
                pitch: camera.pitch,
                roll: Cesium.Math.toRadians(value)
            }
        });
        // Fire event manually to update slider (same reason as above)
        camera.changed.raiseEvent();
    });
    
    // Update controls on camera change
    camera.changed.addEventListener(function() {
        let heading = Math.round(Cesium.Math.toDegrees(camera.heading));
        let pitch = Math.round(Cesium.Math.toDegrees(camera.pitch));
        let roll = Math.round(Cesium.Math.toDegrees(camera.roll));
        roll = (270 <= roll && roll <= 360) ? roll -= 360 : roll; // map to slider interval is needed
        let height = Math.round(camera.positionCartographic.height);
        // update sliders
        // TODO Make sure the sliders stay in their defined intervals, especially the height slider.
        cameraControlHeadingSlider.value = heading / 3.6;
        cameraControlPitchSlider.value = pitch * -1;
        cameraControlHeightSlider.value = height * -1;
        cameraControlRollSlider.value = roll;
        // update text inputs
        cameraControlHeadingInput.value = heading;
        cameraControlPitchInput.value = pitch * -1;
        cameraControlHeightInput.value = height;
        cameraControlRollInput.value = roll;
    });
}

/**
 * Overwrites the functionality of the viewer's 'home' button.
 */
function setHomeLocation(initialCameraViewFormatted) {
    // zoom to our custom initial position instead of the cesium default one, which is in space
    viewer.homeButton.viewModel.command.beforeExecute.addEventListener( function(e) {
        e.cancel = true;
        viewer.scene.camera.flyTo(initialCameraViewFormatted);
    });
}

/**
 * Sets up everything related to the sidebar it's menus.
 */
function initializeSidebar() {
    let sidebarBtns = document.querySelectorAll(".sidebarBtn");
    
    addSidebarButtonHighlighting(sidebarBtns);
    populateBaseLayers('imagery');
    populateBaseLayers('terrain');

    // globe settings
    let settingsGlobeColor = document.getElementById("settingsGlobeColor");
    const globeColorPicker = createNewColorPicker(settingsGlobeColor, defaultGlobeColor);
    globeColorPicker.on("save", (color, instance) => {
        if(!color) { return }
        const newColor = convertColorPickerResultToCesiumColor(color);
        globe.baseColor  = newColor;
    });
    globe.baseColor = Util.convertColorToCesiumColor(defaultGlobeColor);

    let settingsGlobeTransparencySlider = document.getElementById("settingsGlobeTransparencySlider");
    settingsGlobeTransparencySlider.addEventListener("input", function(event) {
        let value = event.target.value;
        if(value < 100) {
            globe.translucency.enabled = true;
            globe.translucency.frontFaceAlpha = value / 100;
            globe.translucency.backFaceAlpha = value / 100;
        } else {
            globe.translucency.enabled = false;
        }
    });
   
    // underground settings
    let settingsUndergroundCameraSwitch = document.getElementById("settingsUndergroundCameraSwitch");
    scene.screenSpaceCameraController.enableCollisionDetection = !settingsUndergroundCameraSwitch.checked;
    settingsUndergroundCameraSwitch.addEventListener("change", function(event) {
        let chb = event.target;
        // allow camera to move underground
        scene.screenSpaceCameraController.enableCollisionDetection = !(chb.checked); 
    });
    

    let settingsUndergroundColor = document.getElementById("settingsUndergroundColor");
    const undergroundColorPicker = createNewColorPicker(settingsUndergroundColor, defaultUndergroundColor);
    undergroundColorPicker.on("save", (color, instance) => {
        if(!color) { return }
        const newColor = convertColorPickerResultToCesiumColor(color);
        globe.undergroundColor  = newColor;
    });
    globe.undergroundColor = Util.convertColorToCesiumColor(defaultUndergroundColor);

    let settingsUndergroundTransparencySlider = document.getElementById("settingsUndergroundTransparencySlider");
    settingsUndergroundTransparencySlider.addEventListener("input", function(event) {
        let value = event.target.value;
        globe.undergroundColor.alpha = value / 100;
    });
    globe.undergroundColor.alpha = settingsUndergroundTransparencySlider.value / 100;
}

/**
 * Adds highlighting color to the sidebar buttons to indicate which menu is open.
 * @param {*} sidebarBtns 
 */
function addSidebarButtonHighlighting(sidebarBtns) {
    for(let btn of sidebarBtns) {

        let menuId = btn.dataset.bsTarget;
        let menu = document.querySelector(menuId);
        let closeBtn = menu.querySelector(".btn-close"); // only one close btn exists

        // Listeners for toggling the menu
        // On menu opened
        menu.addEventListener('show.bs.offcanvas', function () {
            let menuWidth = getComputedStyle(document.documentElement,null).getPropertyValue('--menu-width');
            // Move the scene to the right when menu opens
            // No need to add the sidebar width since it is not in this div
            document.getElementById("cesiumContainer").style.marginLeft = menuWidth;
        });
        
        // On menu closed
        menu.addEventListener('hide.bs.offcanvas', function () {
            // Move scene back to the left edge
            document.getElementById("cesiumContainer").style.marginLeft = "0";
            
        });

        // Remove highlight color from all sidebar buttons
        closeBtn.addEventListener("click", function() {
            for(let btn of sidebarBtns) {
                btn.style.color = "white";
            }
        });

        // Set sidebar button highlight color on click
        btn.addEventListener('click', function(event) {
            // Get the menu of the clicked button
            let clickedBtn = event.target;
            let clickedBtnMenuId = clickedBtn.dataset.bsTarget;
            let clickedBtnMenu = document.querySelector(clickedBtnMenuId);

            // Iterate buttons and remove highlight color
            for(let btn of sidebarBtns) {
                btn.style.color = "white";
            }

            // For the clicked button: check if menu is visible and set color based on that
            if(clickedBtnMenu.classList.contains("show")) {
                let highlightColor = getComputedStyle(document.documentElement,null).getPropertyValue('--sidebar-btn-highlight-color');
                clickedBtn.style.setProperty("color", highlightColor, "important")
            }
        });
    }
}

function importData() {
    // add osm buildings to scene
    // const buildingsTileset = viewer.scene.primitives.add(Cesium.createOsmBuildings());
}

/**
 * Creates an sidebar-entry for each base layer.
 * Can be used for imagery and terrain. 
 * @param {string} type, either "imagery" or "terrain"
 */
function populateBaseLayers(type) {
    let baseLayersImageryContainer = document.querySelector("#base-layers-imagery .accordion-body");
    let baseLayersTerrainContainer = document.querySelector("#base-layers-terrain .accordion-body");
    let bLayerPickerViewModel = viewer.baseLayerPicker.viewModel;
    let viewModel;
    let layerContainerDom;

    if(type !== "imagery" && type !== "terrain")
        throw new Error("Parameter 'type' was neither 'imagery' nor 'terrain'");
    
    if(type === "imagery") {
        viewModel = bLayerPickerViewModel.imageryProviderViewModels;
        layerContainerDom = baseLayersImageryContainer;
    }

    if(type === "terrain") {
        viewModel = bLayerPickerViewModel.terrainProviderViewModels;
        layerContainerDom = baseLayersTerrainContainer;
    }

    for(const layer of viewModel) {
        let layerDiv = document.createElement("div");
        layerDiv.classList.add("menu-base-layer-entry", "menu-content-wrapper");
        
        let radioBtn = document.createElement("input");
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
            changeBaseLayer(type, layer);
        });

        layerDiv.appendChild(radioBtn)

        let thumb = new Image(64, 64);
        thumb.src = layer.iconUrl;
        thumb.alt = "Layer Vorschaubild";
        thumb.style.borderRadius = "10%";
        layerDiv.appendChild(thumb);

        if(type === "imagery") {
            let innerDiv = document.createElement("div");

            let span = document.createElement("span");
            span.style.display = "block";
            span.style.width = "100%";
            span.style.marginTop = "10px";
            span.innerHTML = layer.name;
            innerDiv.appendChild(span);
            // TODO opacity sliders are not really needed for base layers since they don't influence the globe opacity
            let opacitySlider = document.createElement("range-slider");
            opacitySlider.value = 100;
            opacitySlider.classList.add("opacitySlider", "baseLayerOpacitySlider")
            if( !radioBtn.checked ) opacitySlider.disabled = true; // only visually disabled
            opacitySlider.dataset.layerName = layer.name;
            opacitySlider.addEventListener("input", function(event) {
                let value = event.target.value;
                for(let i=0; i<viewer.imageryLayers.length;i++) {
                    let layer = viewer.imageryLayers.get(i);
                    if(layer.isBaseLayer) {
                        layer.alpha = value / 100;
                    }
                }
            });
            opacitySlider.dispatchEvent(new Event("input"))
            // The easiest method to disable the slider is to wrap it inside a div and disable pointer events on that.
            let opacitySliderWrapper = document.createElement("div");
            opacitySliderWrapper.classList.add("opacitySliderWrapper");
            if( !radioBtn.checked ) {
                opacitySliderWrapper.classList.add("opacitySliderWrapperDisabled")
            }
            
            opacitySliderWrapper.appendChild(opacitySlider)
            innerDiv.appendChild(opacitySliderWrapper)
    
            layerDiv.appendChild(innerDiv)
        } else {
            // No opacity slider needed for terrain
            let span = document.createElement("span");
            span.innerHTML = layer.name;
            layerDiv.appendChild(span);
        }

        let infoBtn = document.createElement("i");
        infoBtn.classList.add("fa-solid", "fa-lg", "fa-circle-info");
        infoBtn.style.marginLeft = "auto";
        infoBtn.dataset.bsToggle = "tooltip";
        infoBtn.dataset.bsPlacement = "bottom";
        infoBtn.title = layer.tooltip;
        layerDiv.appendChild(infoBtn)

        layerContainerDom.appendChild(layerDiv);

        // Add a spacer below
        let spacer = document.createElement("hr");
        spacer.classList.add("layerSpacer");
        layerContainerDom.appendChild(spacer);
    }

    // TODO only for imagery for now. Terrain leads to an error.
    if(type === "imagery") {
        // Add option to remove layer as last entry
        let layerDiv = document.createElement("div");
        layerDiv.classList.add("menu-base-layer-entry");
            
        let radioBtn = document.createElement("input");
        radioBtn.classList.add("form-check-input")
        radioBtn.type = "radio";
        radioBtn.name = "radioImagery";
        radioBtn.value = "";
            
        radioBtn.addEventListener("click", function(event) {
            changeBaseLayer(type, undefined);
        });
        
        layerDiv.appendChild(radioBtn)
        
        // Create the preview as a canvas so we don't have to load an image
        let canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        canvas.style.display = "block";
        canvas.style.borderRadius = "6px";
        let ctx = canvas.getContext("2d");
        ctx.strokeStyle = 'red';
        ctx.moveTo(0,0);
        ctx.lineTo(64,64);
        ctx.moveTo(64,0);
        ctx.lineTo(0,64);
        ctx.stroke();
        layerDiv.appendChild(canvas);
        
        let span = document.createElement("span");
        span.innerHTML = "Kein Layer";
        layerDiv.appendChild(span);
        
        layerContainerDom.appendChild(layerDiv);
    }
}


/**
 * Changes base imagery or terrain
 */
function changeBaseLayer(type, layer) {
    // Disable all opacity sliders except the one of the clicked layer
    // If terrain layer was clicked do nothing
    let sliderValue = 100;
    let bLayerPickerViewModel = viewer.baseLayerPicker.viewModel;

    if(type == "imagery") {
        let opacitySliderWrappers = document.querySelectorAll("#base-layers-imagery .opacitySliderWrapper")

        for(let wrapper of opacitySliderWrappers) {
            let slider = wrapper.querySelector("range-slider");
    
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

    // Change layer
    try {
        if(type === "terrain") {
            bLayerPickerViewModel.selectedTerrain = layer;
        }
        if(type === "imagery") {
            bLayerPickerViewModel.selectedImagery = layer;
            // Set opacity according to slider
            for(let i=0; i<viewer.imageryLayers.length;i++) {
                let layer = viewer.imageryLayers.get(i);
                if(layer.isBaseLayer) {
                    layer.alpha = sliderValue / 100;
                }
            };
        }
    } catch (e) {
        console.error("Something went wrong while changing base layers.")
        console.error(e); 
    }
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
    let newColor =  {
        red: 0,
        green: 0,
        blue: 0,
        alpha: 1
    }

    let colorPickerResultRGBA = color.toRGBA();
    newColor.red = colorPickerResultRGBA[0] / 256;
    newColor.green = colorPickerResultRGBA[1] / 256;
    newColor.blue = colorPickerResultRGBA[2] / 256;
    newColor.alpha = colorPickerResultRGBA[3];

    return newColor;
}


function importBuildings() {
    // moveEnd should be frequently enough but we can use "changed", too.
    // However, that will spawn and terminate a lot more web workers, so there might be overhead.
    camera.moveEnd.addEventListener(function() {
        // get visible area
        // has properties east, north, south, west in radiants
        let viewRect = camera.computeViewRectangle();
        let viewRectDeg = {
            east: Cesium.Math.toDegrees(viewRect.east),
            west: Cesium.Math.toDegrees(viewRect.west),
            north:  Cesium.Math.toDegrees(viewRect.north),
            south:  Cesium.Math.toDegrees(viewRect.south)
        }
    
        if(viewRect) {
            tilingManager.postMessage({
                event: "povUpdated",
                viewRect: viewRectDeg,
                //loadedEntities: viewer.entities.values // TODO process in webworker
            });
        } 
    });
    camera.moveEnd.raiseEvent();
}

function initializeIndexedDB() {
    
    if (!window.indexedDB) {
        console.log("Your browser doesn't support a stable version of IndexedDB. Caching 3D-Models will not be available, resulting in longer loading times.");
        return;
    } else {
        // TODO for testing only

        var dbDeletionRequest = indexedDB.deleteDatabase("gltfModelStoreDB");
        dbDeletionRequest.onsuccess = function () {
            console.log("Deleted database successfully");

            // create new db
            var dbCreationRequest = window.indexedDB.open("gltfModelStoreDB", 1);
            dbCreationRequest.onerror = event => {
                console.error("Error while opening 'gltfModelStoreDB': " + event.target.errorCode);
            };
            dbCreationRequest.onsuccess = event => {
                gltfModelStoreDB = event.target.result;

                // add a generic error handler for all kinds of errors
                gltfModelStoreDB.onerror = event => {
                    console.error("IndexedDB error: " + event.target.errorCode);
                }
            };

            // This should be called only once (and not every time the user opens the application)
            // This is called when the version number of the database is updated due to changes in the schema.
            dbCreationRequest.onupgradeneeded = event => {
                gltfModelStoreDB = event.target.result;
                var objectStore = gltfModelStoreDB.createObjectStore("gltfModels", { 
                    keyPath: "id" // this is the "primary key"
                });
  
                objectStore.createIndex("id", "id", { unique: true });
                console.log("database object store created");
            };

        };

        dbDeletionRequest.onerror = function () {
            console.log("Couldn't delete database");
        };
        dbDeletionRequest.onblocked = function () {
            console.log("Couldn't delete database due to the operation being blocked");
        };

    }
}

function initializeTilingManager() {
    //let cacheSize = document.getElementById("settings-cache-size").value;
    // get tilesInfo from server
    console.log("getting tiles");
    fetch(backendBaseUri + "3d-models/buildings/tilesInfo")
        .then(response => response.json())
        .then(data => {
            console.log("got tiles info");
            buildingTilesInfo = data;
            console.log(buildingTilesInfo);
            tilingManager.postMessage({
                event: "start",
                //cacheSize: cacheSize,
                tiles: buildingTilesInfo
            });

            tilingManager.onmessage = function(event) {
                onTillingManagerMessageReceived(event);
            }
        });
}

function onTillingManagerMessageReceived(event) {
    console.log("number of entities to show", event.data.length);
    // The code below could be done in the webworker if needed.
    // The entities have different formats, but both have an id property that can be used for comparison
    let entitiesToShow = event.data; 
    let currentEntities = viewer.entities.values;
    let entitiesToShowIds = entitiesToShow.map( entity => entity.id );
    let currentEntitiesIds = currentEntities.map( entity => entity.id );

    // get all entities that should be loaded
    let entitiesToLoad =  entitiesToShow.filter( (entity) => {
        return !currentEntitiesIds.includes(entity.id);
    });

    // and the ones to unload
    let entitiesToUnload = currentEntities.filter( (entity) => {
        return !entitiesToShowIds.includes(entity.id);
    });

    // unload
    for(let entity of entitiesToUnload) {
        viewer.entities.remove(entity);
    }

    // load
    for(let entity of entitiesToLoad) {
        let lon = parseFloat(entity.location.lon);
        let lat = parseFloat(entity.location.lat);
        let altitude = parseFloat(entity.location.height);

        let position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
        let heading = Cesium.Math.toRadians(parseFloat(entity.orientation.heading)); 
        let pitch =  0
        let roll =  0
        let orientation = Cesium.Transforms.headingPitchRollQuaternion(position, new Cesium.HeadingPitchRoll(heading, pitch, roll));
        
        let newEntity = new Cesium.Entity({
            id: entity.id,
            position: position,
            orientation: orientation
            // model reference gets added later
        });


        let url = backendBaseUri + "3d-models/buildings/" + newEntity.id
        newEntity.model = new Cesium.ModelGraphics({
            uri: url
        });
        // Add a property with the current timestamp so we can implement FIFO
        newEntity.addProperty("addedToViewerTimestamp");
        newEntity.addedToViewerTimestamp = Date.now();
        viewer.entities.add(newEntity);

        // Code below is for caching the model.
        // It doesn't work since cesium doesn't have a way to create a model directly form the data instead of an url
        //
        // check if an entity with this id is already cached from a previous load
        // if(gltfModelStoreDB) {
        //     var transaction = gltfModelStoreDB.transaction(["gltfModels"]);
        //     var objectStore = transaction.objectStore("gltfModels");
        //     var getRequest = objectStore.get(newEntity.id);
        //     console.log(getRequest);
        //     getRequest.onsuccess = event => {
        //         if(getRequest.result) {
        //             // If found load model from cache
        //             console.log("FOUND IN DATABASE");
        //             console.log("typeof(getRequest.result.model): ", typeof(getRequest.result.model))
        //             console.log("getRequest.result.model: ", getRequest.result.model)
        //             newEntity.model = getRequest.result.model;
        //             viewer.entities.add(newEntity);
        //         } else {
        //             // If not get it from server and cache it
        //             // We can directly set the result as uri
        //             console.log("NOT FOUND IN DATABASE");
        //             let url = backendBaseUri + "3d-models/buildings/" + newEntity.id
        //             newEntity.model = new Cesium.ModelGraphics({
        //                 uri: url
        //             });
        //             // Add a property with the current timestamp so we can implement FIFO
        //             newEntity.addProperty("addedToViewerTimestamp");
        //             newEntity.addedToViewerTimestamp = Date.now();
        //             viewer.entities.add(newEntity);

        //             fetch(url)
        //                 .then(response => response.json())
        //                 .then(data => {
        //                     newEntity.addProperty("modelData")
        //                     newEntity.modelData = data;

        //                     var transaction = gltfModelStoreDB.transaction(["gltfModels"], "readwrite");
        //                     var objectStore = transaction.objectStore("gltfModels");
        //                     // TODO remove old entities first if max cache size is reached
        //                     // If max cache size is reached delete the oldest cached model (FIFO)
        //                     objectStore.add(newEntity.modelData); // all entities must have a unique id property here

        //                 });
                    
        //         }
        //     };
        // }
    }
}