import FlexiDict from "./FlexiDict.js";

const fileCache = new Map();

class FlexiArrayDict extends FlexiDict {
    constructor(name, arr, opts = {}) {
        super(name, opts);

        this.dict = getDict(name, arr, opts);
        this.doTransforms();
    }
}

function getDict(name, arr, opts) {
    // calculate options
    const minLength = opts["min-length"] ?? "x";
    const maxLength = opts["max-length"] ?? "x";
    const exactLength = opts["exact-length"] ?? "x";

    // calculate cache name
    const args = opts.args.join(":");
    const cacheName = `${name}:${minLength}:${maxLength}:${exactLength}:${args}`;

    if (fileCache.has(cacheName)) {
        return fileCache.get(cacheName);
    }

    // duplicate array
    let dict = arr.slice();
    if (minLength !== "x") {
        dict = minLengthFilter(dict, minLength);
    }

    if (maxLength !== "x") {
        dict = maxLengthFilter(dict, maxLength);
    }

    if (exactLength !== "x") {
        dict = exactLengthFilter(dict, exactLength);
    }

    fileCache.set(cacheName, dict);
    return dict;
}

function minLengthFilter(dict, len) {
    return dict.filter((w) => w.length >= len);
}

function maxLengthFilter(dict, len) {
    return dict.filter((w) => w.length <= len);
}

function exactLengthFilter(dict, len) {
    return dict.filter((w) => w.length === len);
}

export default FlexiArrayDict;

// const FlexiDict = require("./FlexiDict");

// const fileCache = new Map();

// class FlexiArrayDict extends FlexiDict {
//     constructor(name, arr, opts = {}) {
//         super(name, opts);

//         this.dict = getDict(name, arr, opts);
//     }

//     getEntry(n, opts) {
//         let cacheName = _createCacheName(this.name, opts);
//         console.log("cacheName", cacheName);
//         let dict = fileCache.get(cacheName);
//         console.log("dict", dict);
//         return dict[n];
//     }
// }

// function getDict(name, arr, opts) {
//     let cacheName = _createCacheName(name, opts);
//     console.log("cacheName", cacheName);

//     if (fileCache.has(cacheName)) {
//         return fileCache.get(cacheName);
//     }

//     let dict = arr;
//     if (opts["min-length"] !== undefined) {
//         dict = minLengthFilter(dict, opts["min-length"]);
//     }

//     if (opts["max-length"] !== undefined) {
//         dict = maxLengthFilter(dict, opts["max-length"]);
//     }

//     if (opts["exact-length"] !== undefined) {
//         dict = exactLengthFilter(dict, opts["exact-length"]);
//     }

//     fileCache.set(cacheName, dict);
//     return dict;
// }

// function minLengthFilter(dict, len) {
//     return dict.filter((w) => w.length >= len);
// }

// function maxLengthFilter(dict, len) {
//     return dict.filter((w) => w.length <= len);
// }

// function exactLengthFilter(dict, len) {
//     return dict.filter((w) => w.length === len);
// }

// function _createCacheName(name, opts) {
//     let minLength = opts["min-length"] ?? "x";
//     let maxLength = opts["max-length"] ?? "x";
//     let exactLength = opts["exact-length"] ?? "x";
//     let cacheName = `${name}:${minLength}:${maxLength}:${exactLength}`;
//     return cacheName;
// }

// module.exports = FlexiArrayDict;

