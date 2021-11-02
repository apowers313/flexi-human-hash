const Uint1Array = require("uint1array").default;
const {randomFillSync} = require("crypto");

class RandomSource {
    constructor(src, opts = {}) {
        // TODO: TypedArray, Array buffer, array
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
    let rndSrcBits = new Uint1Array(buf);
    // console.log(`src: ${rndSrcBits}`);

    // console.log("cnt", cnt);
    for (let i = 0; i < cnt; i++) {
        // console.log(`${i}: ${rndSrcBits[offset + i]}`);
        n = addBit(n, rndSrcBits[offset + i]);
    }

    return n;
}

function addBit(n, bit) {
    // console.log("bit", bit);
    return (n << 1) | (bit & 0x1);
}

module.exports = RandomSource;
