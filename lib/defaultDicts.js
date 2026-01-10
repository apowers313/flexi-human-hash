import FlexiArrayDict from "./FlexiArrayDict.js";
import FlexiDict from "./FlexiDict.js";
import categorizedWords from "categorized-words";
import allTheCities from "all-the-cities";
import femaleNamesEn from "@stdlib/datasets-female-first-names-en";
import maleNamesEn from "@stdlib/datasets-male-first-names-en";
import lastNames from "../data/last.json" with { type: "json" };

class DecimalDict extends FlexiDict {
    constructor(opts = {}) {
        super(opts);
        const args = opts.args ?? [];
        this.digits = args.filter((a) => Number.isInteger(a))[0] ?? 4;

        const digitsMax = Math.floor(Math.log10(Number.MAX_SAFE_INTEGER));
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
        const args = opts.args ?? [];
        this.nibbles = args.filter((a) => Number.isInteger(a))[0] ?? 4;

        const nibblesMax = Math.floor(Math.log2(Number.MAX_SAFE_INTEGER) / 4);
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
    return new FlexiArrayDict("noun", categorizedWords.N, opts);
}

function adjectiveDictCreate(opts) {
    return new FlexiArrayDict("adjective", categorizedWords.A, opts);
}

function verbDictCreate(opts) {
    return new FlexiArrayDict("verb", categorizedWords.V, opts);
}

function cityDictCreate(opts) {
    return new FlexiArrayDict("city", allTheCities.map((c) => c.name), opts);
}

function femaleNameDictCreate(opts) {
    return new FlexiArrayDict("female-name", femaleNamesEn(), opts);
}

function maleNameDictCreate(opts) {
    return new FlexiArrayDict("male-name", maleNamesEn(), opts);
}

function firstNameDictCreate(opts) {
    return new FlexiArrayDict("first-name", femaleNamesEn().concat(maleNamesEn()), opts);
}

function lastNameDictCreate(opts) {
    return new FlexiArrayDict("last-name", lastNames, opts);
}

function decimalDictCreate(opts) {
    return new DecimalDict(opts);
}

function hexDictCreate(opts) {
    return new HexDict(opts);
}

export default [
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
