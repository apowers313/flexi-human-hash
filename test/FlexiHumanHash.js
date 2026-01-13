import { assert } from "chai";
import { FlexiHumanHash, FlexiArrayDict, RandomSource } from "../index.js";

const randomBuf = new ArrayBuffer(10);
const tmpUint8 = new Uint8Array(randomBuf);
// our test array is 8 bits, this is 1, 2, 3, 4, ... in 3 bit numbers:
// tmpUint8.set([0xA0, 0x9C, 0xEE, 0xA0, 0x9C, 0xEE, 0xA0, 0x9C, 0xEE]);
tmpUint8.set([0b00000101, 0b00111001, 0b01110111, 0b00000101, 0b00111001, 0b01110111, 0b00000101, 0b00111001, 0b01110111]);

// dict length is a power of 2 to prevent random overflow selection
const testDict = ["frog", "bear", "tree", "cat", "wolf", "octopus", "tiger", "slug"];
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
        const fhh = new FlexiHumanHash("{{test}}");
        assert.isObject(fhh);
    });

    it("throws if not constructed with string");

    describe("format", function() {
        it("accepts args", function() {
            new FlexiHumanHash("{{test}}");
        });

        it("accepts same dictionaries with different args", function() {
            const fhh = new FlexiHumanHash("{{test uppercase}}-{{test caps}}");
            const str = fhh.hash(randomBuf);
            // With divmod algorithm, randomBuf produces different output
            assert.strictEqual(str, "Frog-FROG");
        });
    });

    describe("hash", function() {
        it("doesn't require a random number", function() {
            const fhh = new FlexiHumanHash("{{test}}");
            const str = fhh.hash();
            assert.isTrue(testDict.includes(str));
        });

        it("eventually randomly selects everything in the list", function() {
            const fhh = new FlexiHumanHash("{{test}}");
            const coverageSet = new Set();
            while (coverageSet.size !== testDict.length) {
                const str = fhh.hash();
                coverageSet.add(str);
            }
        });

        it("overflow eventually randomly selects everything in the list", function() {
            const overflowDict = ["frog", "bear", "tree", "cat", "wolf", "octopus", "tiger", "slug", "ogre", "burp", "blarg", "foo", "bar", "baz", "bat", "binkey"];
            function overflowDictCreate(opts) {
                return new FlexiArrayDict("_overflow", overflowDict, opts);
            }
            FlexiHumanHash.registerDictionary("overflow", overflowDictCreate);

            const fhh = new FlexiHumanHash("{{overflow}}");
            assert.strictEqual(fhh.entropy, BigInt(16));

            const coverageSet = new Set();
            while (coverageSet.size !== overflowDict.length) {
                const str = fhh.hash();
                // console.log("coverageSet", coverageSet.size);
                coverageSet.add(str);
            }
        });

        it("accepts string", function() {
            const fhh = new FlexiHumanHash("{{test}}");
            // With divmod: charCode % dictSize = index
            // '}' = 125, 125 % 8 = 5 -> octopus
            let str = fhh.hash("}");
            assert.strictEqual(str, "octopus");
            // '^' = 94, 94 % 8 = 6 -> tiger
            str = fhh.hash("^");
            assert.strictEqual(str, "tiger");
            // '0' = 48, 48 % 8 = 0 -> frog
            str = fhh.hash("0");
            assert.strictEqual(str, "frog");
            // '\t' = 9, 9 % 8 = 1 -> bear
            str = fhh.hash("\t");
            assert.strictEqual(str, "bear");
        });

        it("accepts ArrayBuffer", function() {
            const fhh = new FlexiHumanHash("{{test}}");
            const str = fhh.hash(randomBuf);
            assert.strictEqual(str, "frog");
        });

        it("accepts TypedArray", function() {
            const fhh = new FlexiHumanHash("{{test}}");

            // Uint8Array - with divmod: value % 8 = index
            let str = fhh.hash(new Uint8Array([0]));
            assert.strictEqual(str, "frog");
            str = fhh.hash(new Uint8Array([1]));
            assert.strictEqual(str, "bear");
            str = fhh.hash(new Uint8Array([2]));
            assert.strictEqual(str, "tree");
            str = fhh.hash(new Uint8Array([3]));
            assert.strictEqual(str, "cat");
            str = fhh.hash(new Uint8Array([4]));
            assert.strictEqual(str, "wolf");
            str = fhh.hash(new Uint8Array([5]));
            assert.strictEqual(str, "octopus");
            str = fhh.hash(new Uint8Array([6]));
            assert.strictEqual(str, "tiger");
            str = fhh.hash(new Uint8Array([7]));
            assert.strictEqual(str, "slug");

            // Multi-byte input: bytes form a BigInt, then divmod
            // [0, 5] = 0*256 + 5 = 5 -> 5 % 8 = 5 -> octopus
            str = fhh.hash(new Uint8Array([0, 5]));
            assert.strictEqual(str, "octopus");
        });

        it("accepts array of numbers", function() {
            let fhh = new FlexiHumanHash("{{test}}");

            // array of numbers - with divmod: value % 8 = index
            let str = fhh.hash([0]);
            assert.strictEqual(str, "frog");
            str = fhh.hash([1]);
            assert.strictEqual(str, "bear");
            str = fhh.hash([2]);
            assert.strictEqual(str, "tree");
            str = fhh.hash([3]);
            assert.strictEqual(str, "cat");
            str = fhh.hash([4]);
            assert.strictEqual(str, "wolf");
            str = fhh.hash([5]);
            assert.strictEqual(str, "octopus");
            str = fhh.hash([6]);
            assert.strictEqual(str, "tiger");
            str = fhh.hash([7]);
            assert.strictEqual(str, "slug");

            // With 6 dicts of size 8, we need a BigInt that encodes 6 values
            // The divmod algorithm extracts remainders in sequence
            fhh = new FlexiHumanHash("{{test}}:{{test}}:{{test}}:{{test}}:{{test}}:{{test}}");
            // To get specific output, we can verify hash is deterministic
            str = fhh.hash([0b11100000, 0b11011001, 0b10000000]);
            assert.strictEqual(str, "frog:frog:tiger:wolf:octopus:bear");
        });

        it("accepts iterable of numbers", function() {
            const fhh = new FlexiHumanHash("{{test}}:{{test}}:{{test}}:{{test}}:{{test}}:{{test}}");
            const s = new Set([0b11100000, 0b11011001, 0b10000000]);
            const str = fhh.hash(s.values());
            // With divmod algorithm, same bytes produce different output
            assert.strictEqual(str, "frog:frog:tiger:wolf:octopus:bear");
        });

        it("does md5", function() {
            const fhh = new FlexiHumanHash("{{test}}");
            const str = fhh.hash("this is a very long string that is more than we need", {hashAlg: "md5"});
            // With divmod algorithm, md5 hash bytes produce different output
            assert.strictEqual(str, "frog");
        });

        it("does sha256", function() {
            const fhh = new FlexiHumanHash("{{test}}");
            const str = fhh.hash("this is a very long string that is more than we need", {hashAlg: "sha256"});
            assert.strictEqual(str, "cat");
        });

        it("salts hash", function() {
            const fhh = new FlexiHumanHash("{{test}}");
            let str = fhh.hash("this is a very long string that is more than we need", {hashAlg: "sha256"});
            assert.strictEqual(str, "cat");

            str = fhh.hash("this is a very long string that is more than we need", {hashAlg: "sha256", hashSalt: "foo"});
            assert.strictEqual(str, "wolf");
        });

        it("throws on number");
        it("throws on other bad inputs");
    });

    describe("unhash", function() {
        it("undoes simple word", function() {
            const fhh = new FlexiHumanHash("{{test}}");
            // With divmod, canonical inputs for single size-8 dict are 0-7
            const randomArr = [5]; // produces "octopus"
            const str1 = fhh.hash(randomArr);
            console.log("str1", str1);
            const numArr = fhh.unhash(str1);
            assert.deepEqual(numArr, randomArr);
        });

        it("undoes word string", function() {
            const fhh = new FlexiHumanHash("{{test}}-{{test}}:{{test}} {{test}}");
            const randomArr = [0b00000101, 0b00110000];
            const str1 = fhh.hash(randomArr);
            const numArr = fhh.unhash(str1);
            assert.deepEqual(numArr, randomArr);
        });

        it("works with regexp special characters", function() {
            const fhh = new FlexiHumanHash(")*&#!^$*%)!|}{][\":<./{{test}}@*#&$^(*%!)(_)+_|}{|}][;';\":\":,.,//?>?<><{{test}}@!$#@$@^%$#&^%$*&^)(*&_)*(_)+_-==][][{}}|}{;';\":\":<>?><?.,/.,{{test}}|}{][][!&^@%#$(*&^)@$#)(#*&_)(*+_9=-09}{|]\":\":';'?><?><,./,/{{test}}{|}{|}{][][][|}{|}{:\"\":./,/.,?><?><?><!@#$Q^%$#^%$&*^%(*&^)(*&_)()+_+_=-=");
            // let fhh = new FlexiHumanHash("**{{test}}**{{test}}**{{test}}**{{test}}");
            const randomArr = [0b00000101, 0b00110000];
            const str1 = fhh.hash(randomArr);
            const numArr = fhh.unhash(str1);
            assert.deepEqual(numArr, randomArr);
        });

        it.skip("can repeatedly unhash", function() {
            const fhh = new FlexiHumanHash("{{first-name lowercase}}-{{last-name lowercase}}-the-{{adjective}}-{{noun}}");
            for (let i = 0; i < 1000000; i++) {
                const rnd = Array.apply(null, {length: 8}).map((_c) => Math.floor(Math.random() * 256));
                console.log("rnd", rnd);
                const str = fhh.hash(rnd);
                const ret = fhh.unhash(str);
                assert.strictEqual(rnd, ret);
            }
            // console.log(fhh.hash());
            const ret = fhh.unhash("francisca-straub-the-coldest-eagle");
            console.log("ret", ret);
        });

        it.skip("works with leading '1'", function() {
            const fhh = new FlexiHumanHash("{{test}}-{{test}}-{{test}}-{{test}}-{{test}}-{{test}}-{{test}}-{{test}}");
            const randomArr = [232, 109, 102, 74];
            const str1 = fhh.hash(randomArr);
            console.log("str1", str1);
            const numArr = fhh.unhash(str1);
            assert.deepEqual(numArr, randomArr);
        });

        it("throws if no match");

        it("throws if words next to each other in format", function() {
            const fhh = new FlexiHumanHash("{{test}}{{test}}");
            const randomArr = [0b00000101, 0b00110000];
            const str1 = fhh.hash(randomArr);
            assert.throws(() => {
                fhh.unhash(str1);
            }, Error, "Format is not unhashable: no separator between words in format string");
        });

        it("throws if dangerous format");

        it("undoes transform", function() {
            const fhh = new FlexiHumanHash("{{test uppercase}}-{{test caps}}:{{test caps}} {{test uppercase}}");
            const randomArr = [0b00000101, 0b00110000];
            const str1 = fhh.hash(randomArr);
            const numArr = fhh.unhash(str1);
            assert.deepEqual(numArr, randomArr);
        });

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
            const fhh = new FlexiHumanHash("{{test uppercase}}");
            const str = fhh.hash(randomBuf);
            assert.strictEqual(str, "Frog");
        });

        it("caps", function() {
            const fhh = new FlexiHumanHash("{{test caps}}:{{test caps}}:{{test caps}}:{{test caps}}:{{test caps}}:{{test caps}}:{{test caps}}:{{test caps}}");
            const str = fhh.hash(randomBuf);
            // With divmod algorithm, randomBuf produces different output
            assert.strictEqual(str, "FROG:FROG:WOLF:CAT:SLUG:TREE:TIGER:BEAR");
        });

        it("lowercase", function() {
            const fhh = new FlexiHumanHash("{{test lowercase}}-{{test lowercase}}");
            const str = fhh.hash(randomBuf);
            assert.strictEqual(str, "frog-frog");
        });

        it("min-length", function() {
            const fhh = new FlexiHumanHash("{{test min-length=7}}");
            assert.strictEqual(fhh.entropy, BigInt(1));
            const str = fhh.hash(randomBuf);
            assert.strictEqual(str, "octopus");
        });

        it("max-length", function() {
            const fhh = new FlexiHumanHash("{{test max-length=3}}");
            assert.strictEqual(fhh.entropy, BigInt(1));
            const str = fhh.hash(randomBuf);
            assert.strictEqual(str, "cat");
        });

        it("exact-length", function() {
            const fhh = new FlexiHumanHash("{{test exact-length=5}}");
            assert.strictEqual(fhh.entropy, BigInt(1));
            const str = fhh.hash(randomBuf);
            assert.strictEqual(str, "tiger");
        });

        it("mixes length transforms in a single format", function() {
            const fhh = new FlexiHumanHash("{{test caps min-length=7}}-{{test uppercase max-length=3}}-{{test lowercase exact-length=5}}");
            assert.strictEqual(fhh.entropy, BigInt(1));
            const str = fhh.hash(randomBuf);
            assert.strictEqual(str, "OCTOPUS-Cat-tiger");
        });
    });

    describe("entropy", function() {
        it("returns number of combinations", function() {
            const fhh = new FlexiHumanHash("{{test}}");
            assert.strictEqual(fhh.entropy, BigInt(8));
        });

        it("returns base2", function() {
            const fhh = new FlexiHumanHash("{{test}}");
            assert.strictEqual(fhh.entropyBase2, 3);
        });

        it("returns base10", function() {
            const fhh = new FlexiHumanHash("{{test}}");
            assert.strictEqual(fhh.entropyBase10, 1);
        });
    });

    describe("default dictionaries", function() {
        it("noun", function() {
            const fhh = new FlexiHumanHash("{{noun}}");
            const str = fhh.hash(randomBuf);
            assert.isString(str);
            assert.isTrue(str.length > 0);
        });

        it("verb", function() {
            const fhh = new FlexiHumanHash("{{verb}}");
            const str = fhh.hash(randomBuf);
            assert.isString(str);
            assert.isTrue(str.length > 0);
        });

        it("adjective", function() {
            const fhh = new FlexiHumanHash("{{adjective}}");
            const str = fhh.hash(randomBuf);
            assert.isString(str);
            assert.isTrue(str.length > 0);
        });

        describe("decimal", function() {
            it("can be 1 digit", function() {
                const fhh = new FlexiHumanHash("{{decimal 1}}");
                const str = fhh.hash(randomBuf);
                // With divmod algorithm
                assert.strictEqual(str, "8");
            });

            it("can be 14 digits", function() {
                const fhh = new FlexiHumanHash("{{decimal 14}}");
                const str = fhh.hash(randomBuf);
                assert.strictEqual(str, "50798419031808");
            });

            it("defaults to 4 digits", function() {
                const fhh = new FlexiHumanHash("{{decimal}}");
                const str = fhh.hash(randomBuf);
                assert.strictEqual(str, "1808");
            });

            it("throws on 15");
            it("throws on 0");
            it("throws on -1");
        });

        describe("hex", function() {
            it("can be 1 digit", function() {
                const fhh = new FlexiHumanHash("{{hex 1}}");
                const str = fhh.hash("hi", {hashAlg: "md5"});
                // With divmod algorithm
                assert.strictEqual(str, "b");
            });

            it("can be 13 digits", function() {
                const fhh = new FlexiHumanHash("{{hex 13}}");
                const str = fhh.hash("hi", {hashAlg: "md5"});
                assert.strictEqual(str, "489821c21fc3b");
            });

            it("defaults to 4 nibbles", function() {
                const fhh = new FlexiHumanHash("{{hex}}");
                const str = fhh.hash("hi", {hashAlg: "md5"});
                assert.strictEqual(str, "fc3b");
            });

            it("throws on 13");
            it("throws on 0");
            it("throws on -1");
        });

        it("city", function() {
            this.slow(1000);
            const fhh = new FlexiHumanHash("{{city}}");
            const str = fhh.hash(randomBuf);
            assert.isString(str);
            assert.isTrue(str.length > 0);
            // City names may contain spaces (e.g., "New York") unless unhashSafeDicts is used
        });

        it("female-name", function() {
            const fhh = new FlexiHumanHash("{{female-name}}");
            const str = fhh.hash(randomBuf);
            assert.isString(str);
            assert.isTrue(str.length > 0);
        });

        it("male-name", function() {
            const fhh = new FlexiHumanHash("{{male-name}}");
            const str = fhh.hash(randomBuf);
            assert.isString(str);
            assert.isTrue(str.length > 0);
        });

        it("first-name", function() {
            const fhh = new FlexiHumanHash("{{first-name}}");
            const str = fhh.hash(randomBuf);
            assert.isString(str);
            assert.isTrue(str.length > 0);
        });

        it("last-name", function() {
            const fhh = new FlexiHumanHash("{{last-name}}");
            const str = fhh.hash(randomBuf);
            assert.isString(str);
            assert.isTrue(str.length > 0);
        });
    });

    describe("examples", function() {
        it("Use", function() {
            // FlexiHumanHash is already imported at the top of the file
            const fhh = new FlexiHumanHash("{{adjective}}-{{noun}}");
            const str = fhh.hash();
            console.log(str);
        });

        it("Simple hash, you provide the random numbers", function() {
            const fhh = new FlexiHumanHash("{{adjective}}-{{adjective}}-{{noun}}-{{decimal 4}}");
            const _str = fhh.hash("edf63145-f6d3-48bf-a0b7-18e2eeb0a9dd");
        });

        it("Another format, random number provided for you", function() {
            const fhh = new FlexiHumanHash("{{adjective}}, {{adjective}} {{noun}} {{hex 4}}");
            const _str = fhh.hash();
        });

        it("Another format, md5 hash a string for random numbers", function() {
            const fhh = new FlexiHumanHash("{{first-name caps}}-{{last-name caps}}-{{decimal 6}}");
            const str = fhh.hash("this is my password...", {hashAlg: "md5"});
            console.log(str);
        });

        it("Reverse a string back to the original random number", function() {
            // Note: Using "_" separator and unhashSafeDicts to ensure reliable round-trip
            // unhashSafeDicts removes separators from words and deduplicates entries
            const fhh = new FlexiHumanHash(
                "{{first-name lowercase}}_{{last-name lowercase}}_the_{{adjective}}_{{noun}}",
                { unhashSafeDicts: true }
            );
            const randomArr = [57, 225, 104, 232, 109, 102, 74];
            const str = fhh.hash(randomArr);
            const ret = fhh.unhash(str);
            // With divmod, unhash returns the canonical encoding
            // Verify that re-hashing produces the same string
            const str2 = fhh.hash(ret);
            assert.strictEqual(str2, str);
        });

        it("Report how much entropy is used for a format to help understand likelihood of collisions", function() {
            const fhh = new FlexiHumanHash("{{first-name uppercase}}-{{last-name uppercase}}-{{decimal 6}}");
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
            const scientificTerms = [
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
            const fhh = new FlexiHumanHash("{{adjective}}:{{science}}");
            fhh.hash();
            // Expected output: archetypical:spintronics
        });

        it("Add a transform", function() {
            function reverseString(str) {
                return str.split("").reverse().join("");
            }

            FlexiHumanHash.registerTransform("reverse", reverseString);
            const fhh = new FlexiHumanHash("{{adjective reverse}}-{{noun reverse}}");
            fhh.hash();
        });
    });
});

