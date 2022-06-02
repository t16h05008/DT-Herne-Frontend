// A worker that manages which features / 3D-Models etc. should be loaded in the viewer.
// It administrates a couple of subworkers, which do the real processing.

import proj4 from "proj4";

// subworkers
let buildingsWorker;
let sewersWorker

let buildingsTiles;
let sewersBboxes = {
    shafts: [],
    pipes: []
};

onmessage = function(e) {

    let data = e.data;
    // initialize
    if(data.event === "initialize") {
        proj4.defs("EPSG:4978","+proj=geocent +datum=WGS84 +units=m +no_defs");
        let backendBaseUrl = data.backendBaseUrl
        let buildingsReadyPromise = new Promise( (resolve, reject) => {
            // send requests
            let buildingsPromise = fetch(backendBaseUrl + "buildings/tilesInfo");
            buildingsPromise.then(response => response.json()).then(data => {
                buildingsTiles = data;
                // TODO Add bboxes in ECEF (ESPG:4978)
                resolve();
            });
        });

        let sewerShaftsReadyPromise = new Promise( (resolve, reject) => {
            let sewersPromise = fetch(backendBaseUrl + "sewers/shafts");
            sewersPromise.then(response => response.json()).then(data => {
                let features = data.features;
                for(let feature of features) {
                    sewersBboxes.shafts.push(calculateSewerShaftBBox(feature));
                }
                resolve();
            });
        });
    
        let sewerPipesReadyPromise = new Promise( (resolve, reject) => {
            let sewersPromise = fetch(backendBaseUrl + "sewers/pipes");
            sewersPromise.then(response => response.json()).then(data => {
                let features = data.features;
                for(let feature of features) {
                    sewersBboxes.pipes.push(calculateSewerPipeBBox(feature));
                }
                resolve();
            });
        })
    
        Promise.all([buildingsReadyPromise, sewerShaftsReadyPromise, sewerPipesReadyPromise]).then(values => {
            console.log("dataLoadingManager initialized")
        });
    }

    if(data.event === "povUpdated") {
        console.log('pov updated received');

        if(!buildingsTiles || !sewersBboxes) {
            console.log("WorkerManager not ready yet");
            return;
        }

        if(data.layersToUpdate.includes("cityModel")) {
            // If the sub-worker is still busy terminate it and spawn a new one
            if(buildingsWorker) {
                console.log("Sub-worker is still busy. Aborting current processing and restarting.");
                buildingsWorker.terminate();
            }

            buildingsWorker = undefined;
            buildingsWorker = new Worker(new URL("./buildingsWorker.js", import.meta.url));

            buildingsWorker.postMessage({
                event: "calculateTilesToShow",
                tiles: buildingsTiles,
                layersToUpdate: ["cityModel"],
                viewRect: data.viewRect
            });

            // Subworker is done. Pipe result to main thread
            buildingsWorker.onmessage = function(e) {
                postMessage(e.data)
                buildingsWorker.terminate();
                buildingsWorker = undefined;
            }
        }

        if(data.layersToUpdate.includes("sewerShafts") ||
                data.layersToUpdate.includes("sewerPipes")) {

            // If the sub-worker is still busy terminate it and spawn a new one
            if(sewersWorker) {
                console.log("Sub-worker is still busy. Aborting current processing and restarting.");
                sewersWorker.terminate();
            }

            let layersToUpdate = [];
            if(data.layersToUpdate.includes("sewerShafts")) layersToUpdate.push("sewerShafts");
            if(data.layersToUpdate.includes("sewerPipes")) layersToUpdate.push("sewerPipes");

            sewersWorker = undefined;
            sewersWorker = new Worker(new URL("./sewersWorker.js", import.meta.url));


            sewersWorker.postMessage({
                event: "calculateEntitiesToShow",
                sewersBboxes: sewersBboxes,
                frustumPlanes: data.frustumPlanes,
                layersToUpdate: layersToUpdate,
                viewRect: data.viewRect
            });

            // Subworker is done. Pipe result to main thread
            sewersWorker.onmessage = function(e) {
                postMessage(e.data)
                sewersWorker.terminate();
                sewersWorker = undefined;
            }
        }
    }
}


