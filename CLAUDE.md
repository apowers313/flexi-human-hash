# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run tests
npm test

# Run a single test file
npx mocha test/FlexiHumanHash.js

# Run specific test(s) by grep pattern
npx mocha --grep "pattern"
```

Note: There is no build step - this is plain JavaScript with CommonJS modules.

## Architecture

This library converts random data (UUIDs, hashes, etc.) into human-readable strings using a format template system based on Handlebars.

### Core Components

- **FlexiHumanHash** (`lib/FlexiHumanHash.js`) - Main class that parses format strings and performs hash/unhash operations. Uses Handlebars to compile format templates like `{{adjective}}-{{noun}}`. Maintains dictionaries and transforms in registries.

- **RandomSource** (`lib/RandomSource.js`) - Manages random bit consumption from various input types (strings, arrays, UUIDs, ArrayBuffers). Handles bit-level extraction for dictionary lookups.

- **FlexiDict** (`lib/FlexiDict.js`) - Base dictionary class with `getEntry(n)` and `reverseLookup(str)` methods. Supports pre-calculating transforms on dictionary entries.

- **FlexiArrayDict** (`lib/FlexiArrayDict.js`) - Dictionary implementation backed by arrays. Handles word length filtering (`min-length`, `max-length`, `exact-length`) and caches filtered results.

### Extension Points

- **Dictionaries** (`lib/defaultDicts.js`) - Register via `FlexiHumanHash.registerDictionary(name, createFn)`. The `createFn` returns an object with `size` and `getEntry(n)` properties.

- **Transforms** (`lib/defaultTransforms.js`) - Register via `FlexiHumanHash.registerTransform(name, transformFn, undoFn)`. Transforms modify dictionary words (e.g., `uppercase`, `lowercase`, `caps`).

### Format String Processing

Format strings use Handlebars syntax: `{{dictionary-name transform1 transform2 option=value}}`

During construction, FlexiHumanHash:
1. Registers Handlebars helpers for each dictionary
2. Runs the template once in "create state" to build dictionaries with filters applied
3. Calculates total entropy bits from all dictionaries

During `hash()`, it extracts bits from RandomSource to index into each dictionary. During `unhash()`, it reverses the process to recover the original random bytes.
