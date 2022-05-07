// Couldn't figure out how to import only part of turf
import * as turf from "@turf/turf";

onmessage = function(e) {
    let data = e.data;
    if(data.event === "startCalculation") {
        let tileNames = calculateTilesToShow(data.viewRect, data.tiles);
        let tilesToShow = data.tiles.filter( (tile) => {
            return tileNames.includes(tile.name);
        });
        // The main thread only needs the entities
        let workerResult = [];
        for(let tile of tilesToShow) {
            workerResult = workerResult.concat(tile.entities);
        }
        postMessage(workerResult);
    }
}

/**
 * Returns an array of string containing the intersecting tile names
 * @param {*} viewRect 
 */
 function calculateTilesToShow(viewRect, tiles) {
    // Iterate tiles and check if they intersect with the view rectangle.
    let result = [];
    for(let tile of tiles) {
        // Intersection check is done with turf, which needs two polygons.
        // counter-clockwise
        let viewRectAsPoly = turf.polygon([[
            [viewRect.west, viewRect.south], // bot left
            [viewRect.east, viewRect.south], // bot right
            [viewRect.east, viewRect.north], // top right
            [viewRect.west, viewRect.north], // top left
            [viewRect.west, viewRect.south] // bot right again
        ]]);
        let tileExtentAsPoly = turf.polygon([[
            [tile.extent.west, tile.extent.south],
            [tile.extent.east, tile.extent.south],
            [tile.extent.east, tile.extent.north],
            [tile.extent.west, tile.extent.north],
            [tile.extent.west, tile.extent.south]
        ]]);

        let intersects = turf.booleanIntersects(viewRectAsPoly, tileExtentAsPoly);
        if(intersects) {
            result.push(tile.name)
        }
    }
    return result;
}