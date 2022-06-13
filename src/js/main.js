'use strict';

import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";
import "../css/main.css"
import * as Util from "./util.mjs";
import {layerCategories} from "./layers.mjs";

// dependencies could also be added like this, but they are added in the index file
// import "bootstrap/dist/css/bootstrap.css"
// import "bootstrap/dist/js/bootstrap.bundle"

// GLOBAL VARIABLES / SETTINGS
Cesium.Ion.defaultAccessToken = process.env.CESIUM_ION_ACCESS_TOKEN;
const initialCameraView = {
  position: {
    lat: 51.54241, //51.54005, 
    lon: 7.2246, //7.22795,
    height: 350 // meter
  },
  orientation: {
    heading: 295,
    pitch: -30,
    roll: 0,
  }
}
const defaultGlobeColor = "#1e8fc3"; // water blue
const defaultUndergroundColor = "#383F38"; // dark gray
let viewer, camera, scene, globe;
const dataLoadingManager = new Worker(new URL("./webworkers/dataLoadingManager.js", import.meta.url));
//let gltfModelStoreDB;
const backendBaseUrl = "http://localhost:8000/";
const layersToUpdateOnPovChange = [];
let measurementToolActive = false;
let slicersDrawRectangleActive = false;
let echartsSensorTimelineChart;

// Needed to display data attribution correctly
// https://github.com/markedjs/marked/issues/395
marked.Renderer.prototype.paragraph = (text) => {
    if (text.includes("<a")) {
      return text + "\n";
    }
    return "<p>" + text + "</p>";
};
// Derived from initialCameraView in the format needed by cesium
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

document.addEventListener("DOMContentLoaded", function(event) {
    initializeViewer(initialCameraViewFormatted);
    createCustomOverlayComponents();
    setHomeLocation(initialCameraViewFormatted);
    loadBaseLayers(layerCategories);
    initializeSidebar();
    initializeSensorInfoPanel();
    //initializeIndexedDB();
    initializeDataLoadingManager();
    // Switch terrain to dgm10
    document.querySelector("input[value='dgm1m']").click();
    // document.querySelector("input[value='Cesium World Terrain']").click();
    // load cityModels for development
    // document.querySelector("input[value='cityModel']").click();
    document.querySelector("input[value='precipitation']").click();
});

/**
 * Initializes the cesium viewer and sets the camera view
 * @param {*} initialCameraViewFormatted 
 */
function initializeViewer(initialCameraViewFormatted) {
    // Select Open­Street­Map layer on startup for reduced quota usage during development
    let defaultImageryViewModels = Cesium.createDefaultImageryProviderViewModels();
    let defaultTerrainViewModels = Cesium.createDefaultTerrainProviderViewModels();

    let imageryToLoadName = "Open­Street­Map";
    let terrainToLoadName = "WGS84 Ellipsoid";
    let filtered = defaultImageryViewModels.filter( viewModel => {
        return viewModel.name === imageryToLoadName;
    });
    let imageryToSelect = filtered.length === 1 ? filtered[0] : undefined;
    if(imageryToSelect === undefined) throw new Error("Layer '" + imageryToLoadName + "' could not be found.");

    filtered = defaultTerrainViewModels.filter( viewModel => {
        return viewModel.name === terrainToLoadName;
    });
    let terrainToSelect = filtered.length === 1 ? filtered[0] : undefined;
    if(terrainToSelect === undefined) throw new Error("Terrain '" + terrainToLoadName + "' could not be found.");
    
    // Add to layer list
    function filterRecursively(layerCategories, name, result) {
        layerCategories.forEach(function iter(o) {
            if(o.name === name) result.push(o);
            (o.subCategories || []).forEach(iter);
        });
    };
    let imageryCategory = [];
    let terrainCategory = [];
    filterRecursively(layerCategories, "imagery", imageryCategory);
    filterRecursively(layerCategories, "terrain", terrainCategory);
    imageryCategory = imageryCategory[0];
    terrainCategory = terrainCategory[0];
    for(let layer of defaultImageryViewModels) {
        imageryCategory.layers.push({
            name: layer.name,
            displayName:  layer.name,
            thumbnailSrc: layer.iconUrl,
            show: (layer.name === imageryToSelect.name),
            opacity: 100,
            tooltip: layer.tooltip,
        })
    }
    for(let layer of defaultTerrainViewModels) {
        terrainCategory.layers.push({
            name: layer.name,
            displayName:  layer.name,
            thumbnailSrc: layer.iconUrl,
            show: (layer.name === terrainToSelect.name),
            opacity: 100,
            tooltip: layer.tooltip,
        })
    }

    generateUuids(layerCategories);
    addReferenceProp(layerCategories);

    // initialize cesium viewer
    viewer = new Cesium.Viewer('cesiumContainer', {
        // has to be provided for some reason, even though the layers are the same
        imageryProviderViewModels: defaultImageryViewModels, 
        terrainProviderViewModels: defaultTerrainViewModels,
        baseLayerPicker: true,
        selectedImageryProviderViewModel: imageryToSelect,
        selectedTerrainProviderViewModel: terrainToSelect,
        geocoder: false,
        fullscreenButton: false,
        sceneModePicker: false,
        animation: false,
        timeline: false
    });
    //viewer.extend(Cesium.viewerCesiumInspectorMixin);
    //viewer.extend(Cesium.viewerCesium3DTilesInspectorMixin);
    camera = viewer.camera;
    scene = viewer.scene;
    globe = scene.globe;

    // Decrease the distance the camera has to change before the "changed" event is fired.
    camera.percentageChanged = 0.1; 
    camera.setView(initialCameraViewFormatted); 
    // changeBaseLayer() // select WGS84 ellipsoid for testing
    viewer.baseLayerPicker.destroy(); // No longer needed, we manage base layers in the sidebar based on the stored references

    document.querySelector(".cesium-credit-expand-link").textContent = "Copyright Datenquellen";
    document.querySelector(".cesium-credit-lightbox-title").textContent = "";

    viewer.selectedEntityChanged.addEventListener(handleSelectedEntityChanged);
}

/**
 * creates and adds custom overlays to the viewer
 */
function createCustomOverlayComponents() {
    let viewerElement = document.querySelector("#cesiumContainer .cesium-viewer")
    let coordOverlay = document.getElementById("coordOverlay");
    let sensorListOverlay = document.getElementById("sensorListOverlay");
    let northArrowOverlay = document.getElementById("northArrowOverlay");
    viewerElement.appendChild(coordOverlay);
    viewerElement.appendChild(sensorListOverlay);
    viewerElement.appendChild(northArrowOverlay);

    // Initialize camera position overlay
    // Gets called multiple times during camera movement
    camera.changed.addEventListener(() => { 
        // We round to one decimal place since we don't need to show it that accurate.
        let newHeadingDeg = Util.round(Cesium.Math.toDegrees(camera.heading), 1);
        let newPitchDeg = Util.round(Cesium.Math.toDegrees(camera.pitch), 1);
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
    camera.changed.addEventListener(() => {
        let northArrowImg = document.querySelector("#northArrowOverlay")
        let newHeadingDeg = Util.round(Cesium.Math.toDegrees(camera.heading), 5);
        northArrowImg.style.transform = "rotate(" + (newHeadingDeg * -1) + "deg)";
    });

    camera.changed.raiseEvent(); // trigger 'changed' event programmatically to call the listeners initially

    addCameraControlOverlay();
}

 // Add overlay to control the camera with sliders
function addCameraControlOverlay() {
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
        camera.flyTo(initialCameraViewFormatted);
    });
}

/**
 * Sets up everything related to the sidebar it's menus.
 */
