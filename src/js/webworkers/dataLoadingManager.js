// A worker that manages which features / 3D-Models etc. should be loaded in the viewer.
// It administrates a couple of subworkers, which do the real processing.

import proj4 from "proj4";

// subworkers
let buildingsWorker;

let buildingsTiles;

onmessage = function(e) {

    let data = e.data;
    // initialize
    // TODO promis.all is not needed anymore since sewer endpoints were removed
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

        Promise.all([buildingsReadyPromise]).then(values => {
            console.log("dataLoadingManager initialized")
        });
    }

    if(data.event === "povUpdated") {
        console.log('pov updated received');

        if(!buildingsTiles) {
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
    }
}