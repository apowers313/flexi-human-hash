## flexi-human-hash
There are lots of packages that convert big random numbers to something readable, but none are as flexible as I wanted. I created this to be a highly controllable version of the other human hash packages.

## Features:
* Multiple dictionaries: nouns, adjectives, verbs, first name, last name
* Full control over formatting: separators, spaces, additional words, upper case, lower case, numbers
* Random: You provide the source of randomness (hash, string, uuid, etc) or one will be provided for you
* Reversable hashes: hashes can be converted back to their random number
* Entropy reporting: understand how likely hash collisions are for your given format
* Low learning curve: good documentation and examples
* Extendable: add your own dictionaries and formatting modifiers
* Command line: use the JavaScript API or use it from the command line!

## API Examples:
Simple hash, you provide the random number
``` js
let hasher = fhh.format("{{first-name}}-{{last-name}}-the-{{adjective}}-{{noun}}");
hasher(42);
// Expected output: "bob-smith-the-ugly-goat"
```

Another format, random number provided for you
``` js
let hasher = fhh.format("{{adjective}}, {{adjective}} {{noun}} {{hex 4}}");
hasher();
// Expected output: "big, ugly frog 0f2a"
```

Another format, md5 hash a string
``` js
let hasher = fhh.format("{{first-name uppercase}}-{{last-name uppercase}}-{{decimal 6}}");
hasher("this is my password", {hash: "md5"});
// Expected output: "Bob Smith 248491"
```

Reverse a string back to the original random number
``` js
let hasher = fhh.format("{{first-name}}-{{last-name}}-the-{{adjective}}-{{noun}}");
hasher.reverse("bob-smith-the-ugly-goat");
// Expected output: "42"
```

Report how much entropy is used for a format, helps understand likelihood of collisions
``` js
let hasher = fhh.format("{{first-name uppercase}}-{{last-name uppercase}}-{{decimal 6}}");
console.log(hasher.reportEntropy());
// Expected output: "2349870192"
console.log(`Entropy: 2^${hasher.reportEntropyBase2())}`;
// Expected output: "Entropy: 2^12"
console.log(`Entropy: 10^${hasher.reportEntropyBase10())}`;
// Expected output: "Entropy: 10^7"
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
fhh.addDictionary("science", scientificTerms);
let hasher = fhh.format("{{science}}");
```

Add a transform
``` js
function reverseString(str) {
    return str.split("").reverse().join("");
}

fhh.addTransform("reverse", reverseString, {type: "boolean"});
let hasher = fhh.format("{{first-name reverse}}-{{last-name reverse}}");
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
* Noun
* Verb
* Adjective
* Decimal
* Hex
* First Name
* Last Name
* City

## Transforms
* Upper Case
* Lower Case
* Caps
* Max Length
* Min Length
* Exact Length

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

