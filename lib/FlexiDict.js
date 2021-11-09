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
}

module.exports = FlexiDict;
