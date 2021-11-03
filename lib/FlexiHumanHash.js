const Handlebars = require("handlebars");
let RandomSource = require("./RandomSource");

const dictRegistry = new Map();
const transformRegistry = new Map();

class FlexiHumanHash {
    constructor(fmt, opts = {}) {
        if (typeof fmt !== "string") {
            throw new TypeError(`FlexiHumanHash.constructor: expected 'fmt' to be string, got: ${fmt}`);
        }

        this.handlebars = Handlebars.create();
        this.format = fmt;
        this.templateFn = this.handlebars.compile(fmt);
        this.dictMap = new Map();
        this.transformMap = new Map();
        this.opts = opts;
        this.entropyBits = 0;
        [... dictRegistry.keys()].forEach((name) => {
            this.handlebars.registerHelper(name, _handlebarHelper.bind(this, name));
        });

        this._createState = true;

        // build the dictionaries based on the format
        this.templateData = {};
        this._id = 0;
        [... transformRegistry.keys()].forEach((key) => {
            this.templateData[key] = key;
        });
        this.templateFn(this.templateData);
        delete this._createState;
        delete this._id;
    }

    hash(data, opts = {}) {
        this._currentData = new RandomSource(data, opts);
        this._id = 0;
        let ret = this.templateFn(this.templateData);
        delete this._currentData;
        delete this._id;
        return ret;
    }

    addTransform(name, opts = {}) {
        // TODO: check args
        this.transformMap.set(name, opts);
    }

    addDefaultTransforms() {
        // TODO: check args
    }

    static registerDictionary(name, createFn) {
        // TODO: check args
        dictRegistry.set(name, createFn);
    }

    static registerTransform(name, transformFn, undoFn) {
        // TODO: check args
        transformRegistry.set(name, {transformFn, undoFn});
    }

    /**
     * Returns the number of possible random combinations as a [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
     *
     * @returns {bigint} The number of possible combinations for the given format string. Note that the power will always be a power of 2 since entropy is based on bits.
     */
    get entropy() {
        return BigInt(2) ** BigInt(this.entropyBits);
    }

    /**
     * Returns the number of bits of entropy for the given format string. Useful for calculating collision probability for hashes.
     *
     * @returns {number} The number of bits that describes the entropy of the specified format. For example, if the format string has 8 total random combinations, the result would be 3 (2^3 = 8)
     */
    get entropyBase2() {
        return this.entropyBits;
    }

    /**
     * Returns the log10 of the number of combinations for the given format string. Useful for calculating collision probability for hashes.
     *
     * @returns {number} Returns the entropy as a power of 10. For example, if the format string has 1000 random combinations, the result would be 2 (10^2 = 1000)
     */
    get entropyBase10() {
        return this.entropy.toString().length;
    }
}

function _handlebarHelper(name, ... args) {
    this._id++;

    // build options
    let handlebarsOpts = args.pop();
    let opts = {args};
    Object.keys(handlebarsOpts.hash).forEach((k) => {
        opts[k] = handlebarsOpts.hash[k];
    });
    // console.log("_handlebarHelper opts", opts);

    // constructing a new format, create dictionaries and return
    if (this._createState) {
        return _create.call(this, name, opts);
    }

    // console.log("looking up", name, opts);

    // get random word from the dictionary
    let dict = this.dictMap.get(this._id);
    let dictEntry = _calcEntry(this._currentData, dict.size);
    let word = dict.getEntry(dictEntry, opts);
    opts.args.forEach((a) => {
        if (transformRegistry.has(a)) {
            word = transformRegistry.get(a).transformFn(word, opts);
        }
    });

    return new Handlebars.SafeString(word);
}

function _create(name, opts) {
    // console.log("creating", name, opts);
    // TODO: check args
    let dictCreate = dictRegistry.get(name);
    if (!dictCreate) {
        throw new Error(`couldn't find dictionary: '${name}'`);
    }

    let newDict = dictCreate(opts);
    this.entropyBits += entropyBits(newDict.size);
    this.dictMap.set(this._id, newDict);
}

// function weakRandom(max) {
//     return Math.floor(Math.random() * max);
// }

function _calcEntry(rndSrc, dictSz) {
    let numBits = entropyBits(dictSz);
    let rndMax = 2 ** numBits;
    let overflowEntries = dictSz % rndMax;
    let rndIndex = rndSrc.get(numBits);

    // dictionary size must be less than the maximum random number to ensure reversability
    // which means we will never get to the entries in the back of the dictionary
    // this randomly picks from the beginning of the dictionary or the unreachable part of
    // the dictionary, to preserve reversability
    //
    // don't worry that flipCoin() isn't cryptographically secure, since it's just picking
    // a word to display
    //
    // for example:
    // rndMax = 16; dictSz = 20
    // overflowEntries = 20 % 16 = 4
    // rndIndex = 2
    // if (2 < 4 and flipCoin = 1) rndIndex += 16 = 18
    // else rndIndex = 2
    //
    // please note this screws with the distribution of selecting words in the overlap parts
    // of the dictionary. normally, selection of any word would be equally likely but now the
    // overlap parts of the dictionary are 50% less likely... oh well, it's just the human
    // part of the display
    if (rndIndex < overflowEntries && flipCoin()) {
        rndIndex += rndMax;
    }

    return rndIndex;
}

function entropyBits(sz) {
    return Math.floor(Math.log2(sz));
}

function entropyBase10(sz) {
    return Math.floor(Math.log10(sz));
}

function flipCoin() {
    return Math.floor(Math.random() * 2);
}

module.exports = FlexiHumanHash;
