// Couldn't figure out how to import only part of turf
import * as turf from "@turf/turf";

onmessage = function(e) {
    let data = e.data;
    if(data.event === "calculateEntitiesToShow") {
        let workerResult = {};
        for(let layer of data.layersToUpdate) {
            workerResult[layer] = [];
            let type = layer.replace("sewer", "")
            type = type.toLowerCase()
            let ids = calculateEntitiesToShow(data.viewRect, data.sewersBboxes[type])
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
    for(let bbox of bboxes) {
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
            [bbox.pMin.lon, bbox.pMin.lat],
            [bbox.pMax.lon, bbox.pMin.lat],
            [bbox.pMax.lon, bbox.pMax.lat],
            [bbox.pMin.lon, bbox.pMax.lat],
            [bbox.pMin.lon, bbox.pMin.lat]
        ]]);

        let intersects = turf.booleanIntersects(viewRectAsPoly, bboxExtentAsPoly);
        if(intersects) {
            result.push(parseInt(bbox.id));
        }
    }
    return result;
}