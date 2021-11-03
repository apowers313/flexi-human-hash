const FlexiArrayDict = require("./FlexiArrayDict");
const FlexiDict = require("./FlexiDict");

class DecimalDict extends FlexiDict {
    constructor(opts = {}) {
        super(opts);
        let args = opts.args ?? [];
        this.digits = args.filter((a) => Number.isInteger(a))[0] ?? 4;

        let digitsMax = Math.floor(Math.log10(Number.MAX_SAFE_INTEGER));
        if (this.digits < 1 || this.digits > digitsMax) {
            throw new TypeError(`decimal must be between 1 and ${digitsMax} digits, got ${this.digits}`);
        }
    }

    getEntry(n) {
        return n.toString();
    }

    get size() {
        return 10 ** this.digits;
    }
}

class HexDict extends FlexiDict {
    constructor(opts = {}) {
        super(opts);
        let args = opts.args ?? [];
        this.nibbles = args.filter((a) => Number.isInteger(a))[0] ?? 4;

        let nibblesMax = Math.floor(Math.log2(Number.MAX_SAFE_INTEGER) / 4);
        if (this.nibbles < 1 || this.nibbles > nibblesMax) {
            throw new TypeError(`decimal must be between 1 and ${nibblesMax} nibbles, got ${this.nibbles}`);
        }
    }

    getEntry(n) {
        return n.toString(16);
    }

    get size() {
        return 2 ** (this.nibbles * 4);
    }
}

function nounDictCreate(opts) {
    return new FlexiArrayDict("noun", require("categorized-words").N, opts);
}

function adjectiveDictCreate(opts) {
    return new FlexiArrayDict("adjective", require("categorized-words").A, opts);
}

function verbDictCreate(opts) {
    return new FlexiArrayDict("verb", require("categorized-words").V, opts);
}

function cityDictCreate(opts) {
    return new FlexiArrayDict("city", require("all-the-cities").map((c) => c.name), opts);
}

function femaleNameDictCreate(opts) {
    return new FlexiArrayDict("female-name", require("@stdlib/datasets-female-first-names-en")(), opts);
}

function maleNameDictCreate(opts) {
    return new FlexiArrayDict("male-name", require("@stdlib/datasets-male-first-names-en")(), opts);
}

function firstNameDictCreate(opts) {
    return new FlexiArrayDict("first-name", require("@stdlib/datasets-female-first-names-en")().concat(require("@stdlib/datasets-male-first-names-en")()), opts);
}

function lastNameDictCreate(opts) {
    return new FlexiArrayDict("last-name", require("../data/last.json"), opts);
}

function decimalDictCreate(opts) {
    return new DecimalDict(opts);
}

function hexDictCreate(opts) {
    return new HexDict(opts);
}

module.exports = [
    {name: "noun", createFn: nounDictCreate},
    {name: "adjective", createFn: adjectiveDictCreate},
    {name: "verb", createFn: verbDictCreate},
    {name: "city", createFn: cityDictCreate},
    {name: "female-name", createFn: femaleNameDictCreate},
    {name: "male-name", createFn: maleNameDictCreate},
    {name: "first-name", createFn: firstNameDictCreate},
    {name: "last-name", createFn: lastNameDictCreate},
    {name: "decimal", createFn: decimalDictCreate},
    {name: "hex", createFn: hexDictCreate},
];
