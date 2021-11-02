const {assert} = require("chai");
const {FlexiHumanHash, FlexiArrayDict} = require("..");

const randomBuf = new ArrayBuffer(10);
const tmpUint8 = new Uint8Array(randomBuf);
tmpUint8.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
function testDictCreate(opts) {
    // dict length is a power of 2 to prevent random overflow selection
    return new FlexiArrayDict("_test", ["frog", "bear", "tree", "cat", "dog", "octopus", "tiger", "slug"], opts);
}

describe("FlexiHumanHash", function() {
    it("is function", function() {
        assert.isFunction(FlexiHumanHash);
    });

    it("is constructable", function() {
        let fhh = new FlexiHumanHash("{{noun}}");
        assert.isObject(fhh);
    });

    describe("format", function() {
        before(function() {
            FlexiHumanHash.registerDictionary("test", testDictCreate);
        });

        it("accepts args");
        it("accepts same dictionaries with different args", function() {
            let fhh = new FlexiHumanHash("{{noun uppercase}}-{{noun caps}}");
            let str = fhh.hash(randomBuf);
            console.log("str", str);
        });
    });

    describe("hash", function() {
        before(function() {
            FlexiHumanHash.registerDictionary("test", testDictCreate);
        });

        it("accepts string", function() {
            let fhh = new FlexiHumanHash("{{noun}}");
            fhh.hash("foo");
            throw Error("not implemented");
        });

        it("accepts number", function() {
            let fhh = new FlexiHumanHash("{{noun}}");
            let str = fhh.hash(42);
            console.log("str", str);
        });

        it("accepts ArrayBuffer", function() {
            let fhh = new FlexiHumanHash("{{noun}}");
            let ret = fhh.hash(randomBuf);
            console.log("ret", ret);
        });

        it("accepts TypedArray");
        it("accepts array of numbers");
        it("accepts iterable of numbers");
        it("does md5");
    });

    describe("transform", function() {
        before(function() {
            FlexiHumanHash.registerDictionary("test", testDictCreate);
        });

        it("uppercase", function() {
            let fhh = new FlexiHumanHash("{{noun uppercase}}");
            let str = fhh.hash(42);
            console.log("str", str);
            throw new Error("not implemented");
        });

        it("caps");
        it("lowercase");
        it("min-length");
        it("max-length");
        it("exact-length");
    });

    describe.only("entropy", function() {
        before(function() {
            FlexiHumanHash.registerDictionary("test", testDictCreate);
        });

        it("returns number of combinations");
        it("returns base2", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            assert.strictEqual(fhh.entropyBase2, 3);
        });

        it("returns base10", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            assert.strictEqual(fhh.entropyBase10, 1);
        });
    });

    describe("default dictionaries", function() {
        it("noun");
        it("verb");
        it("adjective");
        it("cities");
        it("first-name");
        it("last-name");
    });
});