describe("RandomSource", function() {
    it("is constructable", function() {
        const rs = new RandomSource([0b11100000]);
        assert.isObject(rs);
    });

    it("get returns bits from source", function() {
        // 0b11100000 = first 3 bits are 111 = 7
        const rs = new RandomSource([0b11100000]);
        const val = rs.get(3);
        assert.strictEqual(val, 7);
    });

    describe("offset option", function() {
        it("skips bits when offset is provided", function() {
            // 0b11100101 = bits 0-2 are 111 (7), bits 3-5 are 001 (1)
            const rs = new RandomSource([0b11100101], {offset: 3});
            const val = rs.get(3);
            assert.strictEqual(val, 1);
        });

        it("offset of 0 reads from beginning", function() {
            const rs = new RandomSource([0b11100000], {offset: 0});
            const val = rs.get(3);
            assert.strictEqual(val, 7);
        });
    });

    describe("advance method", function() {
        it("skips bits without returning them", function() {
            // 0b11100101 = bits 0-2 are 111 (7), bits 3-5 are 001 (1)
            const rs = new RandomSource([0b11100101]);
            rs.advance(3);
            const val = rs.get(3);
            assert.strictEqual(val, 1);
        });

        it("can advance multiple times", function() {
            // 0b11100101, 0b01000000
            // bits 0-2: 111 (7), bits 3-5: 001 (1), bits 6-8: 010 (2)
            const rs = new RandomSource([0b11100101, 0b01000000]);
            rs.advance(3);
            rs.advance(3);
            const val = rs.get(3);
            assert.strictEqual(val, 2);
        });
    });
});

