// const Uint1Array = require("uint1array").default;
const bitSequence = require("bit-sequence");
const {randomFillSync, createHash} = require("crypto");

class RandomSource {
    constructor(src, opts = {}) {
        src = src ?? randomFillSync(new ArrayBuffer(16));

        // create hash -> array of numbers
        if (opts.hashAlg) {
            let hash = createHash(opts.hashAlg);
            if (opts.hashSalt) {
                hash.update(opts.hashAlg);
            }

            src = hash.update(src)
                .digest("hex") // "1a3fe9" ...
                .match(/.{2}/g) // ["1a", "3f", "e9", ...]
                .map((h) => parseInt(h, 16)); // [0x1a, 0x3f, 0xe9 ... ]
        }

        // string -> array
        if (typeof src === "string") {
            src = src.split("").map((c) => c.charCodeAt(0));
        }

        // non-array iterator -> array
        if (!Array.isArray(src) && Symbol.iterator in src) {
            src = [... src];
        }

        // array of numbers -> Uint8Array
        if (Array.isArray(src)) {
            src = new Uint8Array(src);
        }

        // TypedArray -> ArrayBuffer
        if (ArrayBuffer.isView(src)) {
            src = src.buffer;
        }

        if (!(src instanceof ArrayBuffer)) {
            throw new TypeError(`expected 'src' to be an ArrayBuffer or string / array that could convert to ArrayBuffer, got: ${src}`);
        }

        this.rndSrcBuf = src;
        this.currBit = 0;
        this.numBits = src.byteLength * 8;

        if (opts.offset) {
            this.currBit += opts.offset;
        }
    }

    advance(bits) {
        // throw away bits
        this.currBit += bits;
    }

    get(bits) {
        // console.log("bits:", bits);
        let availBits = this.numBits - this.currBit;
        let extraBits = bits - availBits;
        let getBits = availBits > bits ? bits : availBits;
        let n = 0;
        // console.log("curr bit:", this.currBit);
        // console.log("avail bits:", availBits);
        // console.log("extra bits:", extraBits);
        // console.log("get bits:", getBits);

        // copy bits from our source
        n = copyBits(n, this.rndSrcBuf, this.currBit, getBits);
        this.currBit += getBits;

        // need more bits than were available?
        if (extraBits > 0) {
            // console.log("extraBits", extraBits);

            // need more bits than our buffer size?
            if (extraBits > this.numBits) {
                let newBufSize = Math.floor((extraBits * 2) / 8);
                // console.log("allocating new buffer bytes", newBufSize);
                this.rndSrcBuf = new ArrayBuffer(newBufSize);
                this.numBits = newBufSize * 8;
            }

            // fill buffer with randomness and get bits
            randomFillSync(this.rndSrcBuf);
            this.currBit = 0;
            n = copyBits(n, this.rndSrcBuf, this.currBit, extraBits);
        }

        // console.log("random number", n);
        return n;
    }
}

function copyBits(n, buf, offset, cnt) {
    let rndBuf = new Uint8Array(buf);
    // console.log(`src: ${rndBuf}`);
    let ret = bitSequence(rndBuf, offset, cnt);
    return ret;
}

function addBit(n, bit) {
    // console.log("bit", bit);
    return (n << 1) | (bit & 0x1);
}

// function dec2bin(dec) {
//     return (dec >>> 0).toString(2);
// }

module.exports = RandomSource;
