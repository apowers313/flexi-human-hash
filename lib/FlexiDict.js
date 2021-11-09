const FlexiHumanHash = require("./FlexiHumanHash");

class FlexiDict {
    constructor(name, opts) {
        this._name = name;
        this.opts = opts;
        this.dict = [];
    }

    getEntry(n) {
        return this.dict[n];
    }

    reverseLookup(str) {
        return this.dict.indexOf(str);
    }

    get size() {
        return this.dict.length;
    }

    doTransforms() {
        // get all transform function
        let transforms = this.opts.args.map((a) => {
            let t = FlexiHumanHash.getTransform(a);
            if (!t) {
                throw new TypeError(`unrecognized transform: ${a}`);
            }

            return t.transformFn;
        });

        // pre-calculate transforms on all entries
        for (let i = 0; i < this.dict.length; i++) {
            transforms.forEach((trans) => {
                this.dict[i] = trans(this.dict[i]);
            });
        }
    }
}

module.exports = FlexiDict;