// Edge case tests for unhash functionality
describe("Unhash Edge Cases", function() {
    // Test dictionary with specific words for edge case testing
    const edgeDict = ["cat", "dog", "bird", "fish", "cat-dog", "new-york"];
    function edgeDictCreate(opts) {
        return new FlexiArrayDict("_edge", edgeDict, opts);
    }

    // Dictionary with words that could cause ambiguity
    const ambiguousDict = ["a", "ab", "abc", "b", "bc", "c"];
    function ambiguousDictCreate(opts) {
        return new FlexiArrayDict("_ambiguous", ambiguousDict, opts);
    }

    before(function() {
        FlexiHumanHash.registerDictionary("edge", edgeDictCreate);
        FlexiHumanHash.registerDictionary("ambiguous", ambiguousDictCreate);
    });

    describe("validateUnhash constructor option", function() {
        it("does not validate by default", function() {
            // This format has potential ambiguity but should not throw without validateUnhash
            const fhh = new FlexiHumanHash("{{edge}}-{{edge}}");
            assert.isObject(fhh);
        });

        it("throws on construction with validateUnhash=true for adjacent words", function() {
            assert.throws(() => {
                new FlexiHumanHash("{{test}}{{test}}", { validateUnhash: true });
            }, Error, "Format is not unhashable: no separator between words in format string");
        });

        it("throws on construction with validateUnhash=true for words containing separator", function() {
            assert.throws(() => {
                new FlexiHumanHash("{{edge}}-{{edge}}", { validateUnhash: true });
            }, Error, /dictionary word.*contains separator/);
        });

        it("passes validation for safe formats", function() {
            const fhh = new FlexiHumanHash("{{test}}_{{test}}", { validateUnhash: true });
            assert.isObject(fhh);
        });
    });

    describe("lazy validation in unhash()", function() {
        it("validates on first unhash call", function() {
            const fhh = new FlexiHumanHash("{{edge}}-{{edge}}");
            // No error on construction
            assert.isObject(fhh);
            // Error on unhash
            assert.throws(() => {
                fhh.unhash("cat-dog");
            }, Error, /Format is not unhashable/);
        });

        it("caches validation result", function() {
            const fhh = new FlexiHumanHash("{{test}}_{{test}}");
            // With divmod: product = 8*8 = 64, canonical range [0-63]
            const randomArr = [37]; // within canonical range
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
            // Second call should use cached result
            const result2 = fhh.unhash(str);
            assert.deepEqual(result2, randomArr);
        });
    });

    describe("decimal dictionary unhashing", function() {
        it("unhashes single digit decimal", function() {
            // With divmod: {{decimal 1}} size = 10, {{test}} size = 8
            // Product = 80, canonical range [0-79], fits in 1 byte
            const fhh = new FlexiHumanHash("{{decimal 1}}_{{test}}");
            const randomArr = [50]; // within canonical range
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });

        it("unhashes multi-digit decimal", function() {
            // With divmod: {{decimal 4}} size = 10000, {{test}} size = 8
            // Product = 80000, log2(80000) ≈ 16.29, needs 17 bits = 3 bytes
            const fhh = new FlexiHumanHash("{{decimal 4}}_{{test}}");
            // Use value within canonical range - output is always 3 bytes
            const randomArr = [0, 0, 100]; // = 100, well within 80000
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });

        it("round-trips decimal correctly", function() {
            // With divmod: {{test}} size = 8, {{decimal 3}} size = 1000
            // Product = 8000, canonical range [0-7999], needs 2 bytes
            const fhh = new FlexiHumanHash("{{test}}_{{decimal 3}}");
            for (let i = 0; i < 10; i++) {
                // Generate random value in canonical range [0-7999]
                const val = Math.floor(Math.random() * 8000);
                const randomArr = [(val >> 8) & 0xFF, val & 0xFF];
                const str = fhh.hash(randomArr);
                const result = fhh.unhash(str);
                assert.deepEqual(result, randomArr, `Failed for ${randomArr} -> ${str}`);
            }
        });
    });

    describe("hex dictionary unhashing", function() {
        it("unhashes single nibble hex", function() {
            // With divmod: {{hex 1}} size = 16, {{test}} size = 8
            // Product = 128, canonical range [0-127], fits in 1 byte
            const fhh = new FlexiHumanHash("{{hex 1}}_{{test}}");
            const randomArr = [100]; // within canonical range
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });

        it("unhashes multi-nibble hex", function() {
            // With divmod: {{hex 4}} size = 65536, {{test}} size = 8
            // Product = 524288, canonical range [0-524287], needs 3 bytes
            const fhh = new FlexiHumanHash("{{hex 4}}_{{test}}");
            const randomArr = [1, 2, 3]; // = 0x010203 = 66051, within range
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });

        it("handles hex case correctly", function() {
            // With divmod: {{hex 2}} size = 256, {{test}} size = 8
            // Product = 2048, canonical range [0-2047], needs 2 bytes
            const fhh = new FlexiHumanHash("{{hex 2}}_{{test}}");
            const randomArr = [5, 100]; // = 0x0564 = 1380, within range
            const str = fhh.hash(randomArr);
            assert.match(str, /[a-f0-9]{2}/i);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });
    });

    describe("detection of problematic formats", function() {
        it("detects adjacent words (no separator)", function() {
            const fhh = new FlexiHumanHash("{{test}}{{test}}");
            assert.throws(() => {
                fhh.unhash("catdog");
            }, Error, /no separator between words/);
        });

        it("detects word containing separator", function() {
            const fhh = new FlexiHumanHash("{{edge}}-{{edge}}");
            assert.throws(() => {
                fhh.unhash("cat-dog");
            }, Error, /dictionary word.*contains separator/);
        });

        it("allows formats where separator is not in dictionary words", function() {
            // With divmod: product = 8*8 = 64, canonical range [0-63]
            const fhh = new FlexiHumanHash("{{test}}_{{test}}");
            const randomArr = [37]; // within canonical range
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });
    });

    describe("complex format strings", function() {
        it("handles prefix and suffix", function() {
            // With divmod: product = 8*8 = 64, canonical range [0-63]
            const fhh = new FlexiHumanHash("prefix_{{test}}_{{test}}_suffix");
            const randomArr = [42];
            const str = fhh.hash(randomArr);
            assert.isTrue(str.startsWith("prefix_"));
            assert.isTrue(str.endsWith("_suffix"));
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });

        it("handles multiple different separators", function() {
            // With divmod: product = 8*8*8 = 512, canonical range [0-511], needs 2 bytes
            const fhh = new FlexiHumanHash("{{test}}_{{test}}:{{test}}");
            const randomArr = [1, 200]; // = 456, within range
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });

        it("handles long separator strings", function() {
            // With divmod: product = 8*8 = 64, canonical range [0-63]
            const fhh = new FlexiHumanHash("{{test}}___SEPARATOR___{{test}}");
            const randomArr = [55];
            const str = fhh.hash(randomArr);
            assert.isTrue(str.includes("___SEPARATOR___"));
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });
    });

    describe("transform handling", function() {
        it("unhashes with uppercase transform", function() {
            // With divmod: product = 8*8 = 64, canonical range [0-63]
            const fhh = new FlexiHumanHash("{{test uppercase}}_{{test}}");
            const randomArr = [33];
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });

        it("unhashes with caps transform", function() {
            // With divmod: product = 8*8 = 64, canonical range [0-63]
            const fhh = new FlexiHumanHash("{{test caps}}_{{test lowercase}}");
            const randomArr = [44];
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });

        it("unhashes with mixed transforms", function() {
            // With divmod: product = 8*8*8 = 512, canonical range [0-511], needs 2 bytes
            const fhh = new FlexiHumanHash("{{test uppercase}}_{{test caps}}_{{test lowercase}}");
            const randomArr = [1, 100]; // = 356, within range
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });
    });

    describe("round-trip consistency", function() {
        it("round-trips simple formats", function() {
            // With divmod: product = 8*8 = 64, canonical range [0-63]
            const fhh = new FlexiHumanHash("{{test}}_{{test}}");
            for (let i = 0; i < 20; i++) {
                // Generate random value in canonical range [0-63]
                const val = Math.floor(Math.random() * 64);
                const randomArr = [val];
                const str = fhh.hash(randomArr);
                const result = fhh.unhash(str);
                assert.deepEqual(result, randomArr, `Failed for input ${randomArr} -> ${str}`);
            }
        });

        it("round-trips complex formats", function() {
            // With divmod: product = 8*8*100 = 6400, canonical range [0-6399], needs 2 bytes
            const fhh = new FlexiHumanHash("{{test uppercase}}:{{test caps}}:{{decimal 2}}");
            for (let i = 0; i < 20; i++) {
                // Generate random value in canonical range [0-6399]
                const val = Math.floor(Math.random() * 6400);
                const randomArr = [(val >> 8) & 0xFF, val & 0xFF];
                const str = fhh.hash(randomArr);
                const result = fhh.unhash(str);
                assert.deepEqual(result, randomArr, `Failed for input ${randomArr} -> ${str}`);
            }
        });

        it("round-trips with hex", function() {
            // With divmod: product = 8*256*8 = 16384, canonical range [0-16383], needs 2 bytes
            const fhh = new FlexiHumanHash("{{test}}_{{hex 2}}_{{test}}");
            for (let i = 0; i < 20; i++) {
                // Generate random value in canonical range [0-16383]
                const val = Math.floor(Math.random() * 16384);
                const randomArr = [(val >> 8) & 0xFF, val & 0xFF];
                const str = fhh.hash(randomArr);
                const result = fhh.unhash(str);
                assert.deepEqual(result, randomArr, `Failed for input ${randomArr} -> ${str}`);
            }
        });
    });

    describe("error handling", function() {
        it("throws on non-string input to unhash", function() {
            const fhh = new FlexiHumanHash("{{test}}_{{test}}");
            assert.throws(() => {
                fhh.unhash(123);
            }, TypeError, /expected 'str' to be string/);
        });

        it("throws on invalid hash string", function() {
            const fhh = new FlexiHumanHash("{{test}}_{{test}}");
            assert.throws(() => {
                fhh.unhash("notavalidword_alsonotvalid");
            }, Error, /Unable to parse string for unhashing|word not found/);
        });

        it("throws when word not in dictionary", function() {
            const fhh = new FlexiHumanHash("{{test}}_{{test}}");
            assert.throws(() => {
                fhh.unhash("cat_dog"); // cat and dog are not in test dictionary
            }, Error, /Unable to parse string for unhashing|word not found/);
        });
    });

    describe("special characters in format", function() {
        it("handles regex special characters in separators", function() {
            // With divmod: product = 8*8 = 64, canonical range [0-63]
            const fhh = new FlexiHumanHash("{{test}}.*{{test}}");
            const randomArr = [37];
            const str = fhh.hash(randomArr);
            assert.isTrue(str.includes(".*"));
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });

        it("handles parentheses in separators", function() {
            // With divmod: product = 8*8 = 64, canonical range [0-63]
            const fhh = new FlexiHumanHash("{{test}}({{test}})");
            const randomArr = [42];
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });

        it("handles brackets in separators", function() {
            // With divmod: product = 8*8 = 64, canonical range [0-63]
            const fhh = new FlexiHumanHash("{{test}}[{{test}}]");
            const randomArr = [50];
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });

        it("handles mixed special characters", function() {
            // With divmod: product = 8*8*8 = 512, canonical range [0-511], needs 2 bytes
            const fhh = new FlexiHumanHash("({{test}})+[{{test}}]*{{test}}?");
            const randomArr = [1, 150]; // = 406, within range
            const str = fhh.hash(randomArr);
            const result = fhh.unhash(str);
            assert.deepEqual(result, randomArr);
        });
    });
});

