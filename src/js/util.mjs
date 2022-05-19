// A simple rounding method for utility.
// Not accurate in some edge cases
// e.g. round(1.005, 2) should be 1.01 but result is 1
function round(num, places) {
    let x = Math.pow(10, places)
    return Math.round(num * x) / x;
}

/*
Iterates an array of objects or an object and all nested arrays of objects.
Calls the given function on each object
*/
function iterateRecursive(arrOrObj, func, params) {
    if(Array.isArray(arrOrObj)) {
        let arr = arrOrObj
        for(let obj of arr) {
            func(obj, params);
            for(let key in obj) {
                // Don't want to iterate over these, only our own structure
                if(key !== "cesiumReference") {
                    iterateRecursive(obj[key], func, params)
                }
            }
        }
    } else if (typeof (arrOrObj) === "object") {
        let obj = arrOrObj;
        func(obj, params);
        for(let key in obj) {
            
            if(key !== "cesiumReference") {
                iterateRecursive(obj[key], func, params)
            }
            
        }
    }
}

export { round, iterateRecursive };