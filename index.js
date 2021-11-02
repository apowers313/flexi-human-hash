const FlexiHumanHash = require("./lib/FlexiHumanHash.js");
const FlexiArrayDict = require("./lib/FlexiArrayDict.js");
const FlexiDict = require("./lib/FlexiDict.js");
const RandomSource = require("./lib/RandomSource.js");

// register default dictionaries
require("./lib/defaultDicts").forEach((d) => FlexiHumanHash.registerDictionary(d.name, d.createFn));
// register default transforms
require("./lib/defaultTransforms").forEach((t) => FlexiHumanHash.registerTransform(t.name, t.transformFn, t.u));

module.exports = {
    FlexiHumanHash,
    FlexiArrayDict,
    FlexiDict,
    RandomSource,
};