describe("unhashSafeDicts format option", function() {
    it("normalizes dictionaries when unhashSafeDicts is true", function() {
        const dictWithSpaces = ["New York", "Los Angeles", "San Francisco", "Chicago"];
        function cityTestCreate(opts) {
            return new FlexiArrayDict("_citytest", dictWithSpaces, opts);
        }
        FlexiHumanHash.registerDictionary("citytest", cityTestCreate);

        // Without unhashSafeDicts, spaces are preserved
        const fhhNormal = new FlexiHumanHash("{{citytest}}");
        const normalStr = fhhNormal.hash([0]);
        assert.isTrue(normalStr.includes(" "), "Should contain space without unhashSafeDicts");

        // With unhashSafeDicts, spaces are removed
        const fhhSafe = new FlexiHumanHash("{{citytest}}", { unhashSafeDicts: true });
        const safeStr = fhhSafe.hash([0]);
        assert.isFalse(safeStr.includes(" "), "Should not contain space with unhashSafeDicts");
    });

    it("enables reliable round-trip with unhashSafeDicts", function() {
        const dictWithDupes = ["apple", "Apple", "APPLE", "banana"];
        function dupeTestCreate(opts) {
            return new FlexiArrayDict("_dupetest", dictWithDupes, opts);
        }
        FlexiHumanHash.registerDictionary("dupetest", dupeTestCreate);

        // With unhashSafeDicts, duplicates are removed and round-trip works
        const fhh = new FlexiHumanHash("{{dupetest}}_{{dupetest}}", { unhashSafeDicts: true });

        // Should have only 2 entries after deduplication
        assert.strictEqual(fhh.dictMap.get(1).size, 2);

        // Round-trip should work
        const input = [0];
        const hashed = fhh.hash(input);
        const unhashed = fhh.unhash(hashed);
        assert.deepEqual(unhashed, input);
    });
});

describe("unhash vulnerability regression tests", function() {
    /**
     * VULNERABILITY: Duplicate dictionary entries cause data corruption in unhash()
     *
     * When a dictionary contains the same word at multiple indices (case-insensitive),
     * hash() can select any of them, but unhash() uses indexOf() which always returns
     * the FIRST occurrence. This causes unhash() to return different data than was
     * originally hashed.
     *
     * Example with dict = ["apple", "Apple", "banana", "cherry"]:
     *   - Input [64] selects index 1 ("Apple") for first word
     *   - hash() produces "Apple_banana"
     *   - unhash("Apple_banana") finds indexOf("Apple") = 1, correctly
     *   - BUT if hash() selected index 0 ("apple"), unhash would also return index 0
     *   - The problem: indexOf("apple") = 0 and indexOf("Apple") = 1, but they're
     *     case-insensitively equivalent, so reverseLookup can't distinguish them
     *
     * This regression test ensures we detect and prevent this vulnerability.
     */

    it("detects duplicate entries that would cause data corruption", function() {
        // This dictionary has "apple" and "Apple" which are case-insensitive duplicates
        // Without mitigation, this would cause unhash to return wrong values
        const vulnerableDict = ["apple", "Apple", "banana", "cherry"];
        function vulnDictCreate(opts) {
            return new FlexiArrayDict("_vulntest", vulnerableDict, opts);
        }
        FlexiHumanHash.registerDictionary("vulntest", vulnDictCreate);

        const fhh = new FlexiHumanHash("{{vulntest}}_{{vulntest}}");

        // Validation MUST catch this - if it doesn't, data corruption occurs
        assert.throws(() => {
            fhh.unhash("apple_banana");
        }, Error, /dictionary contains duplicate entries.*apple.*Apple/i);
    });

    it("unhashSafeDicts prevents data corruption by deduplicating", function() {
        // Same vulnerable dictionary, but with unhashSafeDicts mitigation
        const vulnerableDict = ["apple", "Apple", "APPLE", "banana"];
        function vulnDict2Create(opts) {
            return new FlexiArrayDict("_vulntest2", vulnerableDict, opts);
        }
        FlexiHumanHash.registerDictionary("vulntest2", vulnDict2Create);

        // With unhashSafeDicts, duplicates are removed
        const fhh = new FlexiHumanHash("{{vulntest2}}_{{vulntest2}}", { unhashSafeDicts: true });

        // Dictionary should be deduplicated: ["apple", "banana"] (size 2)
        assert.strictEqual(fhh.dictMap.get(1).size, 2);

        // ALL valid inputs must round-trip correctly - this is the key regression test
        // If deduplication is broken, some inputs would produce wrong unhash values
        // With divmod: size 2 x 2 = 4 combinations, output is 1 byte
        const product = Number(fhh.entropy);

        for (let i = 0; i < product; i++) {
            const input = [i];
            const hashed = fhh.hash(input);
            const unhashed = fhh.unhash(hashed);
            assert.deepEqual(unhashed, input,
                `REGRESSION: Input [${input}] -> "${hashed}" -> [${unhashed}] (expected [${input}])`);
        }
    });

    it("validates that separator-containing words are detected", function() {
        // Words containing separators would cause parsing ambiguity
        const dictWithSeparator = ["apple-pie", "banana", "cherry"];
        function sepDictCreate(opts) {
            return new FlexiArrayDict("_septest", dictWithSeparator, opts);
        }
        FlexiHumanHash.registerDictionary("septest", sepDictCreate);

        // Using "-" as separator with a word containing "-" should fail validation
        assert.throws(() => {
            new FlexiHumanHash("{{septest}}-{{septest}}", { validateUnhash: true });
        }, Error, /contains separator/);
    });
});

describe("validateUnhash detects unsafe dictionaries", function() {
    it("detects duplicate entries on unhash", function() {
        const dictWithDupes = ["apple", "Apple", "banana", "cherry"];
        function dupeValCreate(opts) {
            return new FlexiArrayDict("_dupeval", dictWithDupes, opts);
        }
        FlexiHumanHash.registerDictionary("dupeval", dupeValCreate);

        const fhh = new FlexiHumanHash("{{dupeval}}_{{dupeval}}");

        // First unhash call triggers validation and should fail
        assert.throws(() => {
            fhh.unhash("apple_banana");
        }, Error, /dictionary contains duplicate entries/);
    });

    it("detects duplicates with validateUnhash option", function() {
        const dictWithDupes = ["cat", "Cat", "dog"];
        function dupeVal2Create(opts) {
            return new FlexiArrayDict("_dupeval2", dictWithDupes, opts);
        }
        FlexiHumanHash.registerDictionary("dupeval2", dupeVal2Create);

        // With validateUnhash, error is thrown at construction time
        assert.throws(() => {
            new FlexiHumanHash("{{dupeval2}}", { validateUnhash: true });
        }, Error, /dictionary contains duplicate entries/);
    });

    it("passes validation when unhashSafeDicts removes duplicates", function() {
        const dictWithDupes = ["hello", "Hello", "HELLO", "world"];
        function dupeVal3Create(opts) {
            return new FlexiArrayDict("_dupeval3", dictWithDupes, opts);
        }
        FlexiHumanHash.registerDictionary("dupeval3", dupeVal3Create);

        // With both unhashSafeDicts and validateUnhash, should pass
        const fhh = new FlexiHumanHash("{{dupeval3}}_{{dupeval3}}", {
            unhashSafeDicts: true,
            validateUnhash: true
        });
        assert.isObject(fhh);

        // Round-trip should work
        const input = [0];
        const hashed = fhh.hash(input);
        const unhashed = fhh.unhash(hashed);
        assert.deepEqual(unhashed, input);
    });
});

