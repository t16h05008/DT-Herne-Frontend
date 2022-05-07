// A worker that manages which tiles should be loaded in the viewer

importScripts("dependencies/txml/txml.min.js");


const workerState = {
    isInitialized: false,
    isBusy: false
}
let subWorker;

let cacheSize = 200;

let tiles = [
/*
    example:
    {
        name: "bahnhofstrasse_Tile_0_6",
        extent: {
            east: "7.225524623636661",
            north: "51.53807303162008",
            south: "51.537007721392065",
            west: "7.223917734104503"
        },
        pathToTileKml: "Tiles/1/5/bahnhofstrasse_Tile_1_5_collada.kml" // relative
        entities: [
            {
                name: _Bahnhofstrasse53-1_BD.scwVaNciA9DrBK2a8BQg,
                location: {
                    longitude: "7.2217331",
                    latitude: "51.5410184",
                    altitude: "0.0"
                },
                orientation: {
                    heading: "358.6091396"
                },
                pathToModel: "18632/_Bahnhofstrasse53-1_BD.scwVaNciA9DrBK2a8BQg.gltf",
                pathToModelAbsolute: "Tiles/1/5/18632/_Bahnhofstrasse53-1_BD.scwVaNciA9DrBK2a8BQg.gltf"
            },
            {
                ...
            }
        ]
    }
*/
]


onmessage = async function(e) {
    let data = e.data;
    // initialize
    if(data.event === "start") {
        console.log('worker started');
        maxNumberOfShownTiles = data.maxNumberOfShownTiles;
        tiles = await prepareTiles();
        workerState.isInitialized = true;
        console.log(tiles)
    }

    if(data.event === "povUpdated") {
        console.log('pov updated received');
        if(!workerState.isInitialized) {
            console.log("worker not ready yet.");
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


async function prepareTiles() {
    //TODO folder name is hardcoded
    // get the list of available tiles (only the ones that have content)
    let response = await fetch ("../glTf_Bahnhofstr/bahnhofstrasse.kml");
    let data = await response.text();
    let parsed = txml.simplify(txml.parse(data));
    let folders = parsed.kml.Document.Folder;
    let tiles = [];
    for(let folder of folders) {
        let tile =  {
            name: folder.name,
            extent: {
                east: parseFloat(folder.NetworkLink.Region.LatLonAltBox.east),
                west: parseFloat(folder.NetworkLink.Region.LatLonAltBox.west),
                north: parseFloat(folder.NetworkLink.Region.LatLonAltBox.north),
                south: parseFloat(folder.NetworkLink.Region.LatLonAltBox.south)
            },
            pathToTileKml: "/glTf_Bahnhofstr/" + folder.NetworkLink.Link.href
        }
        tiles.push(tile);
    };
    // now recursively go into each tile and read the tile kml file to get the model information
    for(let tile of tiles) {
        let response = await fetch (tile.pathToTileKml);
        let data = await response.text();
        let parsed = txml.simplify(txml.parse(data));
        let entities = parsed.kml.Document.Placemark;
        tile.entities = []; // stores the entities in this tile.

        // Creates an entity object and stores it to tile.
        // (Needed multiple times so we make a function)
        function createEntity(parsed) {
            let relModelPath = replaceFileExt(parsed.Model.Link.href);
            return {
                name: parsed.name,
                pathToModel: relModelPath,
                pathToModelAbsolute: combineFilePaths(tile.pathToTileKml, relModelPath),
                location: parsed.Model.Location, // TODO parseFloat
                orientation: parsed.Model.Orientation
            }
        }

        // entities is an array if there are multiple, and an object if the tile only contains one building
        if(entities.length >= 1) {
            for(let parsedEntity of entities) {
                let entity = createEntity(parsedEntity);
                tile.entities.push(entity)
            }
        } else {
            let entity = entities;
            tile.entities.push( createEntity(entity) );
        }
    }

    return tiles;
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