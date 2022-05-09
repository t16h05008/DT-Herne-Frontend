// A worker that manages which tiles should be loaded in the viewer

importScripts("dependencies/txml/txml.min.js");

let subWorker;

//let cacheSize = 200;
let tiles;


onmessage = async function(e) {
    let data = e.data;
    // initialize
    if(data.event === "start") {
        console.log('worker started');
        cacheSize = data.cacheSize;
        tiles = data.tiles;
    }

    if(data.event === "povUpdated") {
        console.log('pov updated received');

        if(!tiles) {
            console.log("Worker not ready yet");
            return;
        }

        // If the sub-worker is still busy terminate it and spawn a new one
        if(subWorker) {
            console.log("Sub-worker is still busy. Aborting current processing and restarting.");
            subWorker.terminate();
        }

        subWorker = undefined;
        subWorker = new Worker(new URL("./tilesWebworker.js", import.meta.url));

        subWorker.postMessage({
            event: "startCalculation",
            tiles: tiles,
            viewRect: data.viewRect // the new view area
        });

        // Subworker is done. Pipe result to main thread
        subWorker.onmessage = function(e) {
            postMessage(e.data)
            subWorker.terminate();
            subWorker = undefined;
        }

    }
}




// The kml files might contain paths with .dae (collada) file extendsions.
// This happens sometimes and I couldn't figure out why that is, yet.
// Anyway, we replace the file extensions with .gltf
// TODO .gltb
function replaceFileExt(path) {
    if(path.endsWith(".dae")) {
        path = path.replace(new RegExp('.dae$'), '.gltf')
        return path;
    }
}


function combineFilePaths(tilePath, modelPath) {
    let tilePathTrimmed = tilePath.slice(0, tilePath.lastIndexOf("/")+1); // removes the .kml filename
    let result = tilePathTrimmed.concat(modelPath);
    return result;
}