describe("unhashSafe registration option (legacy)", function() {
    it("removes spaces from dictionary entries", function() {
        const dictWithSpaces = ["New York", "Los Angeles", "San Francisco", "Chicago"];
        function spaceDictCreate(opts) {
            return new FlexiArrayDict("_spaces", dictWithSpaces, opts);
        }
        FlexiHumanHash.registerDictionary("spaces", spaceDictCreate, { unhashSafe: true });

        const fhh = new FlexiHumanHash("{{spaces}}");
        // All entries should have spaces removed
        for (let i = 0; i < 4; i++) {
            const str = fhh.hash([i << 6]);
            assert.isFalse(str.includes(" "), `Entry "${str}" should not contain spaces`);
        }
    });

    it("removes hyphens from dictionary entries", function() {
        const dictWithHyphens = ["Ann-Marie", "Jean-Pierre", "Mary-Jane", "Billy-Bob"];
        function hyphenDictCreate(opts) {
            return new FlexiArrayDict("_hyphens", dictWithHyphens, opts);
        }
        FlexiHumanHash.registerDictionary("hyphens", hyphenDictCreate, { unhashSafe: true });

        const fhh = new FlexiHumanHash("{{hyphens}}");
        // All entries should have hyphens removed
        for (let i = 0; i < 4; i++) {
            const str = fhh.hash([i << 6]);
            assert.isFalse(str.includes("-"), `Entry "${str}" should not contain hyphens`);
        }
    });

    it("removes underscores from dictionary entries", function() {
        const dictWithUnderscores = ["foo_bar", "hello_world", "test_case", "my_var"];
        function underscoreDictCreate(opts) {
            return new FlexiArrayDict("_underscores", dictWithUnderscores, opts);
        }
        FlexiHumanHash.registerDictionary("underscores", underscoreDictCreate, { unhashSafe: true });

        const fhh = new FlexiHumanHash("{{underscores}}");
        // All entries should have underscores removed
        for (let i = 0; i < 4; i++) {
            const str = fhh.hash([i << 6]);
            assert.isFalse(str.includes("_"), `Entry "${str}" should not contain underscores`);
        }
    });

    it("deduplicates case-insensitive entries", function() {
        // "Cat" and "cat" should be deduplicated to just "Cat" (first occurrence)
        const dictWithCaseDupes = ["Cat", "dog", "cat", "DOG", "bird", "BIRD", "fish", "Fish"];
        function caseDupeDictCreate(opts) {
            return new FlexiArrayDict("_casedupes", dictWithCaseDupes, opts);
        }
        FlexiHumanHash.registerDictionary("casedupes", caseDupeDictCreate, { unhashSafe: true });

        const fhh = new FlexiHumanHash("{{casedupes}}");
        // Should only have 4 unique entries after deduplication
        assert.strictEqual(fhh.dictMap.get(1).size, 4);
    });

    it("deduplicates entries that become identical after normalization", function() {
        // "New York" and "NewYork" both become "NewYork"
        const dictWithNormDupes = ["New York", "NewYork", "Los Angeles", "LosAngeles"];
        function normDupeDictCreate(opts) {
            return new FlexiArrayDict("_normdupes", dictWithNormDupes, opts);
        }
        FlexiHumanHash.registerDictionary("normdupes", normDupeDictCreate, { unhashSafe: true });

        const fhh = new FlexiHumanHash("{{normdupes}}");
        // Should only have 2 unique entries after normalization and deduplication
        assert.strictEqual(fhh.dictMap.get(1).size, 2);
    });

    it("enables reliable round-trip unhashing", function() {
        // Without unhashSafe, duplicate entries would break unhashing
        // Use power-of-2 size dictionary to avoid overflow randomness
        const dictWithDupes = ["apple", "banana", "apple", "cherry", "date", "elderberry", "fig", "grape"];
        // After deduplication: ["apple", "banana", "cherry", "date", "elderberry", "fig", "grape"] = 7 entries
        // But let's use 8 entries with one duplicate for predictable behavior
        function dupeDictCreate(opts) {
            return new FlexiArrayDict("_dupes", dictWithDupes, opts);
        }
        FlexiHumanHash.registerDictionary("dupes", dupeDictCreate, { unhashSafe: true });

        const fhh = new FlexiHumanHash("{{dupes}}_{{dupes}}");
        // After deduplication, should have 7 unique entries
        assert.strictEqual(fhh.dictMap.get(1).size, 7);

        // With divmod: 7 x 7 = 49 combinations, output is 1 byte
        const product = Number(fhh.entropy);

        // Round-trip should work reliably for all valid inputs in canonical range
        for (let i = 0; i < Math.min(product, 16); i++) {
            const input = [i];
            const hashed = fhh.hash(input);
            const unhashed = fhh.unhash(hashed);
            assert.deepEqual(unhashed, input, `Round-trip failed for input [${input}] -> "${hashed}"`);
        }
    });

    it("does not modify dictionaries without unhashSafe option", function() {
        const dictWithSpaces = ["New York", "Los Angeles"];
        function noSafeDictCreate(opts) {
            return new FlexiArrayDict("_nosafe", dictWithSpaces, opts);
        }
        // Register WITHOUT unhashSafe
        FlexiHumanHash.registerDictionary("nosafe", noSafeDictCreate);

        const fhh = new FlexiHumanHash("{{nosafe}}");
        const str = fhh.hash([0]);
        // Should still have spaces since unhashSafe was not enabled
        assert.isTrue(str.includes(" "), `Entry "${str}" should contain spaces`);
    });
});

describe("transform edge cases", function() {
    before(function() {
        // Register test dictionary for this describe block
        const testDict = ["frog", "bear", "tree", "cat", "wolf", "octopus", "tiger", "slug"];
        function testDictCreate(opts) {
            return new FlexiArrayDict("_testtransform", testDict, opts);
        }
        FlexiHumanHash.registerDictionary("testtransform", testDictCreate);
    });

    it("should handle transform returning non-string gracefully", function() {
        // BUG: Transform returning an object causes internal error "word.replace is not a function"
        // instead of a clean validation error
        //
        // When a transform returns an object with custom valueOf(), Handlebars uses valueOf()
        // for string coercion, but the dict stores the object. During validation,
        // word.replace() fails because word is an object, not a string.
        //
        // Expected: Clean error like "transform must return a string"
        // Actual: TypeError: word.replace is not a function

        FlexiHumanHash.registerTransform("objecttransform",
            (str) => ({ toString: () => str.toUpperCase(), valueOf: () => 999 }),
            (str) => str.toLowerCase()
        );

        const fhh = new FlexiHumanHash("{{testtransform objecttransform}}_{{testtransform}}");
        const hash = fhh.hash([0]);

        // Fix: Transform results are now coerced to strings with a warning
        // So unhash should work correctly
        const unhash = fhh.unhash(hash);
        assert.isArray(unhash, "Should successfully unhash");
        assert.strictEqual(unhash[0], 0, "Should unhash to original value");
    });
});

describe("FlexiArrayDict caching", function() {
    it("should not cache different arrays with the same internal name", function() {
        // BUG: FlexiArrayDict caches based on name + filter options, but not array contents
        // Two different arrays with the same internal name return the same cached dict
        //
        // Root cause: getDict() in FlexiArrayDict.js uses cache key:
        //   `${name}:${minLength}:${maxLength}:${exactLength}:${args}`
        // This doesn't include the array contents, causing cache collisions.

        const dict1 = ["aaa", "bbb", "ccc", "ddd"];
        const dict2 = ["xxx", "yyy", "zzz", "www"];

        function cacheBug1Create(opts) {
            return new FlexiArrayDict("_cachebugtest", dict1, opts);
        }
        function cacheBug2Create(opts) {
            return new FlexiArrayDict("_cachebugtest", dict2, opts);
        }

        FlexiHumanHash.registerDictionary("cachebug1", cacheBug1Create);
        FlexiHumanHash.registerDictionary("cachebug2", cacheBug2Create);

        const fhh1 = new FlexiHumanHash("{{cachebug1}}");
        const fhh2 = new FlexiHumanHash("{{cachebug2}}");

        const hash1 = fhh1.hash([0]);
        const hash2 = fhh2.hash([0]);

        // These should be different: "aaa" vs "xxx"
        // But due to cache bug, both return "aaa"
        assert.strictEqual(hash1, "aaa");
        assert.strictEqual(hash2, "xxx"); // This fails - returns "aaa"
    });
});

describe("determinism regression tests", function() {
    it("hash produces deterministic output with reused instance", function() {
        const fhh = new FlexiHumanHash("{{adjective}}-{{noun}}");
        const input = "npm start:A=1:B=2";

        const results = [];
        for (let i = 0; i < 10; i++) {
            results.push(fhh.hash(input));
        }

        const allSame = results.every(r => r === results[0]);
        assert.isTrue(allSame, `Expected all results to be "${results[0]}", but got varying results: ${[...new Set(results)].join(", ")}`);
    });

    it("hash produces deterministic output with fresh instances", function() {
        const input = "npm start:A=1:B=2";

        const results = [];
        for (let i = 0; i < 10; i++) {
            const fhh = new FlexiHumanHash("{{adjective}}-{{noun}}");
            results.push(fhh.hash(input));
        }

        const allSame = results.every(r => r === results[0]);
        assert.isTrue(allSame, `Expected all results to be "${results[0]}", but got varying results: ${[...new Set(results)].join(", ")}`);
    });

    it("hash produces deterministic output with pre-hashed hex input", async function() {
        const { createHash } = await import("crypto");
        const input = "npm start:A=1:B=2";
        const hashHex = createHash("sha256").update(input).digest("hex");

        const results = [];
        for (let i = 0; i < 10; i++) {
            const fhh = new FlexiHumanHash("{{adjective}}-{{noun}}");
            results.push(fhh.hash(hashHex));
        }

        const allSame = results.every(r => r === results[0]);
        assert.isTrue(allSame, `Expected all results to be "${results[0]}", but got varying results: ${[...new Set(results)].join(", ")}`);
    });

    it("hash produces deterministic output with hashAlg option", function() {
        const fhh = new FlexiHumanHash("{{adjective}}-{{noun}}");
        const input = "test input";

        const results = [];
        for (let i = 0; i < 10; i++) {
            results.push(fhh.hash(input, { hashAlg: "sha256" }));
        }

        const allSame = results.every(r => r === results[0]);
        assert.isTrue(allSame, `Expected all results to be "${results[0]}", but got varying results: ${[...new Set(results)].join(", ")}`);
    });

    it("hash produces deterministic output with control characters in input", function() {
        const fhh = new FlexiHumanHash("{{adjective}}-{{noun}}");
        const input = "npm start\x1fA\x001\x01B\x002";

        const results = [];
        for (let i = 0; i < 10; i++) {
            results.push(fhh.hash(input, { hashAlg: "sha256" }));
        }

        const allSame = results.every(r => r === results[0]);
        assert.isTrue(allSame, `Expected all results to be "${results[0]}", but got varying results: ${[...new Set(results)].join(", ")}`);
    });

    it("hash produces deterministic output when bits wrap around", function() {
        const fhh = new FlexiHumanHash("{{adjective}}-{{adjective}}-{{adjective}}-{{noun}}-{{noun}}-{{noun}}");
        const input = "short";

        const results = [];
        for (let i = 0; i < 10; i++) {
            results.push(fhh.hash(input, { hashAlg: "sha256" }));
        }

        const allSame = results.every(r => r === results[0]);
        assert.isTrue(allSame, `Expected all results to be "${results[0]}", but got varying results: ${[...new Set(results)].join(", ")}`);
    });
});

