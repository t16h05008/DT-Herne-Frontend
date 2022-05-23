// A worker that manages which features / 3D-Models etc. should be loaded in the viewer.
// It administrates a couple of subworkers, which do the real processing.

// subworkers
let buildingsWorker;
let sewersWorker

let buildingsTiles;
let sewerBboxes = {};


onmessage = async function(e) {
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
    
        let sewersReadyPromise = new Promise( (resolve, reject) => {
            let sewersPromise = Promise.all([
                fetch(backendBaseUrl + "sewers/shafts/points/bboxInfo"),
                fetch(backendBaseUrl + "sewers/shafts/lines/bboxInfo"),
                fetch(backendBaseUrl + "sewers/pipes/bboxInfo"),
            ]);
            sewersPromise.then(values => {
                let counter = 0;
                for(let resp of values) {
                    resp.json().then(data => {
                        sewerBboxes[data.collectionName] = data.bboxReferences;
                        counter ++;
                        if(counter === values.length)
                            resolve();
                    });
                }
            });
        })
    
        Promise.all([buildingsReadyPromise, sewersReadyPromise]).then(values => {
            console.log("dataLoadingManager initialized")
        });
    }

    if(data.event === "povUpdated") {
        console.log('pov updated received');

        if(!buildingsTiles || !sewerBboxes) {
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

        if(data.layersToUpdate.includes("sewerShaftsPoints") ||
            data.layersToUpdate.includes("sewerShaftsLines") ||
            data.layersToUpdate.includes("sewerPipes")) {

            // If the sub-worker is still busy terminate it and spawn a new one
            if(sewersWorker) {
                console.log("Sub-worker is still busy. Aborting current processing and restarting.");
                sewersWorker.terminate();
            }

            let layersToUpdate = [];
            if(data.layersToUpdate.includes("sewerShaftsPoints")) layersToUpdate.push("sewerShaftsPoints");
            if(data.layersToUpdate.includes("sewerShaftsLines")) layersToUpdate.push("sewerShaftsLines");
            if(data.layersToUpdate.includes("sewerPipes")) layersToUpdate.push("sewerPipes");

            sewersWorker = undefined;
            sewersWorker = new Worker(new URL("./sewersWorker.js", import.meta.url));

            sewersWorker.postMessage({
                event: "calculateEntitiesToShow",
                bboxes: sewerBboxes,
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