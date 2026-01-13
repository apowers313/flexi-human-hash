import FlexiDict from "./FlexiDict.js";

class FlexiArrayDict extends FlexiDict {
    constructor(name, arr, opts = {}) {
        super(name, opts);

        this.dict = filterDict(arr, opts);

        // Apply unhashSafe normalization if requested
        if (opts.unhashSafe) {
            this._normalizeForUnhash();
        }

        this.doTransforms();

        // Calculate max word length for backtracking optimization
        this._maxWordLength = 0;
        for (let i = 0; i < this.dict.length; i++) {
            if (this.dict[i] && this.dict[i].length > this._maxWordLength) {
                this._maxWordLength = this.dict[i].length;
            }
        }
    }

    /**
     * Normalizes dictionary entries for safe unhashing:
     * 1. Removes common separators: "New York" -> "NewYork", "Ann-Marie" -> "AnnMarie"
     * 2. Removes case-insensitive duplicates (keeps first occurrence)
     *
     * This modifies the dictionary in place and may reduce its size.
     */
    _normalizeForUnhash() {
        const seen = new Set(); // lowercase normalized entries
        const deduped = [];

        for (let i = 0; i < this.dict.length; i++) {
            // Remove spaces, hyphens, and underscores
            const normalized = this.dict[i].replace(/[\s\-_]/g, "");
            const key = normalized.toLowerCase();

            // Keep only first occurrence of each case-insensitive entry
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(normalized);
            }
        }

        this.dict = deduped;
    }

    get maxWordLength() {
        return this._maxWordLength;
    }
}

function filterDict(arr, opts) {
    const minLength = opts["min-length"];
    const maxLength = opts["max-length"];
    const exactLength = opts["exact-length"];

    // duplicate array
    let dict = arr.slice();

    if (minLength !== undefined) {
        dict = minLengthFilter(dict, minLength);
    }

    if (maxLength !== undefined) {
        dict = maxLengthFilter(dict, maxLength);
    }

    if (exactLength !== undefined) {
        dict = exactLengthFilter(dict, exactLength);
    }

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

