// A worker that manages which features / 3D-Models etc. should be loaded in the viewer.
// It administrates a couple of subworkers, which do the real processing.

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
        backendBaseUrl = data.backendBaseUrl
        let buildingsReadyPromise = new Promise( (resolve, reject) => {
            // send requests
            let buildingsPromise = fetch(backendBaseUrl + "buildings/tilesInfo");
            buildingsPromise.then(response => response.json()).then(data => {
                buildingsTiles = data;
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
    lon = feature.geometry.coordinates[0];
    lat = feature.geometry.coordinates[1];
    z = feature.geometry.coordinates[2];
    id = feature.properties["id"];
    heightTop = feature.properties["Deckelhöhe"];
    heightBottom = feature.properties["Sohlhöhe"];
    let heightDiff = heightTop - heightBottom;
    // A vertical line representing the shaft height. First point is bottom, second is top.
    return {
        id: id,
        pMin: {
            lon: lon,
            lat: lat,
            z: z - heightDiff 
        },
        pMax: {
            lon: lon,
            lat: lat,
            z: z
        }
    };
}

function calculateSewerPipeBBox(feature) {
    let id = feature.properties["id"];
    let pMin = {
        lon: feature.geometry.coordinates[0][0],
        lat: feature.geometry.coordinates[0][1],
        z:feature.geometry.coordinates[0][2]
    }
    let pMax = {
        lon: feature.geometry.coordinates[0][0],
        lat: feature.geometry.coordinates[0][1],
        z:feature.geometry.coordinates[0][2]
    }

    for(let coord of feature.geometry.coordinates) {
        let lon = coord[0];
        let lat = coord[1];
        let z = coord[2];

        pMin.lon = (lon < pMin.lon) && lon;
        pMin.lat = (lon < pMin.lat) && lat;
        pMin.z = (lon < pMin.z) && z;
        pMax.lon = (lon > pMax.lon) && lon;
        pMax.lat = (lon > pMax.lat) && lat;
        pMax.z = (lon > pMax.z) && z;
    }
    
    return {
        id: id,
        pMin: pMin,
        pMax: pMax
    };
}