function calculateSewerShaftBBox(feature) {
    let lon = feature.geometry.coordinates[0];
    let lat = feature.geometry.coordinates[1];
    let z = feature.geometry.coordinates[2];
    let id = feature.properties["id"];
    let heightTop = feature.properties["Deckelhöhe [m]"];
    let heightBottom = feature.properties["Sohlhöhe [m]"];
    let heightDiff = heightTop - heightBottom;
    let pXyzMin = proj4("EPSG:4326", "EPSG:4978", [lon, lat, z-heightDiff]);
    let pXyzMax = proj4("EPSG:4326", "EPSG:4978", [lon, lat, z]);
    // A vertical line representing the shaft height. First point is bottom, second is top.
    // Bbox is added in WGS84 (lon, lat, alt) and ECEF (x,y,z)
    return {
        id: id,
        // Single line segment, so we only need 2 points instead of 8
        points: [
            {x: pXyzMin[0], y: pXyzMin[1], z: pXyzMin[2]},
            {x: pXyzMax[0], y: pXyzMax[1], z: pXyzMax[2]}
        ]
    };
}

function calculateSewerPipeBBox(feature) {
    let id = feature.properties["id"];
    // Set min and max to first point initially
    let xyzMin = proj4("EPSG:4326", "EPSG:4978", [feature.geometry.coordinates[0][0], feature.geometry.coordinates[0][1], feature.geometry.coordinates[0][2]]);
    let xyzMax = proj4("EPSG:4326", "EPSG:4978", [feature.geometry.coordinates[0][0], feature.geometry.coordinates[0][1], feature.geometry.coordinates[0][2]]);
    let pMinXyz = {
        x: xyzMin[0],
        y: xyzMin[1],
        z: xyzMin[2],
    }
    let pMaxXyz = {
        x: xyzMax[0],
        y: xyzMax[1],
        z: xyzMax[2],
    }

    for(let coord of feature.geometry.coordinates) {
        let xyz = proj4("EPSG:4326", "EPSG:4978", [coord[0], coord[1], coord[2]]);
        pMinXyz.x = (xyz[0] < pMinXyz.x) ? xyz[0] : pMinXyz.x;
        pMinXyz.y = (xyz[1] < pMinXyz.y) ? xyz[1] : pMinXyz.y;
        pMinXyz.z = (xyz[2] < pMinXyz.z) ? xyz[2] : pMinXyz.z;
        pMaxXyz.x = (xyz[0] > pMaxXyz.x) ? xyz[0] : pMaxXyz.x;
        pMaxXyz.y = (xyz[1] > pMaxXyz.y) ? xyz[1] : pMaxXyz.y;
        pMaxXyz.z = (xyz[2] > pMaxXyz.z) ? xyz[2] : pMaxXyz.z;
    }

    let cornerPoints = [
        {x: pMinXyz.x, y: pMinXyz.y, z: pMinXyz.z},
        {x: pMinXyz.x, y: pMinXyz.y, z: pMaxXyz.z},
        {x: pMinXyz.x, y: pMaxXyz.y, z: pMinXyz.z},
        {x: pMinXyz.x, y: pMaxXyz.y, z: pMaxXyz.z},
        {x: pMaxXyz.x, y: pMinXyz.y, z: pMinXyz.z},
        {x: pMaxXyz.x, y: pMinXyz.y, z: pMaxXyz.z},
        {x: pMaxXyz.x, y: pMaxXyz.y, z: pMinXyz.z},
        {x: pMaxXyz.x, y: pMaxXyz.y, z: pMaxXyz.z},
    ]

    return {
        id: id,
        points: cornerPoints
    };
}