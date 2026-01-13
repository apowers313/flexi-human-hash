import bitSequence from "bit-sequence";
import { randomFillSync, createHash } from "node:crypto";

class RandomSource {
    constructor(src, opts = {}) {
        src = src ?? randomFillSync(new ArrayBuffer(16));

        // create hash -> array of numbers
        if (opts.hashAlg) {
            const hash = createHash(opts.hashAlg);
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

        // Convert bytes to BigInt for divmod-based extraction
        // This allows using ALL entries in dictionaries of any size
        const bytes = new Uint8Array(src);
        this.bigNum = BigInt(0);
        for (const byte of bytes) {
            this.bigNum = (this.bigNum << BigInt(8)) | BigInt(byte);
        }
    }

    /**
     * Extract a value in range [0, max) using divmod.
     * This approach uses ALL dictionary entries regardless of dictionary size.
     * @param {number} max - The exclusive upper bound
     * @returns {number} A value in range [0, max)
     */
    getMax(max) {
        const maxBig = BigInt(max);
        const remainder = this.bigNum % maxBig;
        this.bigNum = this.bigNum / maxBig;
        return Number(remainder);
    }

    advance(bits) {
        // throw away bits
        this.currBit += bits;
    }

    get(bits) {
        // console.log("bits:", bits);
        const availBits = this.numBits - this.currBit;
        const extraBits = bits - availBits;
        const getBits = availBits > bits ? bits : availBits;
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
            // For deterministic output, wrap around to the beginning of the buffer
            // instead of filling with random data. This ensures that the same input
            // always produces the same output, even when we run out of bits.
            this.currBit = 0;
            n = copyBits(n, this.rndSrcBuf, this.currBit, extraBits);
            this.currBit += extraBits;
        }

        // console.log("random number", n);
        return n;
    }
}

function copyBits(n, buf, offset, cnt) {
    const rndBuf = new Uint8Array(buf);
    // console.log(`src: ${rndBuf}`);
    const ret = bitSequence(rndBuf, offset, cnt);
    return ret;
}

// function dec2bin(dec) {
//     return (dec >>> 0).toString(2);
// }

export default RandomSource;
