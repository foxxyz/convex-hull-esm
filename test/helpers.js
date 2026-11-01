import assert from 'node:assert/strict'

function compareLexicographic(a, b) {
    if (a.length !== b.length) {
        return a.length - b.length
    }
    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) {
            return a[i] - b[i]
        }
    }
    return 0
}

// Compares sets of facets when orientation and vertex order are irrelevant.
// Deliberately independent of the library's own compareCells, so these
// comparisons do not depend on the code they are checking.
export function assertSameCells(actual, expected, message) {
    const canonical = cells => cells
        .map(c => c.toSorted((a, b) => a - b))
        .sort(compareLexicographic)
    assert.deepEqual(canonical(actual), canonical(expected), message)
}
