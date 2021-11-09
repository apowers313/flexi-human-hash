## flexi-human-hash
There are lots of packages that convert big random numbers to something readable or create random strings from words, but none are as flexible as I wanted. I created this to be a highly controllable version of the other human hash packages.

Note that this package is well tested and fairly stable, so don't expect to see many changes unless new GitHub issues are opened.

## Usage
Install:
``` bash
npm install flexi-human-hash
```

Use
``` js
const {FlexiHumanHash} = require("flexi-human-hash");
let fhh = new FlexiHumanHash("{{adjective}}-{{noun}}");
console.log(fhh.hash());
// Expected output: "betwixt-railways"
```

## Features:
* Multiple dictionaries: nouns, adjectives, verbs, first name, last name, city
* Full control over formatting: separators, spaces, additional words, upper case, lower case, numbers
* Random: You provide the source of randomness (hash, string, uuid, etc) or one will be provided for you
* Reversable hashes: hashes can be converted back to their random number
* Entropy reporting: understand how likely hash collisions are for your given format
* Low learning curve: good documentation and examples
* Extendable: add your own dictionaries and formatting transforms
* Dictionaries aren't loaded unless used, reduces bloat
* Command line: use the JavaScript API or use it from the command line!

## API Examples:
Simple hash, you provide the random numbers
``` js
let fhh = new FlexiHumanHash("{{adjective}}-{{adjective}}-{{noun}}-{{decimal 4}}");
fhh.hash("edf63145-f6d3-48bf-a0b7-18e2eeb0a9dd");
// Expected output: "disagreeably-thankless-newsgirls-3149"
```

Another format, random number provided for you
``` js
let fhh = new FlexiHumanHash("{{adjective}}, {{adjective}} {{noun}} {{hex 4}}");
fhh.hash();
// Expected output: "stalwart, dominant attire f214"
```

Another format, md5 hash a string for random numbers, transform names to all caps
``` js
let fhh = new FlexiHumanHash("{{first-name caps}}-{{last-name caps}}-{{decimal 6}}");
fhh.hash("this is my password...", {hashAlg: "md5"});
// Expected output: "CHARITY-ESMERELDA-903817"
```

Reverse a string back to the original random number
``` js
let fhh = new FlexiHumanHash("{{first-name lowercase}}-{{last-name lowercase}}-the-{{adjective}}-{{noun}}");
let ret = fhh.unhash("francisca-straub-the-coldest-eagle");
// Expected output: [57, 225, 104, 232, 109, 102, 74 ]
```

Report how much entropy is used for a format to help understand likelihood of collisions
``` js
let fhh = new FlexiHumanHash("{{first-name uppercase}}-{{last-name uppercase}}-{{decimal 6}}");
console.log(fhh.entropy);
// Expected output (note BigInt): "70368744177664n"
console.log("Number of combinations:", fhh.entropy.toLocaleString());
// Expected output: "Number of combinations: 70,368,744,177,664"
console.log(`Entropy: 2^${fhh.entropyBase2}`);
// Expected output: "Entropy: 2^46"
console.log(`Entropy: 10^${fhh.entropyBase10}`);
// Expected output: "Entropy: 10^14"
```

Add a dictionary
``` js
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
// Expected output: "archetypical:spintronics"
```

Add a transform
``` js
function reverseString(str) {
    return str.split("").reverse().join("");
}

FlexiHumanHash.registerTransform("reverse", reverseString, {type: "boolean"});
let fhh = new FlexiHumanHash("{{adjective reverse}}-{{noun reverse}}");
fhh.hash();
// Expected output: "ydeewt-airalos"
```

<!--
## Command Line Examples:
``` bash
flexihash "{{first-name}}-{{last-name}}" f373c0aec6162cdba76ee9084e695866a15e441a
```

``` bash
flexihash "{{first-name}}-{{last-name}}" < file
```
-->

