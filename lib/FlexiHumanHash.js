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
        // this.transformMap = new Map();
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

    unhash(str, opts = {}) {
        if (typeof str !== "string") {
            throw new TypeError(`unhash: expected 'str' to be string, got: ${str}`);
        }

        this._unhashState = true;
        this._id = 0;
        this._bitChunks = [];
        this._words = getWords(str, this.format);

        this.templateFn(this.templateData);
        let ret = chunksToArray(this._bitChunks);

        delete this._unhashState;
        delete this._id;
        delete this._bitChunks;
        delete this._words;

        return ret;
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

    static registerDictionary(name, createFn) {
        // TODO: check args
        dictRegistry.set(name, createFn);
    }

    static registerTransform(name, transformFn, undoFn) {
        // TODO: check args
        transformRegistry.set(name, {transformFn, undoFn});
    }

    static getTransform(name) {
        return transformRegistry.get(name);
    }
}

function _handlebarHelper(name, ... args) {
    this._id++;
    // console.log("name", name);
    // console.log("args", require("util").inspect(args, {depth: null}));

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

    if (this._unhashState) {
        return _unhash.call(this, name, opts);
    }

    // console.log("looking up", name, opts);
    return _hash.call(this, name, opts);
}

function _create(name, opts) {
    // console.log("creating", name, opts);
    // TODO: check args
    let dictCreate = dictRegistry.get(name);
    if (!dictCreate) {
        throw new Error(`couldn't find dictionary: '${name}'`);
    }

    // create the new dictionary
    let newDict = dictCreate(opts);

    this.entropyBits += entropyBits(newDict.size);
    this.dictMap.set(this._id, newDict);
}

function _unhash(name, opts) {
    let dict = this.dictMap.get(this._id);
    let bits = entropyBits(dict.size);
    let rndMax = 2 ** bits;
    let word = this._words[this._id - 1];
    let value = dict.reverseLookup(word) % rndMax;
    if (value === -1) {
        throw new Error(`word not found while unhashing: ${word}`);
    }

    this._bitChunks.unshift({value, bits});
}

function _hash(name, opts) {
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
    return 1;
    // return Math.floor(Math.random() * 2);
}

function chunksToArray(arr) {
    let n = BigInt(0);
    arr.reverse();

    let totalBits = 0;
    arr.forEach((c) => {
        n = n << BigInt(c.bits);
        // console.log("value", BigInt(c.value).toString(16));
        n |= BigInt(c.value);
        // console.log("n", n.toString(16));
        totalBits += c.bits;
    });

    // pad to 8 bits
    n = n << BigInt(8 - (totalBits % 8));
    let totalBytes = Math.ceil(totalBits / 8);

    let ret = [];
    for (let i = 0; i < totalBytes; i++) {
        ret.unshift(Number(n & BigInt(0xFF)));
        n = BigInt(n) >> BigInt(8);
    }

    return ret;
}

function getNonWords(fmt) {
    // find any characters before words
    let startMatch = /(?<start>.*?){{/;
    let start = fmt.match(startMatch)?.groups.start;

    // find any characters after words
    let endMatch = /.*}}(?<end>.*)$/;
    let end = fmt.match(endMatch)?.groups.end;

    // find all the parts between words
    let part;
    let separators = [];
    let midMatch = /}}(?<separator>.+?){{/g;
    while ((part = midMatch.exec(fmt)) !== null)
    // console.log("part", part);
    {
        separators.push(part?.groups.separator);
    }

    // return all the pices
    return {start, end, separators};
}

function getWords(str, fmt) {
    // console.log("str", str);
    // console.log("fmt", fmt);
    if (fmt.match("}}{{")) {
        throw new Error(`no separator between words in format string '${fmt}', can't unhash`);
    }

    // get all the non-word pieces
    let parts = getNonWords(fmt);
    // console.log("parts", parts);

    // create a RegExp with all the separators and the word matcher
    let wordMatch = "(.+)";
    let regExpStr = wordMatch;

    parts.separators.forEach((s) => {
        regExpStr += regExpEscape(s) + wordMatch;
    });

    // add the start and end to the RegExp
    regExpStr = regExpEscape(parts.start) + regExpStr + regExpEscape(parts.end);
    // console.log("regExpStr", regExpStr);

    // create the RegExp and run it against the string
    let wordMatcher = new RegExp(regExpStr);
    let ret = str.match(wordMatcher);

    // get the words from the match
    let numMatches = parts.separators.length + 1;
    let words = ret.slice(1, numMatches + 1);

    // return the words
    return words;
}

function regExpEscape(str) {
    // console.log("regExpEscape before", str);
    regExpSpecialChars = ["\\", "^", "$", ".", "|", "?", "*", "+", "(", ")", "[", "{"];
    let regExpStr = regExpSpecialChars.map((c) => `\\${c}`).join("|");
    regExpStr = `(${regExpStr})`;
    // console.log(regExpStr);
    let charMatcher = new RegExp(regExpStr, "g");

    str = str.replace(charMatcher, (m, c) => `\\${c}`);

    // console.log("regExpEscape after", str);

    return str;
}

module.exports = FlexiHumanHash;
