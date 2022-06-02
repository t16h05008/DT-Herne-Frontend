onmessage = function(e) {
    let data = e.data;
    if(data.event === "calculateEntitiesToShow") {
        let workerResult = {};
        for(let layer of data.layersToUpdate) {
            workerResult[layer] = [];
            let type = layer.replace("sewer", "")
            type = type.toLowerCase()
            let ids = calculateEntitiesToShow(data.frustumPlanes, data.sewersBboxes[type])
            workerResult[layer] = ids;
        }
        postMessage(workerResult);
    }
}

/**
 * Returns an array of string containing the intersecting entities ids
 * @param {*} viewRect 
 */
 function calculateEntitiesToShow(planes, bboxes) {
    // Iterate tiles and check if they intersect with the view rectangle.
    let result = [];
    for(let bbox of bboxes) {
        let insideOrIntersectingFrustum = false;
        for(let [i, plane] of planes.entries()) {
            let positiveDistanceFound = false;
            for(let [j, point] of bbox.points.entries()) {
                let distance = calcDotProduct(plane.normal, point) + plane.distance;
                if(distance > 0) {
                    positiveDistanceFound = true;
                    break; // Point is in view
                }
            }
            if(!positiveDistanceFound) {
                break; // All points outside at least one plane
            }

            // Only reached if positiveDistanceFound is true for all planes
            if(i == planes.length-1) {
                insideOrIntersectingFrustum = true;
            }
        }

        if(insideOrIntersectingFrustum) {
            result.push(parseInt(bbox.id))
        }
    }
    console.log(result);
    return result;
}


function calcDotProduct(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z 
}