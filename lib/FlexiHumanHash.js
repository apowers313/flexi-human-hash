import Handlebars from "handlebars";
import RandomSource from "./RandomSource.js";

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
        this.opts = opts;
        this.entropyBits = 0;
        this._unhashValidated = null; // null = not checked, true = valid, string = error message
        this._dictTransforms = new Map(); // maps dict id to transform names

        [... dictRegistry.keys()].forEach((name) => {
            this.handlebars.registerHelper(name, _handlebarHelper.bind(this, name));
        });

        this._createState = true;
        this._unhashSafeDicts = opts.unhashSafeDicts || false;

        // build the dictionaries based on the format
        this.templateData = {};
        this._id = 0;
        [... transformRegistry.keys()].forEach((key) => {
            this.templateData[key] = key;
        });

        this.templateFn(this.templateData);

        delete this._createState;
        delete this._id;
        delete this._unhashSafeDicts;

        // Validate unhash capability if requested
        if (opts.validateUnhash) {
            const validationResult = this._validateUnhashability();
            if (validationResult !== true) {
                throw new Error(`Format is not unhashable: ${validationResult}`);
            }
        }
    }

    hash(data, opts = {}) {
        this._currentData = new RandomSource(data, opts);
        this._id = 0;

        const ret = this.templateFn(this.templateData);

        delete this._currentData;
        delete this._id;

        return ret;
    }

    unhash(str, _opts = {}) {
        if (typeof str !== "string") {
            throw new TypeError(`unhash: expected 'str' to be string, got: ${str}`);
        }

        // Lazy validation - only check once and cache the result
        if (this._unhashValidated === null) {
            this._unhashValidated = this._validateUnhashability();
        }

        if (this._unhashValidated !== true) {
            throw new Error(`Format is not unhashable: ${this._unhashValidated}`);
        }

        // Get format parts for parsing
        const parts = getNonWords(this.format);

        // Try simple separator-based parsing first
        let words = null;
        let useBacktracking = false;

        try {
            words = getWords(str, this.format);
            // Validate that all words exist in their dictionaries
            const validationResult = this._validateParsedWords(words);
            if (!validationResult.valid) {
                useBacktracking = true;
            }
        } catch {
            useBacktracking = true;
        }

        // If simple parsing failed, try backtracking parser
        if (useBacktracking) {
            words = this._backtrackingParse(str, parts);
            if (words === null) {
                throw new Error(`Unable to parse string for unhashing: "${str}". Verify the string was produced by hash() with this same format and hasn't been modified`);
            }
        }

        this._unhashState = true;
        this._id = 0;
        this._bitChunks = [];
        this._words = words;

        this.templateFn(this.templateData);
        const ret = chunksToArray(this._bitChunks);

        delete this._unhashState;
        delete this._id;
        delete this._bitChunks;
        delete this._words;

        return ret;
    }

    /**
     * Validates whether this format can be unhashed.
     * Returns true if valid, or an error message string if not.
     * @returns {true|string}
     */
    _validateUnhashability() {
        // Check 1: Adjacent words with no separator
        if (this.format.match("}}{{")) {
            return "no separator between words in format string. Add a separator character (like '_' or ':') between dictionary placeholders";
        }

        // Check 2: Get all separators and check for issues
        const parts = getNonWords(this.format);
        const allSeparators = [parts.start, ...parts.separators, parts.end].filter(s => s && s.length > 0);

        // Check 3: Empty separator between words (different from start/end)
        for (const sep of parts.separators) {
            if (sep === "") {
                return "empty separator between words. Add a separator character (like '_' or ':') between dictionary placeholders";
            }
        }

        // Check 4: Check if any dictionary word contains any separator
        // This would make parsing ambiguous
        const separatorChars = new Set();
        allSeparators.forEach(sep => {
            if (sep) {
                for (const char of sep) {
                    separatorChars.add(char);
                }
            }
        });

        // Check each dictionary for words containing separator characters
        for (const [_id, dict] of this.dictMap) {
            // Skip computed dictionaries (decimal, hex) - they have predictable formats
            if (typeof dict.isComputed === "function" && dict.isComputed()) {
                continue;
            }

            // For array-backed dictionaries, check all words
            for (let i = 0; i < dict.size; i++) {
                let word = dict.getEntry(i);

                // Validate and coerce word to string
                if (word === undefined || word === null) {
                    return `dictionary entry at index ${i} is ${word}. All entries must be valid strings.`;
                }
                if (typeof word !== "string") {
                    // Coerce to string for validation
                    word = String(word);
                }

                for (const sep of allSeparators) {
                    if (sep && word.includes(sep)) {
                        return `dictionary word "${word}" contains separator "${sep}". Use a different separator that doesn't appear in dictionary words (try '_', ':', or '|')`;
                    }
                }
            }
        }

        // Check 5: Verify all transforms have undo functions
        for (const [_id, transformNames] of this._dictTransforms) {
            for (const name of transformNames) {
                const transform = transformRegistry.get(name);
                if (transform && !transform.undoFn) {
                    return `transform "${name}" does not have an undo function. Register the transform with an undoFn: FlexiHumanHash.registerTransform("${name}", transformFn, undoFn)`;
                }
            }
        }

        // Check 6: Check for duplicate entries in dictionaries (case-insensitive)
        // Duplicates would cause unhash to return wrong values
        for (const [_id, dict] of this.dictMap) {
            // Skip computed dictionaries (decimal, hex) - they have predictable formats
            if (typeof dict.isComputed === "function" && dict.isComputed()) {
                continue;
            }

            const seen = new Map(); // normalized entry -> original entry
            for (let i = 0; i < dict.size; i++) {
                let word = dict.getEntry(i);

                // Skip undefined/null (already caught above, but be safe)
                if (word === undefined || word === null) {
                    continue;
                }
                // Coerce to string if needed
                if (typeof word !== "string") {
                    word = String(word);
                }

                // Normalize: remove separators and lowercase for comparison
                const normalized = word.replace(/[\s\-_]/g, "").toLowerCase();

                if (seen.has(normalized)) {
                    const original = seen.get(normalized);
                    return `dictionary contains duplicate entries: "${original}" and "${word}" both normalize to "${normalized}". Use unhashSafeDicts option to automatically deduplicate, or remove duplicates from your dictionary`;
                }
                seen.set(normalized, word);
            }
        }

        return true;
    }

    /**
     * Validates that parsed words exist in their respective dictionaries.
     * @param {string[]} words - Array of words to validate
     * @returns {{valid: boolean, failedIndex?: number}}
     */
    _validateParsedWords(words) {
        let id = 0;
        for (const word of words) {
            id++;
            const dict = this.dictMap.get(id);

            // For array-backed dicts, transforms are pre-applied
            // For computed dicts, reverseLookup handles the value directly
            const idx = dict.reverseLookup(word);
            if (idx === -1) {
                return { valid: false, failedIndex: id };
            }
        }
        return { valid: true };
    }

    /**
     * Backtracking parser for ambiguous formats.
     * Tries to find a valid way to split the string into dictionary words.
     * @param {string} str - The string to parse
     * @param {object} parts - Format parts from getNonWords()
     * @returns {string[]|null} - Array of words or null if no valid parsing found
     */
    _backtrackingParse(str, parts) {
        const numDicts = this.dictMap.size;
        const separators = parts.separators;

        // Strip prefix if present
        let workStr = str;
        if (parts.start && parts.start.length > 0) {
            if (!workStr.startsWith(parts.start)) {
                return null;
            }
            workStr = workStr.slice(parts.start.length);
        }

        // Strip suffix if present
        if (parts.end && parts.end.length > 0) {
            if (!workStr.endsWith(parts.end)) {
                return null;
            }
            workStr = workStr.slice(0, -parts.end.length);
        }

        // Recursive backtracking search
        const search = (pos, dictIdx, words) => {
            // Base case: processed all dictionaries
            if (dictIdx >= numDicts) {
                return pos === workStr.length ? words : null;
            }

            const dict = this.dictMap.get(dictIdx + 1);
            const separator = separators[dictIdx] || "";
            const isLast = dictIdx === numDicts - 1;

            // Get max word length in dictionary for optimization
            const maxWordLen = dict.maxWordLength || 100;

            // Try all possible word lengths (shortest to longest for faster termination)
            for (let endPos = pos + 1; endPos <= workStr.length && endPos <= pos + maxWordLen; endPos++) {
                const candidateWord = workStr.slice(pos, endPos);
                const remaining = workStr.slice(endPos);

                // Check if separator follows (or we're at end for last word)
                let separatorOK = false;
                if (isLast) {
                    separatorOK = remaining === "";
                } else {
                    separatorOK = remaining.startsWith(separator);
                }

                if (!separatorOK) {
                    continue;
                }

                // For array-backed dicts, transforms are pre-applied to the entries
                // For computed dicts, reverseLookup handles the value directly
                const idx = dict.reverseLookup(candidateWord);
                if (idx !== -1) {
                    const newPos = isLast ? endPos : endPos + separator.length;
                    const result = search(newPos, dictIdx + 1, [...words, candidateWord]);
                    if (result !== null) {
                        return result;
                    }
                }
            }

            return null;
        };

        return search(0, 0, []);
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

    static registerDictionary(name, createFn, opts = {}) {
        // TODO: check args
        dictRegistry.set(name, {createFn, opts});
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
    const handlebarsOpts = args.pop();
    const opts = {args};
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
    const dictEntry = dictRegistry.get(name);
    if (!dictEntry) {
        throw new Error(`couldn't find dictionary: '${name}'`);
    }

    // merge registration options with template options
    const {createFn, opts: registrationOpts = {}} = dictEntry;
    const mergedOpts = {...opts, ...registrationOpts};

    // apply unhashSafeDicts from format options if set
    if (this._unhashSafeDicts) {
        mergedOpts.unhashSafe = true;
    }

    // create the new dictionary
    const newDict = createFn(mergedOpts);

    // Validate dictionary size
    const size = newDict.size;
    if (typeof size !== "number" || !Number.isFinite(size)) {
        throw new Error(`Dictionary "${name}" has invalid size: ${size}. Size must be a finite number.`);
    }
    if (!Number.isInteger(size)) {
        throw new Error(`Dictionary "${name}" has non-integer size: ${size}. Size must be an integer.`);
    }
    if (size <= 0) {
        throw new Error(`Dictionary "${name}" has no entries (size=${size}). Check that your dictionary has words and that any filters (like exact-length) don't exclude all entries.`);
    }

    this.entropyBits += entropyBits(size);
    this.dictMap.set(this._id, newDict);

    // Store transform names for this dictionary (needed for unhashing)
    const transformNames = opts.args.filter(a => transformRegistry.has(a));
    this._dictTransforms.set(this._id, transformNames);
}

function _unhash(_name, _opts) {
    const dict = this.dictMap.get(this._id);
    const word = this._words[this._id - 1];

    // For array-backed dictionaries, transforms are pre-applied to the dict entries
    // So we look up the word as-is (already transformed)
    // For computed dicts (decimal/hex), reverseLookup handles the value directly
    const rawValue = dict.reverseLookup(word);

    // Validate reverseLookup returned an integer
    if (typeof rawValue !== "number" || !Number.isInteger(rawValue)) {
        throw new Error(`Dictionary reverseLookup returned non-integer value ${rawValue} for word "${word}". reverseLookup must return an integer index.`);
    }

    // Check for "not found" (-1) or any negative value
    if (rawValue < 0) {
        throw new Error(`word not found while unhashing: "${word}". This word is not in the expected dictionary. Verify the string was produced by hash() with this same format`);
    }

    // Validate index is within dictionary bounds
    if (rawValue >= dict.size) {
        throw new Error(`Dictionary reverseLookup returned out-of-range index ${rawValue} for word "${word}" (dictionary size is ${dict.size}). reverseLookup must return a value in range [0, size).`);
    }

    // Store the value and dictionary size for divmod-based reconstruction
    this._bitChunks.unshift({value: rawValue, size: dict.size});
}

function _hash(name, opts) {
    // get random word from the dictionary
    const dict = this.dictMap.get(this._id);
    const dictEntry = _calcEntry(this._currentData, dict.size);
    let word = dict.getEntry(dictEntry, opts);

    // Validate getEntry returned a valid value
    if (word === undefined) {
        throw new Error(`Dictionary "${name}" getEntry(${dictEntry}) returned undefined. All indices from 0 to size-1 must return valid entries.`);
    }
    if (word === null) {
        throw new Error(`Dictionary "${name}" getEntry(${dictEntry}) returned null. All indices from 0 to size-1 must return valid entries.`);
    }
    if (typeof word === "symbol") {
        throw new Error(`Dictionary "${name}" getEntry(${dictEntry}) returned a Symbol. getEntry must return a string.`);
    }
    if (typeof word === "object" && word !== null) {
        // Check for Promise
        if (typeof word.then === "function") {
            throw new Error(`Dictionary "${name}" getEntry(${dictEntry}) returned a Promise. getEntry must return a string synchronously, not a Promise.`);
        }
        // Coerce other objects to string with warning
        console.warn(`Dictionary "${name}" getEntry(${dictEntry}) returned object instead of string. Coercing to string.`);
        word = String(word);
    }
    // Coerce numbers and other primitives to string
    if (typeof word !== "string") {
        word = String(word);
    }

    opts.args.forEach((a) => {
        if (transformRegistry.has(a)) {
            const result = transformRegistry.get(a).transformFn(word, opts);
            // Coerce to string if transform returned non-string
            word = typeof result === "string" ? result : String(result);
        }
    });

    return new Handlebars.SafeString(word);
}

function _calcEntry(rndSrc, dictSz) {
    // Use divmod-based extraction from the Python implementation.
    // This approach:
    // - Uses ALL dictionary entries (no wasted overflow entries)
    // - Is completely deterministic
    // - Works with any dictionary size, not just powers of 2
    return rndSrc.getMax(dictSz);
}

function entropyBits(sz) {
    return Math.floor(Math.log2(sz));
}

function _entropyBase10(sz) {
    return Math.floor(Math.log10(sz));
}

function chunksToArray(arr) {
    // Reconstruct the big number using multiply+add (reverse of divmod extraction)
    //
    // During hash with bigNum = X:
    //   getMax(s1): i1 = X % s1;  bigNum = X / s1
    //   getMax(s2): i2 = (X/s1) % s2;  bigNum = X / (s1*s2)
    //   getMax(s3): i3 = (X/(s1*s2)) % s3
    //
    // To reconstruct X from [i1, i2, i3] with sizes [s1, s2, s3]:
    //   X = i1 + s1 * (i2 + s2 * i3)
    //     = i1 + s1 * i2 + s1 * s2 * i3
    //
    // Due to unshift, arr = [{i3, s3}, {i2, s2}, {i1, s1}] (reversed order)
    // Using Horner's method starting from first element:
    //   n = i3
    //   n = n * s2 + i2
    //   n = n * s1 + i1
    //
    if (arr.length === 0) {
        return [];
    }

    let n = BigInt(arr[0].value);
    for (let i = 1; i < arr.length; i++) {
        n = n * BigInt(arr[i].size) + BigInt(arr[i].value);
    }

    // Convert BigInt to byte array
    // Calculate how many bytes we need based on total entropy
    let totalEntropy = BigInt(1);
    arr.forEach((c) => {
        totalEntropy = totalEntropy * BigInt(c.size);
    });
    const totalBits = totalEntropy > 0 ? totalEntropy.toString(2).length : 0;
    const totalBytes = Math.ceil(totalBits / 8);

    const ret = [];
    for (let i = 0; i < totalBytes; i++) {
        ret.unshift(Number(n & BigInt(0xFF)));
        n = n >> BigInt(8);
    }

    return ret;
}

function getNonWords(fmt) {
    // find any characters before words
    const startMatch = /(?<start>.*?){{/;
    const start = fmt.match(startMatch)?.groups.start;

    // find any characters after words
    const endMatch = /.*}}(?<end>.*)$/;
    const end = fmt.match(endMatch)?.groups.end;

    // find all the parts between words
    let part;
    const separators = [];
    const midMatch = /}}(?<separator>.+?){{/g;
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
    const parts = getNonWords(fmt);
    // console.log("parts", parts);

    // create a RegExp with all the separators and the word matcher
    const wordMatch = "(.+)";
    let regExpStr = wordMatch;

    parts.separators.forEach((s) => {
        regExpStr += regExpEscape(s) + wordMatch;
    });

    // add the start and end to the RegExp
    regExpStr = regExpEscape(parts.start) + regExpStr + regExpEscape(parts.end);
    // console.log("regExpStr", regExpStr);

    // create the RegExp and run it against the string
    const wordMatcher = new RegExp(regExpStr);
    const ret = str.match(wordMatcher);

    // get the words from the match
    const numMatches = parts.separators.length + 1;
    const words = ret.slice(1, numMatches + 1);

    // return the words
    return words;
}

function regExpEscape(str) {
    // console.log("regExpEscape before", str);
    const regExpSpecialChars = ["\\", "^", "$", ".", "|", "?", "*", "+", "(", ")", "[", "{"];
    let regExpStr = regExpSpecialChars.map((c) => `\\${c}`).join("|");
    regExpStr = `(${regExpStr})`;
    // console.log(regExpStr);
    const charMatcher = new RegExp(regExpStr, "g");

    str = str.replace(charMatcher, (m, c) => `\\${c}`);

    // console.log("regExpEscape after", str);

    return str;
}

export default FlexiHumanHash;