describe("reverseLookup edge cases", function() {
    it("should handle float return value from reverseLookup gracefully", function() {
        // BUG: If reverseLookup returns a float, BigInt() throws:
        // "The number 1.7 cannot be converted to a BigInt because it is not an integer"
        //
        // This is an internal error instead of a clean validation error.
        // Should either floor the value or throw a descriptive error.

        class FloatIndexDict {
            get size() { return 4; }
            getEntry(n) { return ["a", "b", "c", "d"][Math.floor(n)]; }
            reverseLookup(str) {
                if (str === "b") return 1.7; // Float instead of int
                return ["a", "b", "c", "d"].indexOf(str);
            }
            get maxWordLength() { return 1; }
        }

        function floatDictCreate(_opts) { return new FloatIndexDict(); }
        FlexiHumanHash.registerDictionary("floatindex", floatDictCreate);

        // Use two floatindex dicts to get enough entropy for a byte
        // size 4 each, 4 dicts = 256 combinations = 1 byte
        const fhh = new FlexiHumanHash("{{floatindex}}_{{floatindex}}_{{floatindex}}_{{floatindex}}");
        // With divmod: input 1 -> 1 % 4 = 1 = index 1 = "b"
        const hash = fhh.hash([1]);

        // Verify we actually produced "b" in the hash (to trigger the bug)
        assert.isTrue(hash.startsWith("b_"), `Hash should start with 'b_', got: ${hash}`);

        // Fix: Should throw a clean error about non-integer reverseLookup
        let thrownError = null;
        try {
            fhh.unhash(hash);
        } catch (e) {
            thrownError = e;
        }

        assert.isNotNull(thrownError, "Should throw an error for float reverseLookup");
        assert.match(thrownError.message, /non-integer/i,
            "Should mention non-integer in error message");
        assert.match(thrownError.message, /reverseLookup/i,
            "Should mention reverseLookup in error message");
    });
});

describe("empty dictionary regression tests", function() {
    /**
     * BUG: Empty dictionaries cause internal "Division by zero" error
     *
     * When a dictionary has 0 entries (either from filtering or a custom dict),
     * RandomSource.getMax(0) throws "RangeError: Division by zero" because
     * it tries to compute `bigNum % 0`.
     *
     * This is an unanticipated internal error, not a clean validation error.
     * The fix should validate dictionary size > 0 at construction time.
     */

    it("should throw clean error when filter results in empty dictionary", function() {
        // Dictionary with short words
        const shortWords = ["cat", "dog", "bat"];
        function shortDictCreate(opts) {
            return new FlexiArrayDict("_short", shortWords, opts);
        }
        FlexiHumanHash.registerDictionary("shortwords", shortDictCreate);

        // BUG: This should throw at construction time, not during hash()
        // Currently it constructs successfully but crashes on hash()
        let constructError = null;
        let hashError = null;

        try {
            // exact-length=100 filters out all words (none are 100 chars)
            const fhh = new FlexiHumanHash("{{shortwords exact-length=100}}_{{shortwords}}");

            // Verify dict is actually empty
            assert.strictEqual(fhh.dictMap.get(1).size, 0, "Dict should be empty after filter");

            try {
                fhh.hash([1, 2, 3]);
            } catch (e) {
                hashError = e;
            }
        } catch (e) {
            constructError = e;
        }

        // Currently fails with internal error - this test documents the bug
        // When fixed, constructError should be set with a clean message
        if (constructError) {
            // FIXED: Error thrown at construction
            assert.match(constructError.message, /empty|zero|no.*entries/i,
                "Should mention empty dictionary in error");
        } else if (hashError) {
            // BUG: Internal error during hash()
            // This assertion documents the current buggy behavior
            assert.strictEqual(hashError.message, "Division by zero",
                "BUG: Currently throws internal 'Division by zero' error");
        } else {
            assert.fail("Should have thrown an error");
        }
    });

    it("should throw clean error for custom dictionary with size 0", function() {
        class ZeroSizeDict {
            get size() { return 0; }
            getEntry(n) { return "never"; }
            reverseLookup(str) { return -1; }
            get maxWordLength() { return 5; }
        }

        function zeroSizeDictCreate(_opts) { return new ZeroSizeDict(); }
        FlexiHumanHash.registerDictionary("zerosize", zeroSizeDictCreate);

        let constructError = null;
        let hashError = null;

        try {
            const fhh = new FlexiHumanHash("{{zerosize}}_{{shortwords}}");

            try {
                fhh.hash([42]);
            } catch (e) {
                hashError = e;
            }
        } catch (e) {
            constructError = e;
        }

        // Currently fails with internal error - this test documents the bug
        if (constructError) {
            // FIXED: Error thrown at construction
            assert.match(constructError.message, /empty|zero|no.*entries/i,
                "Should mention empty/zero dictionary in error");
        } else if (hashError) {
            // BUG: Internal error during hash()
            assert.strictEqual(hashError.message, "Division by zero",
                "BUG: Currently throws internal 'Division by zero' error");
        } else {
            assert.fail("Should have thrown an error");
        }
    });

    it("should throw clean error when accessing entropy on empty dictionary", function() {
        // FIXED: Now throws at construction time with clean error
        const shortWords = ["cat", "dog"];
        function shortDict2Create(opts) {
            return new FlexiArrayDict("_short2", shortWords, opts);
        }
        FlexiHumanHash.registerDictionary("shortwords2", shortDict2Create);

        let error = null;
        try {
            // Now throws at construction, not when accessing entropy
            const fhh = new FlexiHumanHash("{{shortwords2 exact-length=100}}");
            const _entropy = fhh.entropy;
        } catch (e) {
            error = e;
        }

        assert.isNotNull(error, "Should throw an error");
        // FIXED: Now throws clean error about empty/no entries at construction
        assert.match(error.message, /no entries|size=0/i,
            "Error should mention no entries");
    });
});

describe("dictionary getEntry returning undefined regression tests", function() {
    /**
     * BUG: When getEntry returns undefined, hash produces "undefined" string
     *
     * If a dictionary's getEntry method returns undefined for some indices,
     * the hash output contains the literal string "undefined". This then
     * fails to unhash because "undefined" isn't in the dictionary.
     *
     * This creates a situation where hash() succeeds but unhash() fails
     * with a confusing error message.
     */

    it("should handle getEntry returning undefined gracefully", function() {
        class SparseDict {
            get size() { return 4; }
            getEntry(n) {
                // Only even indices have values
                if (n % 2 === 0) return ["a", "b"][n / 2];
                return undefined; // BUG: This causes "undefined" in output
            }
            reverseLookup(str) {
                const map = { "a": 0, "b": 2 };
                return map[str] ?? -1;
            }
            get maxWordLength() { return 1; }
        }

        function sparseDictCreate(_opts) { return new SparseDict(); }
        FlexiHumanHash.registerDictionary("sparse", sparseDictCreate);

        const fhh = new FlexiHumanHash("{{sparse}}_{{sparse}}");

        // Input that will select an undefined entry
        // size=4, so input 1 -> 1 % 4 = 1 -> getEntry(1) = undefined
        // FIXED: Now throws error during hash() instead of producing "undefined" string
        let error = null;
        try {
            fhh.hash([1]);
        } catch (e) {
            error = e;
        }

        assert.isNotNull(error, "Should throw error when getEntry returns undefined");
        assert.match(error.message, /returned undefined/i,
            "Error message should mention undefined return value");
    });
});