function initializeSidebar() {
    let sidebarBtns = document.querySelectorAll(".sidebarBtn");
    
    addSidebarButtonHighlighting(sidebarBtns);
    enableMenuToggle(sidebarBtns);
    enableMenuResize(sidebarBtns);
    createMenuLayerTree(layerCategories);


    // measurements
    for(let type of ["line", "polygon"]) {
        let btn = document.getElementById("measurements-draw-" + type + "-btn");
        btn.addEventListener("click", function(e) {
            let btn = e.target;
            if(!measurementToolActive) {
                btn.classList.remove("btn-secondary");
                btn.classList.add("btn-info");
                toggleMeasurementInfoVisibility(type);
            }
            startMeasurement(type);
        });
    }

    // slicers
    let slicersDrawRectangleBtn = document.getElementById("slicers-draw-rectangle-btn");
    slicersDrawRectangleBtn.addEventListener("click", function(e) {
        if(slicersDrawRectangleActive) {
            let entitiesToRemove = viewer.entities.values.filter( entity => entity.name.includes("slicers") );
            for(let entity of entitiesToRemove) {
                viewer.entities.remove(entity);
            }
        }
        slicersDrawRectangleActive = true;
        e.target.classList.remove("btn-secondary");
        e.target.classList.add("btn-info");
        drawSlicerRectangle();
    });

    // globe settings
    let settingsGlobeColor = document.getElementById("settingsGlobeColor");
    const globeColorPicker = createNewColorPicker(settingsGlobeColor, defaultGlobeColor);
    globeColorPicker.on("save", (color, instance) => {
        if(!color) { return }
        const newColor = convertColorPickerResultToCesiumColor(color);
        globe.baseColor  = newColor;
    });
    globe.baseColor = Cesium.Color.fromCssColorString(defaultGlobeColor);

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
    globe.undergroundColor = Cesium.Color.fromCssColorString(defaultUndergroundColor);

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


function enableMenuToggle(sidebarBtns) {
    let cesiumContainer = document.getElementById("cesiumContainer");
    let sensorInfoPanel = document.getElementById("sensorInfoPanel");
    for(let btn of sidebarBtns) {
        let menuId = btn.dataset.bsTarget;
        let menu = document.querySelector(menuId);
        // Listeners for toggling the menu
        // On menu opened
        menu.addEventListener('show.bs.offcanvas', function () {
            let menuWidth = getComputedStyle(document.documentElement).getPropertyValue('--menu-width');
            // Move the scene to the right when menu opens
            // No need to add the sidebar width since it is not in this div
            cesiumContainer.style.marginLeft = menuWidth;
            sensorInfoPanel.style.marginLeft = menuWidth;
            //sensorInfoPanel.style.width = "calc(100% - " + menuWidth + ")";
            let sensorInfoPanelWidth = window.getComputedStyle(sensorInfoPanel).width;
            let newSensorInfoPanelWidth = parseFloat(sensorInfoPanelWidth) - parseFloat(menuWidth);
            sensorInfoPanel.style.width = newSensorInfoPanelWidth;
            if(echartsSensorTimelineChart) {
                echartsSensorTimelineChart.resize({
                    width: 2/3 * newSensorInfoPanelWidth, //2/3 * sensorInfoPanel.style.width, // 2/3 because we have the chart in col-8
                    height: 200,
                    // animation: {
                    //     duration: 300,
                    //     easing: 
                });
            }
            
            // Add pointer events to resize div
            let handle = menu.querySelector(".menu-resize-handle");
            handle.style.pointerEvents = "auto";
            handle.style.setProperty("cursor", "ew-resize");
        });

        // On menu closed
        menu.addEventListener('hide.bs.offcanvas', function () {
            // Move scene back to the left edge
            cesiumContainer.style.marginLeft = "0";
            sensorInfoPanel.style.marginLeft = "0";
            sensorInfoPanel.style.width = "100%";

            // Remove pointer events from resize div
            let handle = menu.querySelector(".menu-resize-handle");
            handle.style.pointerEvents = "none";
            handle.style.setProperty("cursor", "default");
        });
    }
}


function enableMenuResize(sidebarBtns) {
    let handles = [];
    for(let btn of sidebarBtns) {
        let menuId = btn.dataset.bsTarget;
        let menu = document.querySelector(menuId);
        // Add listener to resize div
        let handle = menu.querySelector(".menu-resize-handle");
        handles.push(handle);
    }
    
    for(let i=0; i<handles.length; i++) {
        handles[i].addEventListener("mousedown", (e) => {
            initDrag(e, handles[i])
        })
    }

    let startX, startWidth;
    let cesiumContainer = document.getElementById("cesiumContainer");
    let sensorInfoPanel = document.getElementById("sensorInfoPanel")
    async function initDrag(e) {
        startX = e.clientX;
        startWidth = window.getComputedStyle(document.documentElement).getPropertyValue('--menu-width');
        startWidth = parseInt(startWidth, 10);
        // Add listeners to body instead of handle to account for fast mouse movements
        document.body.addEventListener('mousemove', doDrag);
        document.body.addEventListener('mouseup', stopDrag);
        cesiumContainer.classList.add("noTransition");
        sensorInfoPanel.classList.add("noTransition");
        document.body.style.setProperty("cursor", "ew-resize", "important");
    }

    async function doDrag(e) {
        let newWidth = (startWidth + e.clientX - startX) + "px"
        document.documentElement.style.setProperty('--menu-width', newWidth);
        // Also resize cesium container
        cesiumContainer.style.marginLeft = newWidth;
        sensorInfoPanel.style.marginLeft = newWidth;
        sensorInfoPanel.style.width = "calc(100% - " + newWidth + ")";
    }

    async function stopDrag() {
        cesiumContainer.classList.remove("noTransition");
        sensorInfoPanel.classList.remove("noTransition");
        document.body.removeEventListener('mousemove', doDrag, false);
        document.body.removeEventListener('mouseup', stopDrag, false);
        document.body.style.setProperty("cursor", "default");
    }
}

function addMenuLayer(category, layer, wrapper) {
    let layerDiv = createMenuLayerHTML(category, layer);
    wrapper.appendChild(layerDiv);
    // Add a spacer below
    let spacer = document.createElement("hr");
    spacer.classList.add("layerSpacer");
    wrapper.appendChild(spacer);
}


function createMenuLayerHTML(category, layer) {

    let layerDiv = document.createElement("div");
    layerDiv.classList.add("menu-layer-entry");
    
    if(category.isBaseLayerCategory) {
        let radioBtn = document.createElement("input");
        layerDiv.appendChild(radioBtn);
        radioBtn.classList.add("form-check-input", "menu-layer-radio-btn")
        radioBtn.type = "radio";
        radioBtn.name = "radio" + category.name.charAt(0).toUpperCase() + category.name.slice(1); // capitalize
        radioBtn.checked = layer.show;
        radioBtn.value = layer.name;
        // Style the inner circle according to menu depth
        // This is done in js so we can use string concatenation and variables for the color
        let color;
        if(category.depth === 1) color = window.getComputedStyle(document.documentElement).getPropertyValue('--primary-ui-color');
        if(category.depth === 2) color = window.getComputedStyle(document.documentElement).getPropertyValue('--secondary-ui-color');
        if(category.depth === 3) color = window.getComputedStyle(document.documentElement).getPropertyValue('--tertiary-ui-color');
        color = color.replace("#", "%23")
        let svg = "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='2' fill='" + color + "'/%3e%3c/svg%3e\")";
        //svg = "#ffff00"
        document.documentElement.style.setProperty("--radio-btn-level-" + category.depth + "-background", svg)
        
        radioBtn.addEventListener("click", function(event) {
            onMenuLayerRadioBtnClicked(category, layer);
        });

    } else {
        let chb = document.createElement("input");
        layerDiv.appendChild(chb);
        chb.classList.add("form-check-input", "menu-layer-chb")
        chb.type = "checkbox";
        chb.value = layer.name;
        chb.checked = layer.show;

        chb.addEventListener("click", function(event) {
            onMenuLayerChbClicked(event, layer);
        });
        
    }
    

    if(layer.thumbnailSrc && layer.thumbnailSrc.length) {
        let thumb = new Image(64, 64);
        // Use layer.iconUrl, else thumb has to be set later
        thumb.src = layer.thumbnailSrc;
        thumb.alt = "Layer Vorschaubild";
        thumb.style.borderRadius = "10%";
        layerDiv.appendChild(thumb);
    }

    if(!category.isBaseLayerCategory) {
        let innerDiv = document.createElement("div");
        let layerNameSpan = document.createElement("span");
        // Move layer name upwards to make room for the slider
        layerNameSpan.style.display = "block";
        layerNameSpan.style.width = "100%";
        layerNameSpan.style.marginTop = "10px";
        layerNameSpan.innerHTML = layer.displayName;
        innerDiv.appendChild(layerNameSpan);
        
        let opacitySlider = document.createElement("range-slider");
        opacitySlider.value = layer.opacity;
        opacitySlider.classList.add("opacitySlider")
        opacitySlider.dataset.layerName = layer.name;
        // "input" for cooler effect but slower performance
        opacitySlider.addEventListener("change", function(event) {
            handleLayerOpacityChange(event.target)
        });
        opacitySlider.dispatchEvent(new Event("input"));

        // The easiest method to disable the slider is to wrap it inside a div and disable pointer events on that.
        let opacitySliderWrapper = document.createElement("div");
        opacitySliderWrapper.classList.add("opacitySliderWrapper");
        if( !layer.show ) {
            opacitySlider.disabled = true; // only visually disabled
            opacitySliderWrapper.classList.add("opacitySliderWrapperDisabled")
        }
        opacitySliderWrapper.appendChild(opacitySlider)
        innerDiv.appendChild(opacitySliderWrapper)
        layerDiv.appendChild(innerDiv)
    } else {
        // Vertically centered by default
        let layerNameSpan = document.createElement("span");
        layerNameSpan.innerHTML = layer.displayName;
        layerDiv.appendChild(layerNameSpan);
    }

    if(layer.tooltip && layer.tooltip.length) {
        let infoBtn = document.createElement("i");
        infoBtn.classList.add("fa-solid", "fa-lg", "fa-circle-info", "menu-layer-info-btn");
        // Add tooltip on hover
        // Use layer.tooltip if possible, else the tooltip has to be set later
        infoBtn.dataset.bsToggle = "tooltip";
        infoBtn.dataset.bsPlacement = "bottom";
        infoBtn.title = layer.tooltip;
        layerDiv.appendChild(infoBtn)
    }
    return layerDiv;
}

// Takes a category from the layer list and creates the html for it
function createMenuCategoriesAndLayers(categories, wrapperDomElement) {

    let accordionDiv = document.createElement("div");
    accordionDiv.classList.add("accordion");
    accordionDiv.id = wrapperDomElement.id.replace("-content-wrapper", "");
    wrapperDomElement.appendChild(accordionDiv)
 
    for(let category of categories) {
        // Create the HTMl for this category first
        createCategoryHtml(category, accordionDiv)

        wrapperDomElement = accordionDiv.querySelector("#menu-data-" + category.name + "-content-wrapper");

        // Check if there are subcategories
        if(!category.hasOwnProperty("subCategories")) {
            // Lowest level reached, create layer html
            for(let layer of category.layers) {
                addMenuLayer(category, layer, wrapperDomElement);
            }
            // Some conditional stuff for special cases
            if(category.name === "imagery" && category.isBaseLayerCategory) {
                addImageryEmptyLayer(category, wrapperDomElement);
            }
        } else {
            // Create subcategory entries until lowest level is reached
            createMenuCategoriesAndLayers(category.subCategories, wrapperDomElement);
        }
    }
}

// This method is somewhat ugly. It creates a bunch of dom elements with attributes to create the html for a category.
// This is done in js since it allows to extend layerCategories and have the html created dynamically,
// which might come in handy when layer are added in the future. 
function createCategoryHtml(category, wrapper) {
    let div = document.createElement("div")
    div.classList.add("accordion-item", "menu-item-level-" + category.depth)
    div.dataset.category = category.name;
    wrapper.appendChild(div);

    let span = document.createElement("span");
    span.id = "menu-data-" + category.name + "-heading";
    span.classList.add("accordion-header");
    div.appendChild(span);

    let btn = document.createElement("button");
    btn.classList.add("accordion-button", "collapsed", "menu-btn-level-" + category.depth);
    btn.type = "button";
    btn.dataset.bsToggle = "collapse";
    btn.dataset.bsTarget = "#menu-data-" + category.name;
    btn.ariaExpanded = "false";
    btn.setAttribute("aria-controls", "menu-data-" + category.name);
    if(category.icon && category.icon.length) {
        btn.innerHTML = DOMPurify.sanitize("<span class='menu-category-icon'>" + category.icon + "</span>" + category.displayName);
    } else {
        btn.textContent = category.displayName;
    }
    
    span.appendChild(btn);

    let div2 = document.createElement("div");
    div2.id = "menu-data-" + category.name;
    div2.classList.add("accordion-collapse", "collapse");
    div2.setAttribute("aria-labelledby", "menu-data-" + category.name);
    div.appendChild(div2);

    let div3 = document.createElement("div");
    div3.id = "menu-data-" + category.name + "-content-wrapper";
    div3.classList.add("accordion-body", "layer-entries-wrapper")
    div2.appendChild(div3);
}

function addImageryEmptyLayer(category, wrapper) {
    // Add option to remove layer as last entry
    let layerDiv = document.createElement("div");
    layerDiv.classList.add("menu-layer-entry");

    let radioBtn = document.createElement("input");
    radioBtn.classList.add("form-check-input",  "menu-layer-radio-btn")
    radioBtn.type = "radio";
    radioBtn.name = "radioImagery";
    radioBtn.value = "";

    radioBtn.addEventListener("click", function(event) {
        onMenuLayerRadioBtnClicked(category, undefined);
    });

    layerDiv.appendChild(radioBtn)

    let thumb = new Image(64, 64);
    thumb.src = "static/images/red-x.svg";
    thumb.alt = "Layer Vorschaubild";
    thumb.style.borderRadius = "10%";
    layerDiv.appendChild(thumb);

    let nameSpan = document.createElement("span");
    nameSpan.innerHTML = "Kein Layer";
    layerDiv.appendChild(nameSpan);
    
    wrapper.appendChild(layerDiv);
}

function createMenuLayerTree(categories) {

    function addDepth(arr, depth = 1) {
        arr.forEach(obj => {
          obj.depth = depth
          if(obj.subCategories) {
            addDepth(obj.subCategories, depth + 1)
          }
        });
    }
    addDepth(categories)

    // Recursively create HTML for all categories
    let wrapperDomElement = document.querySelector("#menu-data-catalog-content-wrapper");
    createMenuCategoriesAndLayers(categories, wrapperDomElement);
}


function onMenuLayerChbClicked(event, layer) {
    let chb = event.target;
    let opacitySlider = document.querySelector("range-slider[data-layer-name=" + layer.name + "]")
    let opacitySliderWrapper = opacitySlider.parentElement;

    if(chb.checked) {
        opacitySlider.removeAttribute("disabled") // Setting to false doesn't work
        opacitySliderWrapper.classList.remove("opacitySliderWrapperDisabled");
        addLayer(layer);
    } else {
        opacitySlider.disabled = true;
        opacitySliderWrapper.classList.add("opacitySliderWrapperDisabled");
        removeLayer(layer);
    }
}


function onMenuLayerRadioBtnClicked(category, layer) {

    let baseLayerControl = viewer.baseLayerPicker;
    let viewModel = baseLayerControl.viewModel;
    let layers;
    if(category.name === "imagery") {
        layers = viewModel.imageryProviderViewModels;
    }

    if(category.name === "terrain") {
        layers = viewModel.terrainProviderViewModels;
    }

    if(typeof layer === "undefined" && category.name === "imagery") {
        // Remove imagery layer
        // The loop below will disable all layers if we do it like this
        layer = {
            name: ""
        }
        viewModel.selectedImagery = undefined;
    }

     // Can't use "layer" here
     for(let entry of category.layers) {
        if(entry.name !== layer.name) {
            entry.show = false;
        } else {
            entry.show = true;
            // change layer
            let filtered = layers.filter( layer => {
                return layer.name === entry.name;
            });
            if(filtered.length === 1) {
                if(category.name === "imagery")
                    viewModel.selectedImagery = filtered[0];
                if(category.name === "terrain")
                    viewModel.selectedTerrain = filtered[0];
            }
        }
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


function initializeIndexedDB() {
    
    if (!window.indexedDB) {
        dataSource("Your browser doesn't support a stable version of IndexedDB. Caching 3D-Models will not be available, resulting in longer loading times.");
        return;
    } else {
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

function initializeDataLoadingManager() {

    dataLoadingManager.postMessage({
        event: "initialize",
        backendBaseUrl: backendBaseUrl
    });

    camera.moveEnd.addEventListener(function() {
        // Get visible area
        // Has properties east, north, south, west in radiants
        let viewRect = camera.computeViewRectangle();
       
        let viewRectDeg = {
            east: Cesium.Math.toDegrees(viewRect.east),
            west: Cesium.Math.toDegrees(viewRect.west),
            north:  Cesium.Math.toDegrees(viewRect.north),
            south:  Cesium.Math.toDegrees(viewRect.south)
        }

        let cameraPosition = camera.position;
        let cameraDirection = camera.direction;
        let cameraUp = camera.up
        let currentFrustumCullingVolume = camera.frustum.computeCullingVolume(cameraPosition, cameraDirection, cameraUp)
        let frustumPlanes = [];
        for(let c4 of currentFrustumCullingVolume.planes) {
            frustumPlanes.push(Cesium.Plane.fromCartesian4(c4))
        }

        dataLoadingManager.postMessage({
            event: "povUpdated",
            layersToUpdate: layersToUpdateOnPovChange,
            frustumPlanes: frustumPlanes,
            viewRect: viewRectDeg
        });
    });

    dataLoadingManager.onmessage = function(event) {
        onDataLoadingManagerMessageReceived(event);
    }
}

/**
 * Manages loading and unloading entities when view changes
 * TODO maybe do this in worker is performance dropt too much
 * @param {*} event 
 */
function onDataLoadingManagerMessageReceived(event) {
    let data = event.data;
    // "data" has the layer names to update as properties
    let layers = Object.keys(data);

    if(layers.includes("cityModel")) {
        handleLoadingAndUnloadingCityModelEntities(data["cityModel"]);
    }
    if(layers.includes("sewerShafts")) {
        handleLoadingAndUnloadingSewerEntities("sewerShafts", data["sewerShafts"]);
    }
    if(layers.includes("sewerPipes")) {
        handleLoadingAndUnloadingSewerEntities("sewerPipes", data["sewerPipes"]);
    }
}

function handleLoadingAndUnloadingCityModelEntities(entitiesToShow) {
    let layer;
    let dgm1Layer;
    Util.iterateRecursive(layerCategories, function(obj) {
        if(obj.name === "cityModel") layer = obj;
        if(obj.name === "dgm1m") dgm1Layer = obj;
    });
    // The entities have different formats, but both have an id property that can be used for comparison
    //console.log("number of entities to show", entitiesToShow.length);
    let currentEntities = viewer.dataSources.getByName(layer.name)[0].entities;
    let entitiesToShowIds = entitiesToShow.map( entity => entity.id );
    let currentEntitiesIds = currentEntities.values.map( entity => entity.id );

    // get all entities that should be loaded (some might be loaded already)
    let entitiesToLoad =  entitiesToShow.filter( (entity) => {
        return !currentEntitiesIds.includes(entity.id);
    });

    // and the ones to unload
    let entitiesToUnload = currentEntities.values.filter( (entity) => {
        return !entitiesToShowIds.includes(entity.id);
    });
    //console.log("number of entities to unload", entitiesToUnload.length);
    // unload
    for(let entity of entitiesToUnload) {
        currentEntities.remove(entity);
    }

    // Query terrain heights for the building's coordinates
    (async () => {
        let terrainProvider = dgm1Layer.cesiumReference;
        var positions = [];
        for(let entity of entitiesToLoad) {
            let lon = parseFloat(entity.location.lon);
            let lat = parseFloat(entity.location.lat);
            positions.push(Cesium.Cartographic.fromDegrees(lon, lat));
        }
        positions = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions);
        // positions[...].height has been updated
        for(let [idx, entity] of Object.entries(entitiesToLoad)) {
            let lon = parseFloat(entity.location.lon);
            let lat = parseFloat(entity.location.lat);
            let altitude = parseFloat(entity.location.height + positions[idx].height);
            let position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
            let heading = Cesium.Math.toRadians(parseFloat(entity.orientation.heading)); 
            let pitch =  0
            let roll =  0
            let orientation = Cesium.Transforms.headingPitchRollQuaternion(position, new Cesium.HeadingPitchRoll(heading, pitch, roll));

            let newEntity = new Cesium.Entity({
                id: entity.id,
                name: entity.id,
                position: position,
                orientation: orientation,
                description: ""
                // model reference gets added later
            });

            let url = backendBaseUrl + layer.apiEndpoint + "?ids=" + newEntity.id;
            newEntity.model = new Cesium.ModelGraphics({
                uri: url,
                // needed for opacity but doesn't change appearance
                color: Cesium.Color.fromAlpha(Cesium.Color.WHITE, 1),
                colorBlendMode: Cesium.ColorBlendMode["MIX"],
                colorBlendAmount: 0.0,
            });
            // Add a property with the current timestamp so we can implement FIFO
            newEntity.addProperty("addedToViewerTimestamp");
            newEntity.addedToViewerTimestamp = Date.now();
            currentEntities.add(newEntity);
        }

        // Apply current slider value
        let opacitySlider = document.querySelector(".opacitySlider[data-layer-name='" + layer.name + "']");
        handleLayerOpacityChange(opacitySlider);

        
    })();

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
        //             let url = backendBaseUrl + "buildings/" + newEntity.id
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

function handleLoadingAndUnloadingSewerEntities(layerName, entityIdsToShow) {
    let layer;
    Util.iterateRecursive(layerCategories, function(obj) {
        if(obj.name === layerName) {
            layer = obj;
        }
    });
    // Note that we work with the properties.id here, not the id of the entity, which is random
    let datasource = viewer.dataSources.getByName(layer.name)[0];
    let currentEntities = datasource.entities;
    let currentEntitiesIds = currentEntities.values.map( entity => entity.properties.id.getValue() );
    // Get all entities that should be loaded (some might be loaded already)
    let entityIdsToLoad =  entityIdsToShow.filter( (id) => {
        return !currentEntitiesIds.includes(id);
    });

    // And the ones to unload
    let entitiesToUnload = currentEntities.values.filter( (entity) => {
        return !entityIdsToShow.includes(entity.properties.id.getValue());
    });

    // console.log("number of currently loaded entities: ", currentEntitiesIds.length);
    // console.log("number of entities to show", entityIdsToShow.length);
    // console.log("number of entities to load", entityIdsToLoad.length);
    // console.log("number of entities to unload", entitiesToUnload.length);
    
    // Unload
    for(let entity of entitiesToUnload) {
        datasource.entities.remove(entity);
    }

    // Load
    if(entityIdsToLoad.length) {
        let url = backendBaseUrl + layer.apiEndpoint + "?ids=";
        for(let i=0; i<entityIdsToLoad.length; i++) {
            url +=  entityIdsToLoad[i]
            url += (i < entityIdsToLoad.length-1) ? "," : "";
        }

        fetch(url).then( response => response.json()).then( featureCollection => {
            for(let feature of featureCollection["features"]) {
                let entity = createSewerEntityFromFeature(feature);
                datasource.entities.add(entity);
            }
            // Apply current slider value
            let opacitySlider = document.querySelector(".opacitySlider[data-layer-name='" + layer.name + "']");
            handleLayerOpacityChange(opacitySlider);
        });
        
    }
}

/**
 * Creates dataSources for the base layers provided in layerCategories.
 * For now we hard-code how to load each layer
 * @param {*} layerCategories 
 */
function loadBaseLayers(layerCategories) {

    Util.iterateRecursive(layerCategories, function(layer) {
        // Aerial Images RVR
        if(layer.type === "wms" && layer.name.startsWith("aerialImageRVR")) {
            let credit = layer.displayName + ": © " + layer.credit
            credit = new Cesium.Credit(DOMPurify.sanitize(marked.parse(credit), false));
            
            let provider = new Cesium.WebMapServiceImageryProvider({
                url : layer.url,
                layers : layer.layerName,
                // enablePickFeatures: false,
                credit: credit
            });
            // ProviderViewModel is not shown since the baseLayerPicker is hidden
            // But this is an easy way to add a new base layer
            let viewModelProvider = new Cesium.ProviderViewModel({
                name: layer.name,
                tooltip: layer.tooltip,
                iconUrl: layer.thumbnailSrc,
                category: "Other",
                creationFunction: () => {
                    return provider;
                }
            });
            viewer.baseLayerPicker.viewModel.imageryProviderViewModels.push(viewModelProvider);
            // Get most recently added layer and give it a name
            let newLayer = scene.imageryLayers.get(scene.imageryLayers.length-1)
            newLayer.name = layer.name;
            // Store a reference to the added layer, not the provider
            layer.cesiumReference = newLayer;
        }

        // Terrain GeobasisNRW
        if(layer.name.includes("dgm")) {
            let resolution = layer.name.match(/\d/g).join("")
            let provider = new Cesium.CesiumTerrainProvider({
                url : backendBaseUrl + "terrain/dem/" + resolution,
                // No attribution required, http://www.govdata.de/dl-de/zero-2-0
            });

            let viewModelProvider = new Cesium.ProviderViewModel({
                name: layer.name,
                tooltip: layer.tooltip,
                iconUrl: layer.thumbnailSrc,
                category: "Other",
                creationFunction: () => {
                    return provider;
                }
            });
            viewer.baseLayerPicker.viewModel.terrainProviderViewModels.push(viewModelProvider);
            layer.cesiumReference = provider;
        }
    });
}


function generateUuids(layerCategories) {
    Util.iterateRecursive(layerCategories, function(obj, params) {
        obj.id = UUID.generate();
    });
}

// Adds a property where the reference to the cesium layer object can be stored later.
// This can then be used as a shortcut to access the layer object, which is needed sometimes.
// This method is actually redundant (props could be created when needed), but kept in for readability.
function addReferenceProp(layerCategories) {
    Util.iterateRecursive(layerCategories, function(obj, name) {
        if(obj.type !== "category") {
            obj.cesiumReference = "";
        }
    })
}

function addLayer(layer) {
    layer.show = true;
    if(layer.name === "osmBuildings") {
        // Load OSM buildings
        // Can't use datasources with primitives
        const buildingsTileset = viewer.scene.primitives.add( Cesium.createOsmBuildings({
            style: new Cesium.Cesium3DTileStyle({
                color : "color('#FFFFFF', 1)",
                show : true
            })
        }));
        layer.cesiumReference = buildingsTileset;
        buildingsTileset.readyPromise.then( () => {
            // Apply current slider value
            let opacitySlider = document.querySelector(".opacitySlider[data-layer-name='" + layer.name + "']");
            handleLayerOpacityChange(opacitySlider);
        });
    }

    if(layer.name === "cityModel") {
        /*
         * This layer is managed by the tiling manager.
         * We don't want to load all buildings, only the ones relevant for the current camera view.
         */
        let cityModelDataSource = new Cesium.CustomDataSource(layer.name);
        viewer.dataSources.add(cityModelDataSource);
        layer.cesiumReference = cityModelDataSource;
        layersToUpdateOnPovChange.push(layer.name);
        camera.moveEnd.raiseEvent(); // Simulate the event to load the first models
    }

    if(layer.name.includes("sewer")) {
        // Had some trouble with GeoJsonDataSource, so CustomDataSource it is for now
        let sewerDataSource = new Cesium.CustomDataSource(layer.name);
        viewer.dataSources.add(sewerDataSource);
        layer.cesiumReference = sewerDataSource;
        layersToUpdateOnPovChange.push(layer.name);
        camera.moveEnd.raiseEvent(); // Simulate the event to load the first features
    }

    if(layer.name === "metrostationPointcloud") {
        let url = backendBaseUrl + "metrostation/pointcloud/"; // The last slash is important here!
        let tileset = new Cesium.Cesium3DTileset({
            url: url,
            dynamicScreenSpaceError: true,
            dynamicScreenSpaceErrorDensity: 0.00278,
            dynamicScreenSpaceErrorFactor: 4.0,
            dynamicScreenSpaceErrorHeightFalloff: 0.25
        })

        scene.primitives.add(tileset);
        layer.cesiumReference = tileset;
    }

    if(layer.type === "sensor") {
        let url = backendBaseUrl + "weather/" + layer.name;
        fetch(url)
            .then(response => response.json())
            .then( data => {
                console.log(data);
                let dataSource = new Cesium.CustomDataSource(layer.name);
                let entities = [];
                for(let sensor of data) {
                    let lon = sensor.position.lon;
                    let lat = sensor.position.lat;
                    // For now altitude is ignored and sensors are clamped to the globe
                    // This has to be changed as soon as a sensor provides altitude information.

                    let entity = new Cesium.Entity({
                        id: sensor.id,
                        name: sensor.id,
                        position: new Cesium.Cartesian3.fromDegrees(lon, lat, 0),
                        billboard: {
                            image: "/static/images/sensor.webp",
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                            verticalOrigin: Cesium.VerticalOrigin.CENTER,
                            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                            disableDepthTestDistance: Number.POSITIVE_INFINITY, // Never applied --> symbol visible even underground
                            width: 100, // in px
                            height: 100,
                            scaleByDistance: new Cesium.NearFarScalar(1, 1.0, 10000, 0.5) // slightly reduce size if camera is far away (100x100 --> 50x50)
                        },
                        properties: new Cesium.PropertyBag({
                            position: sensor.position,
                            measurement: sensor.measurement,
                            additionalMeasurements: sensor.additionalMeasurements,
                            timeseriesUrl: url + "/timeseries/" + sensor.id,
                            isSensor: true
                        })
                    });
                    dataSource.entities.add(entity);
                    entities.push(entity);
                }
                viewer.dataSources.add(dataSource);
                layer.cesiumReference = dataSource;
                showSensorList(entities);
            })
            .catch(e => {
                console.error(e);
            });
    }

    if(layer.type === "wms") {
        let credit = layer.displayName + ": © " + layer.credit
        credit = new Cesium.Credit(DOMPurify.sanitize(marked.parse(credit), false));

        if(layer.name === "noisePollutionMap2017") {
            let provider = new Cesium.WebMapServiceImageryProvider({
                url : layer.url,
                layers : layer.layerName,
                parameters : {
                    transparent : 'true',
                    format : 'image/png' // TODO make more generic
                },
                proxy : new Cesium.DefaultProxy('/proxy/'),
                // enablePickFeatures: false,
                credit: credit
            });
            provider.name = layer.name;
            let currentLayers = viewer.scene.imageryLayers;
            currentLayers.addImageryProvider(provider)
            // Get most recently added layer and give it a name
            let newLayer = scene.imageryLayers.get(scene.imageryLayers.length-1)
            newLayer.name = layer.name;
            // Store a reference to the added layer, not the provider
            layer.cesiumReference = newLayer;
            // Apply current slider value
            let opacitySlider = document.querySelector(".opacitySlider[data-layer-name='" + layer.name + "']");
            handleLayerOpacityChange(opacitySlider);

        } else {
            let provider = new Cesium.WebMapServiceImageryProvider({
                url : layer.url,
                layers : layer.layerName,
                // enablePickFeatures: false,
                credit: credit
            });
            provider.name = layer.name;
            let currentLayers = viewer.scene.imageryLayers;
            currentLayers.addImageryProvider(provider)
            // Get most recently added layer and give it a name
            let newLayer = scene.imageryLayers.get(scene.imageryLayers.length-1)
            newLayer.name = layer.name;
            // Store a reference to the added layer, not the provider
            layer.cesiumReference = newLayer;
            // Apply current slider value
            let opacitySlider = document.querySelector(".opacitySlider[data-layer-name='" + layer.name + "']");
            handleLayerOpacityChange(opacitySlider);
        }
    }
}

// Hides a layer in different ways, depending on what type of layer it is.
// Base layers are handled through the baseLayerPicker Widget instead.
function removeLayer(layer) {
    layer.show = false;


    if(layersToUpdateOnPovChange.includes(layer.name)) {
        const index = layersToUpdateOnPovChange.indexOf(layer.name);
        layersToUpdateOnPovChange.splice(index, 1);
        camera.moveEnd.raiseEvent();
    }

    // Imagery
    // layer.cesiumReference is the imageryProvider.
    let currentImageryLayers = viewer.scene.imageryLayers;
    for(let i=0; i<currentImageryLayers.length; i++) {
        let l = currentImageryLayers.get(i);
        if(l.name === layer.name) {
            currentImageryLayers.remove(l);
            layer.cesiumReference = undefined;
            return;
        }
    }

    // Primitives
    let removed = scene.primitives.remove(layer.cesiumReference)
    if(removed) {
        layer.cesiumReference = undefined;
        return;
    }

    // Datasources
    removed = viewer.dataSources.remove(layer.cesiumReference)
    if(removed) {
        layer.cesiumReference = undefined;
        return;
    }

    // All entities that don't belong to a data source
    removed = viewer.entities.remove(layer.cesiumReference);
    if(removed) {
        layer.cesiumReference = undefined;
        return;
    }
}


function createSewerEntityFromFeature(feature) {
    let geom = feature.geometry;
    let props = feature.properties;
    let geomType = geom.type;
    let coords = geom.coordinates;
    let entity;
    let entityProps = new Cesium.PropertyBag();
    for(let [key, value] of Object.entries(props)) {
        entityProps.addProperty(key, value);
    }
    let color = props["Farbe"];
    let colorSplit = color.split(",");
    colorSplit = colorSplit.map(entry => parseInt(entry));
    // Sewer shaft
    if(geomType === "Point") {
        let shaftHeight = entityProps["Deckelhöhe [m]"] - entityProps["Sohlhöhe [m]"]
        let position = new Cesium.Cartesian3.fromDegrees(coords[0], coords[1], coords[2] - shaftHeight / 2) // lon, lat, height
        entity = new Cesium.Entity({
            id: props.id,
            name: props.id,
            position: position,
            show: true,
            billboard: new Cesium.BillboardGraphics(),
            cylinder: {
                length: shaftHeight,
                topRadius: 1,
                bottomRadius: 1,
                material: new Cesium.ColorMaterialProperty(Cesium.Color.fromBytes(colorSplit[0], colorSplit[1], colorSplit[2]))
            },
            properties: entityProps
        })
    }

    // Sewer pipe
    if(geomType === "LineString") {
        let coordArr = [];
        for(let point of coords) {
            coordArr.push(point[0])
            coordArr.push(point[1])
            coordArr.push(point[2])
        }
        let positions = new Cesium.Cartesian3.fromDegreesArrayHeights(coordArr)
        entity = new Cesium.Entity({
            id: props.id,
            name: props.id,
            show: true,
            properties: entityProps
        });
        entity.polylineVolume = new Cesium.PolylineVolumeGraphics({
            positions: positions,
            shape: computeCircle(props["Durchmesser [mm]"] / 1000.0),
            material: new Cesium.ColorMaterialProperty(Cesium.Color.fromBytes(colorSplit[0], colorSplit[1], colorSplit[2])),
            cornerType: Cesium.CornerType.MITERED
        });

        // Computes the circle, that will be extruded to form the pipe
        function computeCircle(radius) {
            const positions = [];
            for (let i = 0; i < 360; i++) {
              const radians = Cesium.Math.toRadians(i);
              positions.push(
                new Cesium.Cartesian2(
                  radius * Math.cos(radians),
                  radius * Math.sin(radians)
                )
              );
            }
            return positions;
        }
    }
    return entity;
}


/**
 * 
 * @param {*} input | The slider element that was changed.
 */
function handleLayerOpacityChange(input) {
    let value = input.value;
    let layerName = input.dataset.layerName;
    let layer;
    Util.iterateRecursive(layerCategories, function(obj) {
        if(obj.name === layerName) {
            layer = obj;
        }
    });
    layer.opacity = value;
    let reference = layer.cesiumReference;

    if(reference.entities && reference.entities.values.length) {
        let entities = reference.entities.values;
        for(let i=0;i<entities.length;i++) {
            let entity = entities[i];

            if(entity.ellipsoid) {
                let color = entity.ellipsoid.material.color.getValue();
                color.alpha = value / 100;
                entity.ellipsoid.material = color;
            }

            if(entity.polylineVolume) {
                let color = entity.polylineVolume.material.color.getValue();
                color.alpha = value / 100;
                entity.polylineVolume.material = color;
            }

            if(entity.model) {
                let color = entity.model.color.getValue();
                color.alpha = value / 100;
                entity.model.color = color;
            }
        }
    }

    if(layer.type === "wms") {
        let currentLayers = viewer.scene.imageryLayers;
        for(let i=0;i<currentLayers.length;i++) {
            let l = currentLayers.get(i)
            if(l.name === layer.name) {
                l.alpha = value / 100;
                l.dayAlpha = value / 100;
                l.nightAlpha = value / 100;
            }
        }
    }

    // TODO generalize
    if(layer.name === "osmBuildings") {
        let style = reference.style;
        let colorExpr = style.color.expression
        let color = colorExpr.substring(
            colorExpr.indexOf("#"), 
            colorExpr.lastIndexOf(",")-1
        );
        let newColorExpr = "color('" + color + "', " + value / 100 + ")"
        let newStyle = new Cesium.Cesium3DTileStyle({
            color: newColorExpr,
            show: true
        })
        reference.style = newStyle;
    }
}


let handleSelectedEntityChanged = async function(entity) {
    if(entity) {
        // Cesium automatically shows the info box.
        // Prevent that for sensor entities
        let props = entity.properties.getValue(Cesium.JulianDate.now());
        if(props.hasOwnProperty("isSensor")) {
            if(props.isSensor) {
                viewer.selectedEntity = undefined;
                let layerName = entity.entityCollection.owner.name;
                // TODO error handling
                fetch(props.timeseriesUrl)
                    .then(result => result.json())
                    .then(data => {
                        updateSensorInfoPanel(entity, layerName, data);
                        openSensorInfoPanel();
                    });
                
            }
        } else {
            closeSensorInfoPanel();
            entity.description = "Frage Attribut-Informationen vom Server ab...";
            let queriedId = entity.id;
            let layerName = entity.entityCollection.owner.name;
            let apiEndpoint;
            Util.iterateRecursive(layerCategories, (obj) => {
                if(obj.name === layerName) {
                    apiEndpoint =  obj.apiEndpoint;
                    return;
                }
            });
            let url = backendBaseUrl + apiEndpoint + "/attributes?ids=" + queriedId;
            let json;
            try {
                let resp = await fetchWithTimeout(url, {timeout: 5000});
                json = await resp.json();
            } catch (error) {
                // Timeout if the request takes longer than 5 seconds
                entity.description = "Keine Informationen verfügbar";
            }
            let attributes = json[0];
            if(attributes.hasOwnProperty("properties")) {
                attributes = attributes.properties; // for geojson
            }
            // Create a table structure, containing the entity properties
            let table = document.createElement("table");
            table.classList.add("cesium-infoBox-defaultTable");
            let tbody = document.createElement("tbody");
            table.appendChild(tbody)
            for(let [key, value] of Object.entries(attributes)) {
                if(attributes.hasOwnProperty(key)) {
                    let row = document.createElement("tr");
                    let keyCell = document.createElement("td");
                    let valueCell = document.createElement("td");
                    keyCell.innerHTML = key;
                    valueCell.innerHTML = value;
                    row.appendChild(keyCell);
                    row.appendChild(valueCell);
                    tbody.appendChild(row);
                }
            };
    
            entity.description = table.outerHTML;
        }

        
    }
}


async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 5000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
    return response;
}


function startMeasurement(drawingMode) {
    measurementToolActive = true;
    let result = 0.0;
    let resultSpan = document.getElementById("measurement-" + drawingMode + "-result");
    // Temporarily disable showing the info box when clicking on entities
    // It would trigger while drawing
    viewer.selectedEntityChanged.removeEventListener(handleSelectedEntityChanged)
    
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    let activeShape; // The shape that is currently drawn (polyline, polygon, ...)
    let activeShapePoints = []; // The shape's vertices
    let floatingPoint; // The point floating beneath the mouse cursor 
    //let currentPolygonTriangle; // Stored here so we don't have to create millions of triangles when cursor moves
    //let currentPolygonTrianglePositions;

    // Clear all existing measurements (delete entities)
    let entitiesToRemove = viewer.entities.values.filter( entity => entity.name.includes("measurement") );
    for(let entity of entitiesToRemove) {
        viewer.entities.remove(entity);
    }

    if (!Cesium.Entity.supportsPolylinesOnTerrain(scene)) {
         window.alert("Dieser Browser unterstützt keine Polylinien auf der Geländeoberfläche");
    }

    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

    // On left licking into the viewer
    handler.setInputAction(function (event) {
        viewer.selectedEntity = undefined;
        // We use `viewer.scene.pickPosition` here instead of `viewer.camera.pickEllipsoid` so that
        // we get the correct point when mousing over terrain.
        const earthPosition = scene.pickPosition(event.position);
        // `earthPosition` will be undefined if our mouse is not over the globe.
        if(Cesium.defined(earthPosition)) {
            if (activeShapePoints.length === 0) {
                floatingPoint = drawPoint(earthPosition); // Draw a point
                activeShapePoints.push(earthPosition);
                const dynamicPositions = new Cesium.CallbackProperty(function () {
                    if(drawingMode === "polygon") {
                        return new Cesium.PolygonHierarchy(activeShapePoints);
                    }
                    return activeShapePoints;
                }, false);
                activeShape = drawShape(dynamicPositions);
            }
            
            if(drawingMode === "line") {
                // If this is not the first point of the shape
                if(activeShapePoints.length > 1) {
                    // Calculate the distance between the last two points and add it to result
                    // -1 is the floating point, so -2 is the vertex set with the left click.
                    let startPoint = Cesium.Cartographic.fromCartesian(activeShapePoints.at(-2));
                    let endPoint = Cesium.Cartographic.fromCartesian(activeShapePoints.at(-1)); 
                    let ellipsoidGeodesic = new Cesium.EllipsoidGeodesic(startPoint, endPoint);
                    let distance = ellipsoidGeodesic.surfaceDistance;
                    result += distance;
                    resultSpan.innerText = Util.round(result, 3).toString().replace(".", ",");
                }
            }

            if(drawingMode === "polygon") {
                // Calculate the polygon area by summing up the area of the triangles used to draw it on the globe
                let polygon = activeShape.polygon;
                let hierarchy = polygon.hierarchy.getValue();
                // Split the polygon into triangles
                // Indices refer to the position of the vertex in hierarchy.positions
                let indices = Cesium.PolygonPipeline.triangulate(hierarchy.positions, hierarchy.holes);
                let sum = 0;
                // For each triangle in the polygon
                for (let i=0; i<indices.length; i+=3) {
                    // Get vectors from the origin to each corner of the triangle
                    let vector1 = hierarchy.positions[indices[i]];
                    let vector2 = hierarchy.positions[indices[i+1]];
                    let vector3 = hierarchy.positions[indices[i+2]];
                    // Get the vector difference to get two of the edges as vectors.
                    // These vectors define the sides of a parallelogram (double the size of the triangle)
                    let vectorC = Cesium.Cartesian3.subtract(vector2, vector1, new Cesium.Cartesian3());
                    let vectorD = Cesium.Cartesian3.subtract(vector3, vector1, new Cesium.Cartesian3());
                    // Area of parallelogram is the cross product of the vectors
                    let areaVector = Cesium.Cartesian3.cross(vectorC, vectorD, new Cesium.Cartesian3());
                    // Area of the triangle is just half the area of the parallelogram, add it to the sum.
                    let triangleArea = Cesium.Cartesian3.magnitude(areaVector)/2.0;
                    sum += triangleArea;
                }
                result = sum;
                resultSpan.innerText = Util.round(result, 3).toString().replace(".", ",");
            }

            // Now that we did the measurement, we can add the next point
            activeShapePoints.push(earthPosition);
            drawPoint(earthPosition);
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // On mouse move
    handler.setInputAction(function (event) {
        // If we currently draw a line
        if(Cesium.defined(floatingPoint)) {
            const newPosition = scene.pickPosition(event.endPosition);
            if (Cesium.defined(newPosition)) {
                floatingPoint.position.setValue(newPosition); // Constantly update point position so it stays at the cursor
                activeShapePoints.pop();
                activeShapePoints.push(newPosition);
                
                if(drawingMode === "line") {
                    // result has the length up to the last vertex
                    let startPoint = Cesium.Cartographic.fromCartesian(activeShapePoints.at(-2));
                    let endPoint = Cesium.Cartographic.fromCartesian(activeShapePoints.at(-1)); // = newPosition
                    let ellipsoidGeodesic = new Cesium.EllipsoidGeodesic(startPoint, endPoint);
                    let distance = ellipsoidGeodesic.surfaceDistance;
                    resultSpan.innerText = Util.round(result + distance, 3).toString().replace(".", ",");
                }
            }
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    
    
    handler.setInputAction(function (event) {
        finishMeasurement();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    function finishMeasurement() {
        terminateShape();
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        viewer.selectedEntityChanged.addEventListener(handleSelectedEntityChanged);
        toggleMeasurementInfoVisibility(drawingMode);
        let btn = document.getElementById("measurements-draw-" + drawingMode + "-btn");
        btn.classList.remove("btn-info");
        btn.classList.add("btn-secondary");
        resultSpan.innerText = Util.round(result, 3).toString().replace(".", ",");
        handler.destroy();
        measurementToolActive = false;
    }

    
    function terminateShape() {
        activeShapePoints.pop(); // remove point at mouse cursor
        drawShape(activeShapePoints); // Redraw the shape so it's not dynamic
        viewer.entities.remove(floatingPoint);
        viewer.entities.remove(activeShape); // Remove the dynamic shape.
        floatingPoint = undefined;
        activeShape = undefined;
        activeShapePoints = [];
    }

    function drawPoint(worldPosition) {
        const point = viewer.entities.add({
            name: "measurement-vertex",
            position: worldPosition,
            point: {
                color: Cesium.Color.CYAN,
                pixelSize: 5,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            });
        return point;
    }

    function drawShape(points, rotation) {
        let shape;
        if(drawingMode === "line") {
            shape = viewer.entities.add({
                name: "line-measurement",
                polyline: {
                    positions: points,
                    clampToGround: true,
                    width: 3,
                    material: new Cesium.ColorMaterialProperty(
                        Cesium.Color.CYAN.withAlpha(0.7)
                    ),
                },
            });
        }
        
        if(drawingMode === "polygon") {
            shape = viewer.entities.add({
                name: "polygon-measurement",
                polygon: {
                    hierarchy: points,
                    material: new Cesium.ColorMaterialProperty(
                        Cesium.Color.CYAN.withAlpha(0.7)
                    ),
                },
            });
        }
        return shape;
    }
}

function toggleMeasurementInfoVisibility(type) {
    let infoDiv = document.getElementById("measurement-info-" + type)
    if(infoDiv.style.display === "none" || infoDiv.style.display === "") {
        infoDiv.style.display = "block";
    } else {
        infoDiv.style.display = "none";
    }
}


/**
 * 
 * @param {boolean} hideOutside | If true the outside of the rectangle is hidden, else the inside is hidden
 */
function enableSlicers(entity, hideOutside) {
    // Change the appearance of the polygon
    entity.show = false;
    // Create a clipping plane for each edge of the polygon
    // TODO Create a handler for each side of the polygon (a sphere entity)
    // TODO Position of the sphere entities must be dynamic, but they are only movable orthogonal to the edge
    // TODO  When sphere position changes, update the corresponding clipping plane
    let points = entity.polygon.hierarchy.getValue().positions;
    let p1 = points[0];
    let p2 = points[1];
    let p3 = points[2];
    let p4 = points[3];
    let l1normal = new Cesium.Cartesian3();
    let l2normal = new Cesium.Cartesian3();
    let l3normal = new Cesium.Cartesian3();
    let l4normal = new Cesium.Cartesian3();
    Cesium.Cartesian3.subtract(p3, p2, l1normal);
    Cesium.Cartesian3.subtract(p4, p3, l2normal);
    Cesium.Cartesian3.subtract(p1, p4, l3normal);
    Cesium.Cartesian3.subtract(p2, p1, l4normal);
    Cesium.Cartesian3.normalize(l1normal, l1normal);
    Cesium.Cartesian3.normalize(l2normal, l2normal);
    Cesium.Cartesian3.normalize(l3normal, l3normal);
    Cesium.Cartesian3.normalize(l4normal, l4normal);
    if(!hideOutside) {
        // Turn the normals outside the rectangle, so that the clipping planes clip the inside
        l1normal = Cesium.Cartesian3.negate(l1normal, l1normal);
        l2normal = Cesium.Cartesian3.negate(l2normal, l2normal);
        l3normal = Cesium.Cartesian3.negate(l3normal, l3normal);
        l4normal = Cesium.Cartesian3.negate(l4normal, l4normal);
    }
    let plane1 = new Cesium.Plane.fromPointNormal(p2, l1normal);
    let plane2 = new Cesium.Plane.fromPointNormal(p3, l2normal);
    let plane3 = new Cesium.Plane.fromPointNormal(p4, l3normal);
    let plane4 = new Cesium.Plane.fromPointNormal(p1, l4normal);
    globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
        planes: [
            new Cesium.ClippingPlane.fromPlane(plane1),
            new Cesium.ClippingPlane.fromPlane(plane2),
            new Cesium.ClippingPlane.fromPlane(plane3),
            new Cesium.ClippingPlane.fromPlane(plane4),
        ],
        unionClippingRegions: hideOutside ? true : false,
        edgeWidth: 5.0,
        edgeColor: Cesium.Color.WHITE,
        enabled: true,
    });
    globe.backFaceCulling = false;
    globe.showSkirts = false;

    // for(let direction of [north, east, south, west]) {
    //     viewer.entities.add({
    //         name: "",
    //         position: Cesium.Cartesian3.fromDegrees(-107.0, 40.0, 300000.0),
    //         ellipsoid: {
    //           radii: new Cesium.Cartesian3(300000.0, 300000.0, 300000.0),
    //           material: Cesium.Color.GRAY,
    //         },
    //     });
    // }
    

    // If edge of rectangle was clicked (with epsilon)
        // check which edge it was
        // translate mouse movement into resizing the corresponding edge
        // update clipping planes

}


function drawSlicerRectangle() {
    let insideBtn = document.getElementById("slicers-inside-btn")
    if(insideBtn) insideBtn.remove();
    let outsideBtn = document.getElementById("slicers-outside-btn")
    if(outsideBtn) outsideBtn.remove();
    // Temporarily disable showing the info box when clicking on entities
    // It would trigger while drawing
    viewer.selectedEntityChanged.removeEventListener(handleSelectedEntityChanged)
    // On first click set the first vertex
    // On second click set the second one.
    // Then extrude the line orthogonal.
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    let activeShape; // The shape that is currently drawn
    let activeShapePoints = []; // The shape's vertices
    let floatingPoint; // The point floating beneath the mouse cursor 
    let offsetX = 0;
    let offsetY = 0;
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

    // On left licking into the viewer
    // First click sets the initial point
    // Second click defines the second point
    // Third click defines the third and last point
    handler.setInputAction(function (event) {
        viewer.selectedEntity = undefined;
        const earthPosition = scene.pickPosition(event.position);
        if(Cesium.defined(earthPosition)) {
            activeShapePoints.push(earthPosition);
            drawPoint(earthPosition);
            // Initial point
            if(activeShapePoints.length === 1) {
                floatingPoint = drawPoint(earthPosition); // Draw a point
                activeShapePoints.push(earthPosition); // Will be moved on mouse move
                const dynamicPositions = new Cesium.CallbackProperty(function () {
                   return activeShapePoints;
                }, false);
                activeShape = drawLine(dynamicPositions);
            // Second click
            } else if(activeShapePoints.length === 3) {
                activeShapePoints.push(activeShapePoints[0].clone()); // 4th point is same as 1st
                const dynamicPositions = new Cesium.CallbackProperty(function () {
                    return new Cesium.PolygonHierarchy(activeShapePoints);
                }, false);
                let p1 = new Cesium.Cartographic.fromCartesian(activeShapePoints[0])
                let p2 = new Cesium.Cartographic.fromCartesian(activeShapePoints[1])
                offsetX = p2.longitude - p1.longitude;
                offsetY = p2.latitude - p1.latitude;
                activeShape = drawPolygon(dynamicPositions);
            // Last click
            } else if(activeShapePoints.length === 5){
                activeShapePoints.pop(); // remove point at mouse cursor
                let entity = drawPolygon(activeShapePoints); // Redraw the shape so it's not dynamic
                viewer.entities.remove(floatingPoint);
                viewer.entities.remove(activeShape); // Remove the dynamic shape.
                floatingPoint = undefined;
                activeShape = undefined;
                activeShapePoints = [];
                viewer.selectedEntityChanged.addEventListener(handleSelectedEntityChanged);
                handler.destroy();
                // remove entities (except polygon)
                let entitiesToRemove = viewer.entities.values.filter( entity => entity.name.includes("slicers-line") || entity.name.includes("slicers-vertex"));
                for(let entity of entitiesToRemove) {
                    viewer.entities.remove(entity);
                }
                let drawRectangleBtn = document.getElementById("slicers-draw-rectangle-btn");
                drawRectangleBtn.classList.remove("btn-info");
                drawRectangleBtn.classList.add("btn-secondary");
                // Create additional slicer buttons in menu
                insideBtn = document.getElementById("slicers-inside-btn");
                let wrapper = document.querySelector("#menu-tools-slicers .menu-content-wrapper");
                if(!insideBtn) {
                    insideBtn = document.createElement("button");
                    insideBtn.type = "button";
                    insideBtn.id = "slicers-inside-btn";
                    insideBtn.classList.add("btn", "btn-secondary");
                    insideBtn.innerText = "Innen ausblenden";
                    wrapper.appendChild(insideBtn);
                    insideBtn.addEventListener("click", (e) => {
                        let btn = e.target;
                        outsideBtn.classList.remove("btn-info");
                        outsideBtn.classList.add("btn-secondary");
                        if(!btn.classList.contains("btn-info")) {
                            e.target.classList.remove("btn-secondary");
                            e.target.classList.add("btn-info");
                            enableSlicers(entity, false);
                        } else {
                            e.target.classList.add("btn-secondary");
                            e.target.classList.remove("btn-info");
                            globe.clippingPlanes.enabled = false; // disable slicers
                            entity.show = true;
                        }
                    });
                }
                outsideBtn = document.getElementById("slicers-outside-btn")
                if(!outsideBtn) {
                    outsideBtn = document.createElement("button");
                    outsideBtn.type = "button";
                    outsideBtn.id = "slicers-outside-btn";
                    outsideBtn.classList.add("btn", "btn-secondary");
                    outsideBtn.innerText = "Außen ausblenden";
                    wrapper.appendChild(outsideBtn);
                    outsideBtn.addEventListener("click", (e) => {
                        let btn = e.target;
                        insideBtn.classList.remove("btn-info");
                        insideBtn.classList.add("btn-secondary");
                        if(!btn.classList.contains("btn-info")) {
                            e.target.classList.remove("btn-secondary");
                            e.target.classList.add("btn-info");
                            enableSlicers(entity, true);
                        } else {
                            e.target.classList.add("btn-secondary");
                            e.target.classList.remove("btn-info");
                            globe.clippingPlanes.enabled = false; // disable slicers
                            entity.show = true;
                        }
                    });
                }
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // On mouse move
    handler.setInputAction(function (event) {
        // If we currently draw a line
        if(Cesium.defined(floatingPoint)) {
            const newPosition = scene.pickPosition(event.endPosition);
            if (Cesium.defined(newPosition)) {
                floatingPoint.position.setValue(newPosition); // Constantly update point position so it stays at the cursor
                if(activeShapePoints.length <= 2) {
                    activeShapePoints.pop();
                    activeShapePoints.push(newPosition);
                } else {
                    activeShapePoints.pop();
                    activeShapePoints.pop();
                    
                    // We want the new line to be orthogonal to the existing one
                    let p1 = activeShapePoints[0].clone();
                    let p2 = activeShapePoints[1].clone();
                    let pMouse = newPosition.clone();
                    let normal = new Cesium.Cartesian3(); // The normal vector of a plane through p1, p2 and the origin
                    Cesium.Cartesian3.cross(p1, p2, normal);
                    Cesium.Cartesian3.normalize(normal, normal);
                    let plane = Cesium.Plane.fromPointNormal(p1, normal); // said plane
                    let projected = new Cesium.Cartesian3(); // pMouse Projected onto the plane
                    Cesium.Plane.projectPointOntoPlane(plane, pMouse, projected)
                    let p2Carto = Cesium.Cartographic.fromCartesian(p2);
                    let projectedCarto = Cesium.Cartographic.fromCartesian(projected);
                    let diffLon = p2Carto.longitude - projectedCarto.longitude;
                    let diffLat = p2Carto.latitude - projectedCarto.latitude;
                    let pMouseCarto = Cesium.Cartographic.fromCartesian(pMouse);
                    pMouseCarto.longitude += diffLon;
                    pMouseCarto.latitude += diffLat;
                    let p3 = new Cesium.Cartesian3.fromRadians(pMouseCarto.longitude, pMouseCarto.latitude, pMouseCarto.height)
                    activeShapePoints.push(p3);
                    // p4 is the last point needed for the rectangle. We calculated the offset (p1 p2) earlier
                    let p4 = Cesium.Cartographic.fromCartesian(p3);
                    p4.longitude -= offsetX;
                    p4.latitude -= offsetY;
                    activeShapePoints.push(new Cesium.Cartesian3.fromRadians(p4.longitude, p4.latitude, p4.height));
                }
            }
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);


    function drawPolygon(points) {
        return viewer.entities.add({
            name: "slicers-polygon",
            polygon: {
                hierarchy: points,
                material: new Cesium.ColorMaterialProperty(
                    Cesium.Color.CYAN.withAlpha(0.7)
                ),
            }
        });
    }

    function drawLine(points) {
        return viewer.entities.add({
            name: "slicers-line",
            polyline: {
                positions: points,
                clampToGround: true,
                width: 3,
                material: new Cesium.ColorMaterialProperty(
                    Cesium.Color.CYAN.withAlpha(0.7)
                ),
            },
        });
    }

    function drawPoint(worldPosition) {
        const point = viewer.entities.add({
            name: "slicers-vertex",
            position: worldPosition,
            point: {
                color: Cesium.Color.CYAN,
                pixelSize: 5,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            });
        return point;
    }
}

/**
 * 
 * @param {*} newSensors | array of cesium entities
 */
function showSensorList(newSensors) {
    let widgetDiv = document.getElementById("sensorListOverlay");
    let listDiv = document.getElementById("sensorListContainer");
    let alreadyAddedSensors = document.querySelectorAll("#sensorListContainer .sensorEntry");
    console.log(alreadyAddedSensors);
    for(let sensor of newSensors) {
        console.log(sensor.id);
        let alreadyInList = false;
        if(alreadyAddedSensors && alreadyAddedSensors.length) {
            for(let addedSensor of alreadyAddedSensors) {
                if(sensor.id === addedSensor.dataset.id) {
                    alreadyInList = true;
                    break;
                }
            }
        }

        if(!alreadyInList) {
            let sensorEntry = document.createElement("div");
            sensorEntry.classList.add("sensorEntry");
            sensorEntry.dataset.id = sensor.id;
            let idSpan = document.createElement("span");
            sensorEntry.classList.add("sensorEntryNameSpan");
            idSpan.innerHTML = sensor.id;
            sensorEntry.appendChild(idSpan);
            listDiv.appendChild(sensorEntry);
            let flyToSensorBtn = document.createElement("btn");
            flyToSensorBtn.classList.add("flyToSensorBtn", "cesium-button");
            let icon = document.createElement("i");
            icon.classList.add("fa-solid", "fa-video");
            flyToSensorBtn.appendChild(icon);
            flyToSensorBtn.addEventListener("click", e => {
                viewer.flyTo(sensor)
            });
            sensorEntry.appendChild(flyToSensorBtn);
        }
    }
    widgetDiv.style.visibility = "visible";

}

function initializeSensorInfoPanel() {
    enableSensorInfoPanelResize();
    let closeBtn = document.getElementById("sensorInfoPanelCloseBtn");
    closeBtn.addEventListener("click", closeSensorInfoPanel);
}


function openSensorInfoPanel() {
    // Reduce cesium viewer size
    let headerHeight = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
    let headerSpacerHeight = getComputedStyle(document.documentElement).getPropertyValue('--header-spacer-height');
    let footerHeight = getComputedStyle(document.documentElement).getPropertyValue('--footer-height');
    let sensorInfoPanelHeight = getComputedStyle(document.documentElement).getPropertyValue('--sensor-info-panel-height');
    let newCesiumContainerHeight = "calc(100vh - " + headerHeight + " - " + headerSpacerHeight;
    newCesiumContainerHeight += " - " + footerHeight + " - " + sensorInfoPanelHeight + ")";
    document.documentElement.style.setProperty('--cesium-container-height', newCesiumContainerHeight);
    // Show sensor info panel
    let sensorInfoPanel = document.getElementById("sensorInfoPanel");
    sensorInfoPanel.style.visibility = "visible";
    sensorInfoPanel.style.transform = "translateY(0%)";
    let handle = document.getElementById("sensorInfoPanel-resize-handle");
    handle.style.pointerEvents = "auto";
    handle.style.cursor = "ns-resize";
}


function closeSensorInfoPanel() {
    // Increase cesium viewer size
    let headerHeight = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
    let headerSpacerHeight = getComputedStyle(document.documentElement).getPropertyValue('--header-spacer-height');
    let footerHeight = getComputedStyle(document.documentElement).getPropertyValue('--footer-height');
    let newCesiumContainerHeight = "calc(100vh - " + headerHeight + " - " + headerSpacerHeight;
    newCesiumContainerHeight += " - " + footerHeight + ")";
    document.documentElement.style.setProperty('--cesium-container-height', newCesiumContainerHeight);
    // Hide sensor info panel
    let sensorInfoPanel = document.getElementById("sensorInfoPanel");
    sensorInfoPanel.style.transform = "translateY(100%)";
    let handle = document.getElementById("sensorInfoPanel-resize-handle");
    handle.style.pointerEvents = "none";
    handle.style.cursor = "default";
    setTimeout( () => {
        sensorInfoPanel.style.visibility = "hidden";
    }, 300);
}


function enableSensorInfoPanelResize() {
    let handle = document.getElementById("sensorInfoPanel-resize-handle");
    handle.addEventListener("mousedown", (e) => {
        initDrag(e)
    });

    let startY, startHeight;
    let cesiumContainer = document.getElementById("cesiumContainer");
    let headerHeight = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
    let headerSpacerHeight = getComputedStyle(document.documentElement).getPropertyValue('--header-spacer-height');
    let footerHeight = getComputedStyle(document.documentElement).getPropertyValue('--footer-height');

    async function initDrag(e) {
        startY = e.clientY;
        startHeight = window.getComputedStyle(document.documentElement).getPropertyValue('--sensor-info-panel-height');
        startHeight = parseInt(startHeight, 10);
        // Add listeners to body instead of handle to account for fast mouse movements
        document.body.addEventListener('mousemove', doDrag);
        document.body.addEventListener('mouseup', stopDrag);
        cesiumContainer.classList.add("noTransition");
        document.body.style.setProperty("cursor", "ns-resize", "important");
    }

    async function doDrag(e) {
        let newHeight = (startHeight - e.clientY + startY) + "px"
        let newCesiumContainerHeight = "calc(100vh - " + headerHeight + " - " + headerSpacerHeight;
        newCesiumContainerHeight += " - " + footerHeight + " - " + newHeight + ")";
        document.documentElement.style.setProperty('--sensor-info-panel-height', newHeight);
        document.documentElement.style.setProperty('--cesium-container-height', newCesiumContainerHeight);
    }

    async function stopDrag(e) {
        cesiumContainer.classList.remove("noTransition");
        document.body.removeEventListener('mousemove', doDrag, false);
        document.body.removeEventListener('mouseup', stopDrag, false);
        document.body.style.setProperty("cursor", "default");
    }
}

function updateSensorInfoPanel(entity, layerName, timeseriesArr) {
    console.log(entity);
    console.log(timeseriesArr);
    let props = entity.properties.getValue(Cesium.JulianDate.now());
    let timestamp = new Date(props.measurement.time);
    const formatDate = (current_datetime)=>{
        let formatted_date = current_datetime.getDate() + "." +
            (current_datetime.getMonth() + 1) + "." +
            current_datetime.getFullYear() + " " +
            current_datetime.getHours() + ":" +
            current_datetime.getMinutes() + ":" +
            current_datetime.getSeconds();
        return formatted_date;
    }
    let additionalMeasurements = [];

    for(let entry of props.additionalMeasurements) {
        additionalMeasurements.push(entry);
    }

    let layerDisplayName;
    Util.iterateRecursive(layerCategories, function(obj) {
        if(obj.name === layerName && obj.type === "sensor") layerDisplayName = obj.displayName;
    });

    let sensorInfoSummaryAdditionalMeasurementsDiv = document.getElementById("sensorInfoSummaryAdditionalMeasurements");
    sensorInfoSummaryAdditionalMeasurementsDiv.innerHTML = "Weitere Messgrößen dieses Sensors: ";
    
    document.getElementById("sensorInfoPanelIdSpan").innerHTML = entity.id;
    document.getElementById("sensorInfoSummaryLayerName").innerHTML = layerDisplayName;
    document.getElementById("sensorInfoSummaryLon").innerHTML = props.position.lon.toString().replace(".", ",");
    document.getElementById("sensorInfoSummaryLat").innerHTML = props.position.lat.toString().replace(".", ",");
    document.getElementById("sensorInfoSummaryTimestamp").innerHTML = formatDate(timestamp);
    document.getElementById("sensorInfoSummaryValue").innerHTML = props.measurement.value.toString().replace(".", ",") + " " + props.measurement.unit;
    sensorInfoSummaryAdditionalMeasurementsDiv.innerHTML += additionalMeasurements.length ? additionalMeasurements.toString() : "Keine";
    
    let data = [];
    for(let entry of timeseriesArr) {
        data.push({
            name: entry[0],
            value: [entry[0], entry[1]]
        })
    };
    console.log(document.getElementById("sensorInfoPanelTimelineWrapper"));
    console.log(echarts);
    let instance = echarts.init(document.getElementById("sensorInfoPanelTimelineWrapper"));
    echartsSensorTimelineChart = instance; // Save reference as global variable
    let echartsOptions = {
        title: {
            text: "Darstellung der letzten " + 200 + " Werte",
            left: "center",
            textStyle: {
                color: "#FFFFFF",
                fontWeight: 500
            }
        },
        tooltip: {
            trigger: 'axis',
            formatter: function (params) {
              params = params[0];
              let date = new Date(params.name);
              return (
                date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + " " +
                date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() +
                ' : ' + params.value[1]
              );
            },
            axisPointer: {
              animation: false
            }
        },
        xAxis: {
            type: 'time',
            splitLine: {
                show: false
            },
            axisLabel: {
                color: "#FFFFFF"
            }
        },
        yAxis: {
            type: 'value',
            boundaryGap: [0, '100%'],
            splitLine: {
                show: false
            },
            axisLabel: {
                color: "#FFFFFF"
            }
        },
        series: [{
            name: 'SensorData',
            type: 'line',
            showSymbol: false,
            data: data,
            itemStyle: {
                color: getComputedStyle(document.documentElement).getPropertyValue('--primary-ui-color')
            }
          }
        ]
    }
    instance.setOption(echartsOptions);
}