// Type definitions for flexi-human-hash

export interface HashOptions {
    /** Hash algorithm to use (e.g., "md5", "sha256") */
    hashAlg?: string;
    /** Salt to add to the hash */
    hashSalt?: string;
    /** Bit offset into the random source */
    offset?: number;
}

export interface DictOptions {
    args?: (string | number)[];
    "min-length"?: number;
    "max-length"?: number;
    "exact-length"?: number;
    [key: string]: unknown;
}

export interface DictEntry {
    size: number;
    getEntry(n: number, opts?: DictOptions): string;
    reverseLookup?(str: string): number;
}

export type DictCreateFn = (opts: DictOptions) => DictEntry;
export type TransformFn = (str: string, opts?: DictOptions) => string;

/**
 * Main class for converting random data into human-readable strings
 */
export class FlexiHumanHash {
    /** The format string used to create this instance */
    format: string;
    /** Total entropy bits for this format */
    entropyBits: number;

    /**
     * Create a new FlexiHumanHash instance
     * @param format - Handlebars-style format string (e.g., "{{adjective}}-{{noun}}")
     * @param opts - Optional configuration
     */
    constructor(format: string, opts?: object);

    /**
     * Convert random data into a human-readable string
     * @param data - Random data source (string, ArrayBuffer, TypedArray, array of numbers, or iterable)
     * @param opts - Hash options
     * @returns Human-readable string
     */
    hash(data?: string | ArrayBuffer | ArrayBufferView | number[] | Iterable<number>, opts?: HashOptions): string;

    /**
     * Convert a human-readable string back to the original random bytes
     * @param str - The human-readable string to reverse
     * @param opts - Options
     * @returns Array of numbers representing the original bytes
     */
    unhash(str: string, opts?: object): number[];

    /**
     * Number of possible random combinations as a BigInt
     */
    get entropy(): bigint;

    /**
     * Number of bits of entropy for the format
     */
    get entropyBase2(): number;

    /**
     * Log10 of the number of combinations
     */
    get entropyBase10(): number;

    /**
     * Register a custom dictionary
     * @param name - Dictionary name to use in format strings
     * @param createFn - Factory function that returns a dictionary object
     */
    static registerDictionary(name: string, createFn: DictCreateFn): void;

    /**
     * Register a custom transform
     * @param name - Transform name to use in format strings
     * @param transformFn - Function to transform a word
     * @param undoFn - Function to reverse the transform (for unhash)
     */
    static registerTransform(name: string, transformFn: TransformFn, undoFn?: TransformFn): void;

    /**
     * Get a registered transform by name
     * @param name - Transform name
     */
    static getTransform(name: string): { transformFn: TransformFn; undoFn?: TransformFn } | undefined;
}

/**
 * Base class for dictionaries
 */
export class FlexiDict implements DictEntry {
    opts: DictOptions;
    dict: string[];

    constructor(name: string, opts: DictOptions);

    /**
     * Get entry at index n
     */
    getEntry(n: number): string;

    /**
     * Find the index of a string in the dictionary
     */
    reverseLookup(str: string): number;

    /**
     * Number of entries in the dictionary
     */
    get size(): number;

    /**
     * Apply registered transforms to all dictionary entries
     */
    doTransforms(): void;
}

/**
 * Dictionary backed by an array of strings
 */
export class FlexiArrayDict extends FlexiDict {
    /**
     * Create an array-backed dictionary
     * @param name - Dictionary name
     * @param arr - Array of words
     * @param opts - Dictionary options (supports min-length, max-length, exact-length)
     */
    constructor(name: string, arr: string[], opts?: DictOptions);
}

/**
 * Manages random bit consumption from various input types
 */
export class RandomSource {
    /** The underlying ArrayBuffer */
    rndSrcBuf: ArrayBuffer;
    /** Current bit position */
    currBit: number;
    /** Total number of bits available */
    numBits: number;

    /**
     * Create a new RandomSource
     * @param src - Random data source
     * @param opts - Options including offset
     */
    constructor(src?: string | ArrayBuffer | ArrayBufferView | number[] | Iterable<number>, opts?: HashOptions);

    /**
     * Get n bits from the random source
     * @param bits - Number of bits to get
     * @returns The value of the bits as a number
     */
    get(bits: number): number;

    /**
     * Advance the bit position without returning the bits
     * @param bits - Number of bits to skip
     */
    advance(bits: number): void;
}