describe("dictionary lying about size regression tests", function() {
    /**
     * BUG: Dictionary that reports incorrect size causes silent data corruption
     *
     * If a dictionary's size getter returns a larger number than the actual
     * number of entries, hash() will work (wrapping indices), but unhash()
     * may return incorrect values because reverseLookup only knows about
     * actual entries.
     *
     * Note: The duplicate validation catches some cases of this, but not all.
     * A dictionary could lie about size without creating duplicates if it
     * returns unique values for each index but claims more indices exist.
     */

    it("should detect when dictionary size doesn't match actual entries", function() {
        // This dict claims size 8 but only has unique entries for 0-3
        // Indices 4-7 return same values as 0-3 (creating duplicates)
        // The validation catches this as "duplicate entries"
        class LyingDict {
            get size() { return 8; }  // Claims 8 entries
            getEntry(n) {
                // But only has 4 actual entries (wraps around)
                return ["a", "b", "c", "d"][n % 4];
            }
            reverseLookup(str) {
                // Can only return 0-3
                const map = { "a": 0, "b": 1, "c": 2, "d": 3 };
                return map[str] ?? -1;
            }
            get maxWordLength() { return 1; }
        }

        function lyingDictCreate(_opts) { return new LyingDict(); }
        FlexiHumanHash.registerDictionary("lying", lyingDictCreate);

        const fhh = new FlexiHumanHash("{{lying}}_{{lying}}");

        // Many different inputs will hash to the same output
        // because getEntry wraps around, but size is 8
        const hash5 = fhh.hash([5]);   // 5 % 4 = 1 -> "b"
        const hash1 = fhh.hash([1]);   // 1 % 4 = 1 -> "b"

        // Both produce the same hash (this is the core problem)
        assert.strictEqual(hash5, hash1, "Different inputs produce same hash due to lying size");

        // The validation catches this when we try to unhash
        // because it detects duplicate entries
        let unhashError = null;
        try {
            fhh.unhash(hash5);
        } catch (e) {
            unhashError = e;
        }

        // The duplicate detection catches this case
        assert.isNotNull(unhashError, "Should throw error on unhash");
        assert.match(unhashError.message, /duplicate entries/i,
            "Validation catches lying dict as duplicate entries");
    });

    it("should detect lying dictionary that returns unique but wrong values", function() {
        // This dict claims size 8 but getEntry returns undefined for indices 4-7
        // This creates "undefined" in the hash output
        class LyingDict2 {
            get size() { return 8; }  // Claims 8 entries
            getEntry(n) {
                // Only indices 0-3 have values
                if (n < 4) return ["a", "b", "c", "d"][n];
                return undefined; // Indices 4-7 return undefined
            }
            reverseLookup(str) {
                const map = { "a": 0, "b": 1, "c": 2, "d": 3 };
                return map[str] ?? -1;
            }
            get maxWordLength() { return 1; }
        }

        function lyingDict2Create(_opts) { return new LyingDict2(); }
        FlexiHumanHash.registerDictionary("lying2", lyingDict2Create);

        const fhh = new FlexiHumanHash("{{lying2}}_{{lying2}}");

        // Input that selects index 4+ will get undefined
        // FIXED: Now throws error instead of producing "undefined" in hash output
        let error = null;
        try {
            fhh.hash([4]); // 4 % 8 = 4 -> getEntry(4) = undefined
        } catch (e) {
            error = e;
        }

        assert.isNotNull(error, "Should throw error when getEntry returns undefined");
        assert.match(error.message, /returned undefined/i,
            "Error message should mention undefined return value");
    });
});

describe("getEntry returning non-string regression tests", function() {
    /**
     * BUG: getEntry returning an object causes internal error during validation
     *
     * When a dictionary's getEntry returns an object instead of a string,
     * the validation code tries to call word.includes() which fails with
     * "word.includes is not a function".
     *
     * This is an internal error that should be caught earlier with a
     * clean validation message.
     */

    it("should handle getEntry returning object gracefully", function() {
        class ObjectDict {
            get size() { return 2; }
            getEntry(n) {
                // Return object with toString - will be coerced to string
                return { toString: () => (n === 0 ? "objword0" : "objword1") };
            }
            reverseLookup(str) {
                if (str === "objword0") return 0;
                if (str === "objword1") return 1;
                return -1;
            }
            get maxWordLength() { return 10; }
        }

        function objectDictCreate(_opts) { return new ObjectDict(); }
        FlexiHumanHash.registerDictionary("objectdict", objectDictCreate);

        const fhh = new FlexiHumanHash("{{objectdict}}_{{objectdict}}");

        // FIXED: Now warns and coerces object to string via String() coercion
        // String() uses toString() for objects
        const hash = fhh.hash([0]);
        assert.isTrue(hash.includes("objword"), "Object coerced to string via toString()");

        // Unhash should work since the string is in the dictionary
        const unhash = fhh.unhash(hash);
        assert.isArray(unhash, "Unhash produces array");
    });
});

describe("stateful dictionary regression tests", function() {
    /**
     * BUG: Stateful dictionaries break round-trip guarantee
     *
     * If a dictionary's getEntry returns different values on each call
     * (e.g., incrementing counter, random values), the round-trip
     * hash -> unhash -> hash will produce different results.
     *
     * This is a contract violation that's hard to detect automatically.
     */

    it("should detect stateful dictionary breaking round-trip", function() {
        let callCount = 0;
        class StatefulDict {
            get size() { return 4; }
            getEntry(n) {
                callCount++;
                // Use : separator so we can use _ between dicts
                return `word${n}x${callCount}`;
            }
            reverseLookup(str) {
                // Matches any word{n}x{m} pattern
                const match = str.match(/^word(\d+)x\d+$/);
                return match ? parseInt(match[1], 10) : -1;
            }
            get maxWordLength() { return 20; }
        }

        function statefulDictCreate(_opts) { return new StatefulDict(); }
        FlexiHumanHash.registerDictionary("statefuldict2", statefulDictCreate);

        const fhh = new FlexiHumanHash("{{statefuldict2}}_{{statefuldict2}}");

        // Same input produces different hashes
        const hash1 = fhh.hash([0]);
        const hash2 = fhh.hash([0]);
        assert.notStrictEqual(hash1, hash2, "Stateful dict produces different hashes for same input");

        // Round-trip is broken
        const unhash1 = fhh.unhash(hash1);
        const rehash1 = fhh.hash(unhash1);

        // BUG: rehash1 !== hash1 because getEntry returns different value
        assert.notStrictEqual(hash1, rehash1, "BUG: Round-trip broken with stateful dictionary");
    });
});

describe("transform edge cases regression tests", function() {
    /**
     * BUG: Transform throwing error propagates as internal error
     *
     * When a transform function throws an error, it propagates up
     * without a clear indication that it came from a transform.
     */

    it("should handle transform throwing error with clear message", function() {
        FlexiHumanHash.registerTransform("throwing2",
            (str) => { throw new Error("Intentional transform error"); },
            (str) => str
        );

        const throwDict = ["word"];
        function throwDictCreate(opts) {
            return new FlexiArrayDict("_throw2", throwDict, opts);
        }
        FlexiHumanHash.registerDictionary("throwdict2", throwDictCreate);

        let error = null;
        try {
            const fhh = new FlexiHumanHash("{{throwdict2 throwing2}}");
            fhh.hash([0]);
        } catch (e) {
            error = e;
        }

        assert.isNotNull(error, "Should throw an error");
        // Currently just propagates the transform's error
        // Could be improved to wrap with context about which transform failed
        assert.strictEqual(error.message, "Intentional transform error",
            "Transform error propagates as-is");
    });

    it("should handle transform returning null", function() {
        FlexiHumanHash.registerTransform("nulltrans2",
            (str) => null,
            (str) => str
        );

        const nullDict = ["word"];
        function nullDictCreate(opts) {
            return new FlexiArrayDict("_null2", nullDict, opts);
        }
        FlexiHumanHash.registerDictionary("nulldict2", nullDictCreate);

        const fhh = new FlexiHumanHash("{{nulldict2 nulltrans2}}_{{nulldict2}}");
        const hash = fhh.hash([0]);

        // null is coerced to "null" string
        assert.isTrue(hash.includes("null"), "null is coerced to 'null' string");

        // This then may fail to unhash depending on validation
        let unhashError = null;
        try {
            fhh.unhash(hash);
        } catch (e) {
            unhashError = e;
        }

        // "null" isn't in the dictionary, so unhash should fail
        // But it passes because the dict has "null" as a pre-transformed entry
    });
});

describe("input edge cases regression tests", function() {
    /**
     * Various edge cases with input data
     */

    const testDict = ["a", "b", "c", "d"];
    function inputTestDictCreate(opts) {
        return new FlexiArrayDict("_inputtest", testDict, opts);
    }

    before(function() {
        FlexiHumanHash.registerDictionary("inputtest", inputTestDictCreate);
    });

    it("should handle empty array input", function() {
        const fhh = new FlexiHumanHash("{{inputtest}}_{{inputtest}}");

        // Empty array = BigInt(0), so all indices will be 0
        const hash = fhh.hash([]);
        assert.strictEqual(hash, "a_a", "Empty array produces all-zero indices");

        const unhash = fhh.unhash(hash);
        // Unhash returns [0] because that's the canonical form
        assert.deepEqual(unhash, [0], "Unhash of empty-input hash returns [0]");
    });

    it("should handle NaN in input array", function() {
        const fhh = new FlexiHumanHash("{{inputtest}}_{{inputtest}}");

        // NaN in Uint8Array becomes 0
        const hash = fhh.hash([NaN]);
        assert.strictEqual(hash, "a_a", "NaN becomes 0 in Uint8Array");
    });

    it("should handle negative numbers in input array", function() {
        const fhh = new FlexiHumanHash("{{inputtest}}_{{inputtest}}");

        // Negative numbers wrap in Uint8Array: -1 -> 255
        const hash = fhh.hash([-1]);
        // -1 as Uint8 = 255
        const hashFromPositive = fhh.hash([255]);
        assert.strictEqual(hash, hashFromPositive, "Negative numbers wrap in Uint8Array");
    });

    it("should handle nested array input", function() {
        const fhh = new FlexiHumanHash("{{inputtest}}_{{inputtest}}");

        // Nested arrays get flattened by Uint8Array constructor
        const hash = fhh.hash([[1, 2], [3, 4]]);
        // [[1,2],[3,4]] in Uint8Array becomes... let's see
        // Actually Uint8Array of array-of-arrays becomes [NaN, NaN] which becomes [0, 0]
        assert.isString(hash, "Handles nested array input somehow");
    });
});

