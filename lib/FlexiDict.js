import FlexiHumanHash from "./FlexiHumanHash.js";

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
        // get all transform function names and functions
        const transforms = this.opts.args.map((a) => {
            const t = FlexiHumanHash.getTransform(a);
            if (!t) {
                throw new TypeError(`unrecognized transform: ${a}`);
            }

            return { name: a, fn: t.transformFn };
        });

        // pre-calculate transforms on all entries
        for (let i = 0; i < this.dict.length; i++) {
            transforms.forEach((trans) => {
                const result = trans.fn(this.dict[i]);
                // Coerce to string if transform returned non-string
                if (typeof result !== "string") {
                    console.warn(`Transform '${trans.name}' returned ${typeof result} instead of string for entry ${i}. Coercing to string.`);
                    this.dict[i] = String(result);
                } else {
                    this.dict[i] = result;
                }
            });
        }
    }
}

export default FlexiDict;
