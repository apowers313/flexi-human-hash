const {assert} = require("chai");
const {FlexiHumanHash, FlexiArrayDict} = require("..");

const randomBuf = new ArrayBuffer(10);
const tmpUint8 = new Uint8Array(randomBuf);
// our test array is 8 bits, this is 1, 2, 3, 4, ... in 3 bit numbers:
// tmpUint8.set([0xA0, 0x9C, 0xEE, 0xA0, 0x9C, 0xEE, 0xA0, 0x9C, 0xEE]);
tmpUint8.set([0b00000101, 0b00111001, 0b01110111, 0b00000101, 0b00111001, 0b01110111, 0b00000101, 0b00111001, 0b01110111]);

// dict length is a power of 2 to prevent random overflow selection
let testDict = ["frog", "bear", "tree", "cat", "wolf", "octopus", "tiger", "slug"];
function testDictCreate(opts) {
    return new FlexiArrayDict("_test", testDict, opts);
}

describe("FlexiHumanHash", function() {
    before(function() {
        FlexiHumanHash.registerDictionary("test", testDictCreate);
    });

    it("is function", function() {
        assert.isFunction(FlexiHumanHash);
    });

    it("is constructable", function() {
        let fhh = new FlexiHumanHash("{{test}}");
        assert.isObject(fhh);
    });

    it("throws if not constructed with string");

    describe("format", function() {
        it("accepts args", function() {
            new FlexiHumanHash("{{test}}");
        });

        it("accepts same dictionaries with different args", function() {
            let fhh = new FlexiHumanHash("{{test uppercase}}-{{test caps}}");
            let str = fhh.hash(randomBuf);
            assert.strictEqual(str, "Frog-BEAR");
        });
    });

    describe("hash", function() {
        it("doesn't require a random number", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            let str = fhh.hash();
            assert.isTrue(testDict.includes(str));
        });

        it("eventually randomly selects everything in the list", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            let coverageSet = new Set();
            while (coverageSet.size !== testDict.length) {
                let str = fhh.hash();
                coverageSet.add(str);
            }
        });

        it("overflow eventually randomly selects everything in the list", function() {
            let overflowDict = ["frog", "bear", "tree", "cat", "wolf", "octopus", "tiger", "slug", "ogre", "burp", "blarg", "foo", "bar", "baz", "bat", "binkey"];
            function overflowDictCreate(opts) {
                return new FlexiArrayDict("_overflow", overflowDict, opts);
            }
            FlexiHumanHash.registerDictionary("overflow", overflowDictCreate);

            let fhh = new FlexiHumanHash("{{overflow}}");
            assert.strictEqual(fhh.entropy, BigInt(16));

            let coverageSet = new Set();
            while (coverageSet.size !== overflowDict.length) {
                let str = fhh.hash();
                // console.log("coverageSet", coverageSet.size);
                coverageSet.add(str);
            }
        });

        it("accepts string", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            let str = fhh.hash("}");
            assert.strictEqual(str, "cat");
            str = fhh.hash("^");
            assert.strictEqual(str, "tree");
            str = fhh.hash("0");
            assert.strictEqual(str, "bear");
            str = fhh.hash("\t");
            assert.strictEqual(str, "frog");
        });

        it("accepts ArrayBuffer", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            let str = fhh.hash(randomBuf);
            assert.strictEqual(str, "frog");
        });

        it("accepts TypedArray", function() {
            let fhh = new FlexiHumanHash("{{test}}");

            // Uint8Array
            let str = fhh.hash(new Uint8Array([0b00000000]));
            assert.strictEqual(str, "frog");
            str = fhh.hash(new Uint8Array([0b00100000]));
            assert.strictEqual(str, "bear");
            str = fhh.hash(new Uint8Array([0b01000000]));
            assert.strictEqual(str, "tree");
            str = fhh.hash(new Uint8Array([0b01100000]));
            assert.strictEqual(str, "cat");
            str = fhh.hash(new Uint8Array([0b10000000]));
            assert.strictEqual(str, "wolf");
            str = fhh.hash(new Uint8Array([0b10100000]));
            assert.strictEqual(str, "octopus");
            str = fhh.hash(new Uint8Array([0b11000000]));
            assert.strictEqual(str, "tiger");
            str = fhh.hash(new Uint8Array([0b11100000]));
            assert.strictEqual(str, "slug");

            // Uint16Array
            str = fhh.hash(new Uint8Array([0b1010000010100000])); // endianness :(
            assert.strictEqual(str, "octopus");
        });

        it("accepts array of numbers", function() {
            let fhh = new FlexiHumanHash("{{test}}");

            // array of numbers
            let str = fhh.hash([0b00000000, 1, 2, 3, 4]);
            assert.strictEqual(str, "frog");
            str = fhh.hash([0b00100000]);
            assert.strictEqual(str, "bear");
            str = fhh.hash([0b01000000]);
            assert.strictEqual(str, "tree");
            str = fhh.hash([0b01100000]);
            assert.strictEqual(str, "cat");
            str = fhh.hash([0b10000000]);
            assert.strictEqual(str, "wolf");
            str = fhh.hash([0b10100000]);
            assert.strictEqual(str, "octopus");
            str = fhh.hash([0b11000000]);
            assert.strictEqual(str, "tiger");
            str = fhh.hash([0b11100000]);
            assert.strictEqual(str, "slug");

            fhh = new FlexiHumanHash("{{test}}:{{test}}:{{test}}:{{test}}:{{test}}:{{test}}");
            str = fhh.hash([0b11100000, 0b11011001, 0b10000000]);
            assert.strictEqual(str, "slug:frog:bear:octopus:wolf:tiger");
        });

        it("accepts iterable of numbers", function() {
            fhh = new FlexiHumanHash("{{test}}:{{test}}:{{test}}:{{test}}:{{test}}:{{test}}");
            let s = new Set([0b11100000, 0b11011001, 0b10000000]);
            str = fhh.hash(s.values());
            assert.strictEqual(str, "slug:frog:bear:octopus:wolf:tiger");
        });

        it("does md5", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            let str = fhh.hash("this is a very long string that is more than we need", {hashAlg: "md5"});
            assert.strictEqual(str, "slug");
        });

        it("does sha256", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            let str = fhh.hash("this is a very long string that is more than we need", {hashAlg: "sha256"});
            assert.strictEqual(str, "frog");
        });

        it("salts hash", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            let str = fhh.hash("this is a very long string that is more than we need", {hashAlg: "sha256"});
            assert.strictEqual(str, "frog");

            str = fhh.hash("this is a very long string that is more than we need", {hashAlg: "sha256", hashSalt: "foo"});
            assert.strictEqual(str, "cat");
        });

        it("throws on number");
        it("throws on other bad inputs");
    });

    describe("unhash", function() {
        it("undoes simple word", function() {
            let fhh = new FlexiHumanHash("{{test}}");
            let randomArr = [0b10100000];
            let str1 = fhh.hash(randomArr);
            console.log("str1", str1);
            let numArr = fhh.unhash(str1);
            assert.deepEqual(numArr, randomArr);
        });

        it("undoes word string", function() {
            let fhh = new FlexiHumanHash("{{test}}-{{test}}:{{test}} {{test}}");
            let randomArr = [0b00000101, 0b00110000];
            let str1 = fhh.hash(randomArr);
            let numArr = fhh.unhash(str1);
            assert.deepEqual(numArr, randomArr);
        });

        it("works with regexp special characters", function() {
            let fhh = new FlexiHumanHash(")*&#!^$*%)!|}{\][\":<./{{test}}@*#&$^(*%!)(_)+_|}{|}\][\;';\":\":,.,//?>?<><{{test}}@!$#@$@^%$#&^%$*&^)(*&_)*(_)+_-==][\][{}}|}{;';\":\":<>?><?.,/.,{{test}}|}{\][\][!&^@%#$(*&^)@$#)(#*&_)(*+_9=-09}{|]\":\":';'?><?><,./,/{{test}}{|}{|}{\][\][\][|}{|}{:\"\":./,/.,?><?><?><!@#$Q^%$#^%$&*^%(*&^)(*&_)()+_+_=-=");
            // let fhh = new FlexiHumanHash("**{{test}}**{{test}}**{{test}}**{{test}}");
            let randomArr = [0b00000101, 0b00110000];
            let str1 = fhh.hash(randomArr);
            let numArr = fhh.unhash(str1);
            assert.deepEqual(numArr, randomArr);
        });

        it.skip("can repeatedly unhash", function() {
            let fhh = new FlexiHumanHash("{{first-name lowercase}}-{{last-name lowercase}}-the-{{adjective}}-{{noun}}");
            for (let i = 0; i < 1000000; i++) {
                let rnd = Array.apply(null, {length: 8}).map((c) => Math.floor(Math.random() * 256));
                console.log("rnd", rnd);
                let str = fhh.hash(rnd);
                let ret = fhh.unhash(str);
                assert.strictEqual(rnd, ret);
            }
            // console.log(fhh.hash());
            let ret = fhh.unhash("francisca-straub-the-coldest-eagle");
            console.log("ret", ret);
        });

        it.skip("works with leading '1'", function() {
            let fhh = new FlexiHumanHash("{{test}}-{{test}}-{{test}}-{{test}}-{{test}}-{{test}}-{{test}}-{{test}}");
            let randomArr = [232, 109, 102, 74];
            let str1 = fhh.hash(randomArr);
            console.log("str1", str1);
            let numArr = fhh.unhash(str1);
            assert.deepEqual(numArr, randomArr);
        });

        it("throws if no match");

        it("throws if words next to each other in format", function() {
            let fhh = new FlexiHumanHash("{{test}}{{test}}");
            let randomArr = [0b00000101, 0b00110000];
            let str1 = fhh.hash(randomArr);
            assert.throws(() => {
                fhh.unhash(str1);
            }, Error, "no separator between words in format string '{{test}}{{test}}', can't unhash");
        });

        it("throws if dangerous format");

        it("undoes transform");
        it("undoes multiple transforms");
        it("throws on bad input");
    });

    describe("registerDictionary", function() {
        it("throws on bad input");
    });

    describe("registerTransform", function() {
        it("throws on bad input");
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

        it("exact-length", function() {
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
        it("noun", function() {
            let fhh = new FlexiHumanHash("{{noun}}");
            let str = fhh.hash(randomBuf);
            assert.isTrue(str === "quilter" || str === "afterlives");
        });

        it("verb", function() {
            let fhh = new FlexiHumanHash("{{verb}}");
            let str = fhh.hash(randomBuf);
            assert.isTrue(str === "admixes" || str === "mistakes");
        });

        it("adjective", function() {
            let fhh = new FlexiHumanHash("{{adjective}}");
            let str = fhh.hash(randomBuf);
            assert.isTrue(str === "nonmigratory" || str === "adjudicative");
        });

        describe("decimal", function() {
            it("can be 1 digit", function() {
                let fhh = new FlexiHumanHash("{{decimal 1}}");
                let str = fhh.hash(randomBuf);
                assert.isTrue(str === "0" || str === "8");
            });

            it("can be 14 digits", function() {
                let fhh = new FlexiHumanHash("{{decimal 14}}");
                let str = fhh.hash(randomBuf);
                assert.isTrue(str === "71804836204125" || str === "1436092026461");
            });

            it("defaults to 4 digits", function() {
                let fhh = new FlexiHumanHash("{{decimal}}");
                let str = fhh.hash(randomBuf);
                assert.isTrue(str === "8359" || str === "167");
            });

            it("throws on 15");
            it("throws on 0");
            it("throws on -1");
        });

        describe("hex", function() {
            it("can be 1 digit", function() {
                let fhh = new FlexiHumanHash("{{hex 1}}");
                let str = fhh.hash("hi", {hashAlg: "md5"});
                assert.isTrue(str === "4");
            });

            it("can be 13 digits", function() {
                let fhh = new FlexiHumanHash("{{hex 13}}");
                let str = fhh.hash("hi", {hashAlg: "md5"});
                assert.isTrue(str === "49f68a5c8493e");
            });

            it("defaults to 4 nibbles", function() {
                let fhh = new FlexiHumanHash("{{hex}}");
                let str = fhh.hash("hi", {hashAlg: "md5"});
                assert.isTrue(str === "49f6");
            });

            it("throws on 13");
            it("throws on 0");
            it("throws on -1");
        });

        it("city", function() {
            this.slow(1000);
            let fhh = new FlexiHumanHash("{{city}}");
            let str = fhh.hash(randomBuf);
            assert.isTrue(str === "Sankt Dionysen" || str === "Vụ Bản");
        });

        it("female-name", function() {
            let fhh = new FlexiHumanHash("{{female-name}}");
            let str = fhh.hash(randomBuf);
            assert.isTrue(str === "Rosemaria" || str === "Ailey");
        });

        it("male-name", function() {
            let fhh = new FlexiHumanHash("{{male-name}}");
            let str = fhh.hash(randomBuf);
            assert.isTrue(str === "Karoly" || str === "Adolpho");
        });

        it("first-name", function() {
            let fhh = new FlexiHumanHash("{{first-name}}");
            let str = fhh.hash(randomBuf);
            assert.isTrue(str === "Ally" || str === "Stinky");
        });

        it("last-name", function() {
            let fhh = new FlexiHumanHash("{{last-name}}");
            let str = fhh.hash(randomBuf);
            assert.isTrue(str === "Raleigh" || str === "Airlia");
        });
    });

    describe("examples", function() {
        it("Use", function() {
            const {FlexiHumanHash} = require("..");
            let fhh = new FlexiHumanHash("{{adjective}}-{{noun}}");
            let str = fhh.hash();
            console.log(str);
        });

        it("Simple hash, you provide the random numbers", function() {
            let fhh = new FlexiHumanHash("{{adjective}}-{{adjective}}-{{noun}}-{{decimal 4}}");
            let str = fhh.hash("edf63145-f6d3-48bf-a0b7-18e2eeb0a9dd");
        });

        it("Another format, random number provided for you", function() {
            let fhh = new FlexiHumanHash("{{adjective}}, {{adjective}} {{noun}} {{hex 4}}");
            let str = fhh.hash();
        });

        it("Another format, md5 hash a string for random numbers", function() {
            let fhh = new FlexiHumanHash("{{first-name caps}}-{{last-name caps}}-{{decimal 6}}");
            let str = fhh.hash("this is my password...", {hashAlg: "md5"});
            console.log(str);
        });

        it("Reverse a string back to the original random number", function() {
            let fhh = new FlexiHumanHash("{{first-name lowercase}}-{{last-name lowercase}}-the-{{adjective}}-{{noun}}");
            let ret = fhh.unhash("francisca-straub-the-coldest-eagle");
        });

        it("Report how much entropy is used for a format to help understand likelihood of collisions", function() {
            let fhh = new FlexiHumanHash("{{first-name uppercase}}-{{last-name uppercase}}-{{decimal 6}}");
            console.log(fhh.entropy);
            // Expected output (note BigInt): "70368744177664n"
            console.log("Number of combinations:", fhh.entropy.toLocaleString());
            // Expected output: "Number of combinations: 70,368,744,177,664"
            console.log(`Entropy: 2^${fhh.entropyBase2}`);
            // Expected output: "Entropy: 2^46"
            console.log(`Entropy: 10^${fhh.entropyBase10}`);
            // Expected output: "Entropy: 10^14"
        });

        it("Add a dictionary", function() {
            let scientificTerms = [
                "antigens",
                "magnetron",
                "nanoarchitectonics",
                "spintronics",
                "teflon",
                "transistor",
                /* ... */
            ];

            function registerScientificTerms() {
                return {
                    size: scientificTerms.length,
                    getEntry: function(n) {
                        return scientificTerms[n];
                    },
                };
            }

            FlexiHumanHash.registerDictionary("science", registerScientificTerms);
            let fhh = new FlexiHumanHash("{{adjective}}:{{science}}");
            fhh.hash();
            // Expected output: archetypical:spintronics
        });

        it("Add a transform", function() {
            function reverseString(str) {
                return str.split("").reverse().join("");
            }

            FlexiHumanHash.registerTransform("reverse", reverseString);
            let fhh = new FlexiHumanHash("{{adjective reverse}}-{{noun reverse}}");
            fhh.hash();
        });
    });
});
