const {assert} = require("chai");
const {FlexiHumanHash, FlexiArrayDict} = require("..");

const randomBuf = new ArrayBuffer(10);
const tmpUint8 = new Uint8Array(randomBuf);
// our test array is 8 bits, this is 1, 2, 3, 4, ... in 3 bit numbers:
tmpUint8.set([0xA0, 0x9C, 0xEE, 0xA0, 0x9C, 0xEE, 0xA0, 0x9C, 0xEE]);

function testDictCreate(opts) {
    // dict length is a power of 2 to prevent random overflow selection
    return new FlexiArrayDict("_test", ["frog", "bear", "tree", "cat", "wolf", "octopus", "tiger", "slug"], opts);
}

describe("FlexiHumanHash", function() {
    before(function() {
        FlexiHumanHash.registerDictionary("test", testDictCreate);
    });

    it("is function", function() {
        assert.isFunction(FlexiHumanHash);
    });

    it("is constructable", function() {
        let fhh = new FlexiHumanHash("{{noun}}");
        assert.isObject(fhh);
    });

    describe("format", function() {
        it("accepts args", function() {
            new FlexiHumanHash("{{noun}}");
        });

        it("accepts same dictionaries with different args", function() {
            let fhh = new FlexiHumanHash("{{noun uppercase}}-{{noun caps}}");
            let str = fhh.hash(randomBuf);
            console.log("str", str);
        });
    });

    describe.only("hash", function() {
        it("doesn't require a random number");
        it("accepts string", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            fhh.hash("foo");
            throw Error("not implemented");
        });

        it("accepts ArrayBuffer", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            let ret = fhh.hash(randomBuf);
            console.log("ret", ret);
        });

        it("accepts TypedArray");
        it("accepts array of numbers");
        it("accepts iterable of numbers");
        it("does md5");
        it("does sha256");
        it("salts hash");

        // it("accepts array of hex strings");
        // it("accepts array of hex strings with leading 0x");
        // it("accepts hex string");
        // it("accepts hex string with spaces");
        // it("accepts hex string with leading 0x");
        // it("accepts hex string with leading 0x and spaces");
    });

    describe("transform", function() {
        it("uppercase", function() {
            let fhh = new FlexiHumanHash("{{test uppercase}}");
            let str = fhh.hash(randomBuf);
            assert.strictEqual(str, "Frog");
        });

        it("caps", function() {
            let fhh = new FlexiHumanHash("{{test caps}}:{{test caps}}:{{test caps}}:{{test caps}}:{{test caps}}:{{test caps}}:{{test caps}}:{{test caps}}");
            let str = fhh.hash(randomBuf);
            assert.strictEqual(str, "FROG:BEAR:TREE:CAT:WOLF:OCTOPUS:TIGER:SLUG");
        });

        it("lowercase", function() {
            let fhh = new FlexiHumanHash("{{test lowercase}}-{{test lowercase}}");
            let str = fhh.hash(randomBuf);
            assert.strictEqual(str, "frog-bear");
        });

        it("min-length", function() {
            let fhh = new FlexiHumanHash("{{test min-length=7}}");
            assert.strictEqual(fhh.entropy, BigInt(1));
            let str = fhh.hash(randomBuf);
            assert.strictEqual(str, "octopus");
        });

        it("max-length", function() {
            let fhh = new FlexiHumanHash("{{test max-length=3}}");
            assert.strictEqual(fhh.entropy, BigInt(1));
            let str = fhh.hash(randomBuf);
            assert.strictEqual(str, "cat");
        });

        it.only("exact-length", function() {
            let fhh = new FlexiHumanHash("{{test exact-length=5}}");
            assert.strictEqual(fhh.entropy, BigInt(1));
            let str = fhh.hash(randomBuf);
            assert.strictEqual(str, "tiger");
        });

        it("mixes length transforms in a single format", function() {
            let fhh = new FlexiHumanHash("{{test caps min-length=7}}-{{test uppercase max-length=3}}-{{test lowercase exact-length=5}}");
            assert.strictEqual(fhh.entropy, BigInt(1));
            let str = fhh.hash(randomBuf);
            assert.strictEqual(str, "OCTOPUS-Cat-tiger");
        });
    });

    describe("entropy", function() {
        it("returns number of combinations", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            assert.strictEqual(fhh.entropy, BigInt(8));
        });

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
        it("decimal");
        it("hex");
        it("cities");
        it("first-name");
        it("last-name");
    });
});
