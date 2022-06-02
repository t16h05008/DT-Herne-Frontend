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
    console.log(planes);
    for(let bbox of bboxes) {
        let insideOrIntersectingFrustum = false;
        for(let [idx, plane] of planes.entries()) {
            // TODO create all 8 bbox points from pMin and pMax and check them. Checking pMin and pMax is not enough in some cases
            let distanceP1; // pMin
            let distanceP2; // pMax
            distanceP1 =  calcDotProduct(plane.normal, bbox.epsg4978.pMin) + plane.distance;
            distanceP2 = calcDotProduct(plane.normal, bbox.epsg4978.pMax) + plane.distance;
            if(distanceP1 > 0 || distanceP2 > 0) {
                // Both on same side as normal vector or intersecting plane
                // Do nothing unless it is the last plane
                if(idx === planes.length-1) {
                    // Only true if all planes are okay, otherwise the loop ends early.
                    insideOrIntersectingFrustum = true;
                }
            } else {
                // Both points outside one frustum plane --> outside frustum
                insideOrIntersectingFrustum = false;
                break;
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