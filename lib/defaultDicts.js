const FlexiArrayDict = require("./FlexiArrayDict");

function nounDictCreate(opts) {
    return new FlexiArrayDict("noun", ["frog", "bear", "tree", "cat", "dog", "octopus"], opts);
}

function adjectiveDictCreate(opts) {
    return new FlexiArrayDict("adjective", ["sticky", "ugly", "nice"], opts);
}

function verbDictCreate(opts) {
    return new FlexiArrayDict("verb", ["running", "sitting", "sleeping"], opts);
}

module.exports = [
    {name: "noun", createFn: nounDictCreate},
    {name: "adjective", createFn: adjectiveDictCreate},
    {name: "verb", createFn: verbDictCreate},
];