## Formats
* noun
    * 47,004 English nouns from [categorized-words](https://github.com/felixfischer/categorized-words)
* verb
    * 31,232 English verbs from [categorized-words](https://github.com/felixfischer/categorized-words)
* adjective
    * 14,903 English adjectives from [categorized-words](https://github.com/felixfischer/categorized-words)
* decimal
    * A decimal number (zero through 10), defaults to four digits long but can be a specified number of digits long
    * {{decimal}} = 2394
    * {{decimal 8}} = 84258973
    * {{decimal 1}} = 7
* hex
    * A hexidecimal number (zero through f), defaults to four nibbles / characters long but can be a specified number of digits long
    * {{hex}} = 3fa8
    * {{hex 8}} = cb28f30d
    * {{hex 1}} = e
* female-name
    * 4,951 English capitalized female first names / given names from [@stdlib](https://github.com/stdlib-js/datasets-female-first-names-en)
* male-name
    * 3,898 English capitalized male first names / given names from [@stdlib](https://github.com/stdlib-js/datasets-male-first-names-en)
* first-name
    * 8,849 English capitalized first names / given names (female-name and male-name combined)
* last-name
    * 21,985 last names / family names from [uuid-readable](https://github.com/Debdut/uuid-readable)
* city
    * 138,398 city names from [all-the-cities](https://www.npmjs.com/package/all-the-cities)

## Transforms
Note: transforms with "=" in them must come last, because [Handlebars](https://handlebarsjs.com/). e.g. "{{noun uppercase max-length=4}}" works, but "{{noun max-length=4 uppercase}}" will throw a parsing error.

* uppercase
    * Converts the first letter of a word to uppercase
    * e.g. "{{noun uppercase}}" -> "Word"
* lowercase
    * Converts an entire word to lowercase
    * e.g. "{{noun lowercase}}" -> "word"
* caps
    * Converts an entire word to uppercase
    * e.g. "{{noun caps}}" -> "WORD"
* max-length=n
    * Filters a dictionary to only include words 'n' letters long or less
    * e.g. "{{noun max-length=4}}" => "cat" or "blob" (not "building")
* min-length=n
    * Filters a dictionary to only include words 'n' letters long or more
    * e.g. "{{noun min-length=5}}" => "cloud" or "building" (not "cat")
* exact-length=n
    * Filters a dictionary to only include words 'n' letters long or less
    * e.g. "{{noun exact-length=4}}" => "tree" or "bush" (not "cat", not "building")

## API
* FlexiHumanHash
    * Class, constructor takes a `format` string and an options object
    * e.g. `new FlexiHumanHash(formatString)`
    * `hash(randomness, options)`: uses randomness to create a string in the specified format
        * `randomness` can be a: string, array of numbers, iterable of numbers, TypedArray, ArrayBuffer
        * options:
            * hashAlg: a string passed to [Node Crypto createHash](https://nodejs.org/api/crypto.html#class-hash). The algorithm must be acceptable by the local installation of OpenSSL ("sha256" is a good guess if you don't know better). If used, `randomness` must be an argument acceptable to Node Crypto's hash `.update()` function.
            * hashSalt: Used in combination with `hashAlg` -- is passed to the `.update()` method before `randomness` to create a different output hash. Must be an argument acceptable to Node Crypto's hash `.update()` function.
* FlexiHumanHash.registerDictionary(name, registerFn)
    * `name` of the dictionary that will be used in the format
        * e.g. `name` = "foo" becomes "{{foo}}"
    * `registerFn` returns an object with:
        * size: number of entries in the dictionary
        * getEntry: function with one arg (n), that returns the Nth entry of the dictionary
* FlexiHumanHash.registerTransform(name, transformFn, reverseFn)
    * `name` of the transform that will be used in the format
        * e.g. `name` = "bar" becomes "{{noun bar}}"
    * `transformFn` is a function with one argument, the word that will be transformed. Returns the transformed word.
    * `reverseFn` TODO

## Similar packages
* [Project Name Generator](https://www.npmjs.com/package/project-name-generator)
* [Codenamize JS](https://github.com/stemail23/codenamize-js)
* [UUID Readable](https://www.npmjs.com/package/uuid-readable)
* [GUID in Words](https://www.npmjs.com/package/guid-in-words)
* [Mnemonic ID](https://www.npmjs.com/package/mnemonic-id)
* [Human Readable IDs](https://www.npmjs.com/package/human-readable-ids)
* [Wordhash](https://www.npmjs.com/package/wordhash)
* [Human Readable](https://www.npmjs.com/package/@jekru/human-readable)
* [Humanize Digest](https://www.npmjs.com/package/humanize-digest)
* [UUID API Key](https://www.npmjs.com/package/uuid-apikey)

## Future ambitions
* Add more dictionaries!
* Add [Chroma Hash](https://github.com/mattt/Chroma-Hash) and other non-word hashes

Issues and pull requests always welcome, even if you're just saying hi. :)