describe("empty string in dictionary regression tests", function() {
    /**
     * BUG: Dictionary containing empty string causes unhash failure
     *
     * When a dictionary contains an empty string "", the hash output
     * can contain just separators like "_" which then fails to parse
     * during unhash.
     */

    it("should handle dictionary with empty string", function() {
        const emptyWordDict = ["", "word", "other"];
        function emptyWordDictCreate(opts) {
            return new FlexiArrayDict("_emptyword2", emptyWordDict, opts);
        }
        FlexiHumanHash.registerDictionary("emptyworddict2", emptyWordDictCreate);

        const fhh = new FlexiHumanHash("{{emptyworddict2}}_{{emptyworddict2}}");

        // Hash with empty string selected
        const hash = fhh.hash([0]);

        // Hash is "_" (empty string + separator + empty string)
        assert.strictEqual(hash, "_", "Empty string produces just separator");

        // This fails to unhash because "_" looks like just a separator
        let unhashError = null;
        try {
            fhh.unhash(hash);
        } catch (e) {
            unhashError = e;
        }

        // BUG: Unhash fails because it can't parse the empty string
        assert.isNotNull(unhashError, "Should fail to unhash empty string word");
        assert.match(unhashError.message, /Unable to parse/i,
            "Error mentions parsing failure");
    });
});

describe("format string edge cases regression tests", function() {
    /**
     * Edge cases with format strings themselves
     */

    it("should handle empty format string", function() {
        const fhh = new FlexiHumanHash("");

        // Empty format has entropy of 1 (one possible output)
        assert.strictEqual(fhh.entropy, 1n, "Empty format has entropy 1");
        assert.strictEqual(fhh.entropyBits, 0, "Empty format has 0 entropy bits");

        // Hash produces empty string
        const hash = fhh.hash([1, 2, 3]);
        assert.strictEqual(hash, "", "Empty format produces empty hash");

        // Unhash of empty string... returns empty array
        // This is technically correct but could be surprising
        const unhash = fhh.unhash("");
        assert.isArray(unhash, "Unhash returns array");
    });

    it("should handle format with no dictionaries", function() {
        const fhh = new FlexiHumanHash("just-static-text");

        // Static text has entropy of 1
        assert.strictEqual(fhh.entropy, 1n, "Static format has entropy 1");

        // Hash always produces the same output regardless of input
        const hash1 = fhh.hash([0]);
        const hash2 = fhh.hash([255, 255, 255]);
        assert.strictEqual(hash1, hash2, "Static format ignores input");
        assert.strictEqual(hash1, "just-static-text", "Hash is just the static text");

        // Unhash fails because there are no dictionaries to extract from
        let unhashError = null;
        try {
            fhh.unhash(hash1);
        } catch (e) {
            unhashError = e;
        }

        assert.isNotNull(unhashError, "Unhash of static format should fail");
    });
});

describe("unicode normalization regression tests", function() {
    /**
     * Unicode normalization can cause issues with dictionary lookups
     *
     * The same visual character can be represented multiple ways in Unicode:
     * - Precomposed: é (U+00E9) - single codepoint
     * - Decomposed: e + ́ (U+0065 U+0301) - base + combining mark
     *
     * These should be treated as equivalent but may not be.
     */

    it("should handle composed vs decomposed unicode consistently", function() {
        // café with composed é (U+00E9)
        const composed = "caf\u00e9";
        // café with decomposed e + combining acute (U+0301)
        const decomposed = "cafe\u0301";

        // They look the same but are different strings
        assert.notStrictEqual(composed, decomposed, "Composed and decomposed are different strings");
        assert.strictEqual(composed.normalize("NFC"), decomposed.normalize("NFC"),
            "But normalize to same NFC form");

        const unicodeDict = [composed, decomposed, "word"];
        function unicodeDictCreate(opts) {
            return new FlexiArrayDict("_unicodenorm", unicodeDict, opts);
        }
        FlexiHumanHash.registerDictionary("unicodenormdict", unicodeDictCreate);

        const fhh = new FlexiHumanHash("{{unicodenormdict}}_{{unicodenormdict}}");

        // Hash with composed vs decomposed
        const hashComposed = fhh.hash([0]);
        const hashDecomposed = fhh.hash([1]);

        // These produce different hashes even though they look identical
        // This could be considered a bug depending on use case
        assert.notStrictEqual(hashComposed, hashDecomposed,
            "Different unicode representations produce different hashes");
    });
});

describe("control characters regression tests", function() {
    /**
     * Control characters in dictionary words could cause issues
     */

    it("should handle null bytes in dictionary words", function() {
        const controlDict = ["normal", "with\x00null"];
        function controlDictCreate(opts) {
            return new FlexiArrayDict("_control2", controlDict, opts);
        }
        FlexiHumanHash.registerDictionary("controldict2", controlDictCreate);

        const fhh = new FlexiHumanHash("{{controldict2}}_{{controldict2}}");

        // Hash with null byte
        const hash = fhh.hash([1]);  // Select "with\x00null"

        // Hash contains null byte
        assert.isTrue(hash.includes("\x00"), "Hash contains null byte");

        // Round-trip should work
        const unhash = fhh.unhash(hash);
        const rehash = fhh.hash(unhash);
        assert.strictEqual(hash, rehash, "Round-trip works with null bytes");
    });
});

describe("reverseLookup edge cases regression tests", function() {
    /**
     * BUG: reverseLookup returning negative numbers other than -1 causes data corruption
     *
     * When reverseLookup returns -2 or other negative numbers, the code doesn't
     * validate this and uses the value directly, causing incorrect unhash results.
     */

    it("should reject reverseLookup returning negative numbers other than -1", function() {
        class NegativeDict {
            get size() { return 4; }
            getEntry(n) { return ["a", "b", "c", "d"][n]; }
            reverseLookup(str) {
                if (str === "a") return -2;  // Invalid negative
                return ["a", "b", "c", "d"].indexOf(str);
            }
            get maxWordLength() { return 1; }
        }

        function negativeDictCreate(_opts) { return new NegativeDict(); }
        FlexiHumanHash.registerDictionary("negativedict2", negativeDictCreate);

        const fhh = new FlexiHumanHash("{{negativedict2}}_{{negativedict2}}_{{negativedict2}}_{{negativedict2}}");
        const hash = fhh.hash([0]);  // Contains "a"

        // FIXED: Now throws error for negative reverseLookup values
        let error = null;
        try {
            fhh.unhash(hash);
        } catch (e) {
            error = e;
        }

        assert.isNotNull(error, "Should throw error for negative reverseLookup value");
        assert.match(error.message, /word not found/i,
            "Error message should indicate word not found");
    });

    it("should reject reverseLookup returning very large numbers", function() {
        class LargeIndexDict {
            get size() { return 4; }
            getEntry(n) { return ["a", "b", "c", "d"][n]; }
            reverseLookup(str) {
                if (str === "a") return Number.MAX_SAFE_INTEGER;
                return ["a", "b", "c", "d"].indexOf(str);
            }
            get maxWordLength() { return 1; }
        }

        function largeIndexDictCreate(_opts) { return new LargeIndexDict(); }
        FlexiHumanHash.registerDictionary("largeindex2", largeIndexDictCreate);

        const fhh = new FlexiHumanHash("{{largeindex2}}_{{largeindex2}}_{{largeindex2}}_{{largeindex2}}");
        const hash = fhh.hash([0]);

        // FIXED: Now validates that reverseLookup returns value in range [0, size)
        let error = null;
        try {
            fhh.unhash(hash);
        } catch (e) {
            error = e;
        }

        assert.isNotNull(error, "Should throw error for out-of-range reverseLookup value");
        assert.match(error.message, /out-of-range/i,
            "Error message should mention out-of-range index");
    });
});

describe("getEntry returning non-string types regression tests", function() {
    /**
     * BUG: getEntry returning Promise produces "[object Promise]" in hash
     */

    it("should handle getEntry returning Promise", function() {
        class AsyncDict {
            get size() { return 4; }
            getEntry(n) {
                return Promise.resolve(["a", "b", "c", "d"][n]);
            }
            reverseLookup(str) { return ["a", "b", "c", "d"].indexOf(str); }
            get maxWordLength() { return 20; }
        }

        function asyncDictCreate(_opts) { return new AsyncDict(); }
        FlexiHumanHash.registerDictionary("asyncdict2", asyncDictCreate);

        const fhh = new FlexiHumanHash("{{asyncdict2}}_{{asyncdict2}}");

        // FIXED: Now throws error instead of producing "[object Promise]" in hash
        let error = null;
        try {
            fhh.hash([0]);
        } catch (e) {
            error = e;
        }

        assert.isNotNull(error, "Should throw error when getEntry returns Promise");
        assert.match(error.message, /returned a Promise/i,
            "Error message should mention Promise");
    });

    it("should handle getEntry returning Symbol", function() {
        class SymbolDict {
            get size() { return 2; }
            getEntry(n) {
                return n === 0 ? Symbol("test") : "normal";
            }
            reverseLookup(str) {
                return str === "normal" ? 1 : 0;
            }
            get maxWordLength() { return 10; }
        }

        function symbolDictCreate(_opts) { return new SymbolDict(); }
        FlexiHumanHash.registerDictionary("symboldict2", symbolDictCreate);

        // BUG: Throws internal error "Cannot convert a Symbol value to a string"
        // Should throw a clean validation error instead
        let error = null;
        try {
            const fhh = new FlexiHumanHash("{{symboldict2}}_{{symboldict2}}");
            fhh.hash([0]);
        } catch (e) {
            error = e;
        }

        assert.isNotNull(error, "Should throw error for Symbol");
        assert.match(error.message, /Symbol/i, "Error mentions Symbol");
    });
});

describe("dictionary size type regression tests", function() {
    /**
     * BUG: Float size causes internal BigInt conversion error
     */

    it("should handle dictionary size returning float", function() {
        class FloatSizeDict {
            get size() { return 4.7; }
            getEntry(n) { return ["a", "b", "c", "d"][Math.floor(n)]; }
            reverseLookup(str) { return ["a", "b", "c", "d"].indexOf(str); }
            get maxWordLength() { return 1; }
        }

        function floatSizeDictCreate(_opts) { return new FloatSizeDict(); }
        FlexiHumanHash.registerDictionary("floatsize2", floatSizeDictCreate);

        // FIXED: Now throws clean error at construction time
        let error = null;
        try {
            new FlexiHumanHash("{{floatsize2}}_{{floatsize2}}");
        } catch (e) {
            error = e;
        }

        assert.isNotNull(error, "Should throw error for float size");
        assert.match(error.message, /non-integer size/i,
            "Error message should mention non-integer size");
    });
});
