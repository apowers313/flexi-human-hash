const FlexiDict = require("./FlexiDict");

const fileCache = new Map();

class FlexiArrayDict extends FlexiDict {
    constructor(name, arr, opts = {}) {
        super(name, opts);

        this.dict = getDict(name, arr, opts);
    }
}

function getDict(name, arr, opts) {
    let minLength = opts["min-length"] ?? "x";
    let maxLength = opts["max-length"] ?? "x";
    let exactLength = opts["exact-length"] ?? "x";
    let cacheName = `${name}:${minLength}:${maxLength}:${exactLength}`;

    if (fileCache.has(cacheName)) {
        return fileCache.get(cacheName);
    }

    let dict = arr;
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

module.exports = FlexiArrayDict;

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

