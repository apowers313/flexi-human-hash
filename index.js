import FlexiHumanHash from "./lib/FlexiHumanHash.js";
import FlexiArrayDict from "./lib/FlexiArrayDict.js";
import FlexiDict from "./lib/FlexiDict.js";
import RandomSource from "./lib/RandomSource.js";
import defaultDicts from "./lib/defaultDicts.js";
import defaultTransforms from "./lib/defaultTransforms.js";

// register default dictionaries
defaultDicts.forEach((d) => FlexiHumanHash.registerDictionary(d.name, d.createFn));
// register default transforms
defaultTransforms.forEach((t) => FlexiHumanHash.registerTransform(t.name, t.transformFn, t.undoFn));

export {
    FlexiHumanHash,
    FlexiArrayDict,
    FlexiDict,
    RandomSource,
};
