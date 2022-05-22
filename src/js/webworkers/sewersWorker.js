// Couldn't figure out how to import only part of turf
import * as turf from "@turf/turf";

// maps the layer names to the corresponding collections
const layerCollectionMap = {
    sewerShaftsPoints: "sewers.shafts.points",
    sewerShaftsLines: "sewers.shafts.lines",
    sewerPipes: "sewers.pipes"
}

onmessage = function(e) {
    let data = e.data;
    if(data.event === "calculateEntitiesToShow") {
        let workerResult = {};
        for(let layer of data.layersToUpdate) {
            workerResult[layer] = [];
            // get collection name
            let collection = layerCollectionMap[layer]
            let bboxesToCheck = data.bboxes[collection];
            let ids = calculateEntitiesToShow(data.viewRect, bboxesToCheck)
            workerResult[layer] = ids;
        }
        postMessage(workerResult);
    }
}

/**
 * Returns an array of string containing the intersecting entities ids
 * @param {*} viewRect 
 */
 function calculateEntitiesToShow(viewRect, bboxes) {
    // Iterate tiles and check if they intersect with the view rectangle.
    let result = [];
    for(let [key, bbox] of Object.entries(bboxes)) {
        // Intersection check is done with turf, which needs two polygons.
        // counter-clockwise
        let viewRectAsPoly = turf.polygon([[
            [viewRect.west, viewRect.south], // bot left
            [viewRect.east, viewRect.south], // bot right
            [viewRect.east, viewRect.north], // top right
            [viewRect.west, viewRect.north], // top left
            [viewRect.west, viewRect.south] // bot right again
        ]]);
        // bbox is in 3d and has two 3d-points (pMin and pMax)

        let bboxExtentAsPoly = turf.polygon([[
            [bbox.pMin[0], bbox.pMin[1]],
            [bbox.pMax[0], bbox.pMin[1]],
            [bbox.pMax[0], bbox.pMax[1]],
            [bbox.pMin[0], bbox.pMax[1]],
            [bbox.pMin[0], bbox.pMin[1]]
        ]]);

        let intersects = turf.booleanIntersects(viewRectAsPoly, bboxExtentAsPoly);
        if(intersects) {
            result.push(parseInt(key));
        }
    }
    return result;
}