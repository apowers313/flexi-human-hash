function uppercase(str) {
    return str[0].toUpperCase() + str.slice(1);
}

function caps(str) {
    return str.toUpperCase();
}

function lowercase(str) {
    return str.toLowerCase();
}

export default [
    {name: "uppercase", transformFn: uppercase, undoFn: lowercase},
    {name: "caps", transformFn: caps, undoFn: lowercase},
    {name: "lowercase", transformFn: lowercase, undoFn: lowercase},
];
