// works with hex colors for now
function convertColorToCesiumColor(color) {
    let newColor =  {
        red: 0,
        green: 0,
        blue: 0,
        alpha: 1
    }

    let rgb = hexToRgb(color);
    newColor.red = rgb.r / 256;
    newColor.green = rgb.g / 256;
    newColor.blue = rgb.b / 256;
    
    return newColor;
}

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
}

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
                iterateRecursive(obj[key], func, params)
            }
        }
    } else if (typeof (arrOrObj) === "object") {
        let obj = arrOrObj;
        func(obj, params);
        for(let key in obj) {
            iterateRecursive(obj[key], func, params)
        }
    }
}

export { convertColorToCesiumColor, round, iterateRecursive };