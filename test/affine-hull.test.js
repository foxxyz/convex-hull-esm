// affine-hull package had no tests, so these are synthesized
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { affineHull } from '../affine-hull.js'

// Dimension of the affine hull of a set of integer points, by fraction-free
// Gaussian elimination over BigInt. Independent of the code under test.
// Returns -1 for the empty set.
function affineRank(points) {
    if (points.length === 0) {
        return -1
    }
    const base = points[0].map(BigInt)
    const rows = points.slice(1).map(p => p.map((x, i) => BigInt(x) - base[i]))
    const columns = base.length
    let rank = 0
    for (let column = 0; column < columns && rank < rows.length; ++column) {
        const pivot = rows.findIndex((row, i) => i >= rank && row[column] !== 0n)
        if (pivot < 0) {
            continue
        }
        const swap = rows[rank]
        rows[rank] = rows[pivot]
        rows[pivot] = swap
        for (let r = rank + 1; r < rows.length; ++r) {
            const lead = rows[r][column]
            if (lead === 0n) {
                continue
            }
            const scale = rows[rank][column]
            rows[r] = rows[r].map((v, i) => scale * v - lead * rows[rank][i])
        }
        rank += 1
    }
    return rank
}

describe('affineHull', () => {
    it('handles degenerate inputs', () => {
        assert.deepEqual(affineHull([]), [])
        assert.deepEqual(affineHull([[0, 0]]), [0])
        assert.deepEqual(affineHull([[0, 0], [0, 0]]), [0])
    })
    it('stops at the dimension actually spanned', () => {
        assert.deepEqual(affineHull([[0, 0], [1, 1], [2, 2]]), [0, 1])
        assert.deepEqual(affineHull([[0, 0, 0], [1, 0, 0], [2, 0, 0]]), [0, 1])
        assert.deepEqual(affineHull([[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]]), [0, 1, 2])
    })
    it('skips points that add no dimension', () => {
        assert.deepEqual(affineHull([[0, 0], [1, 1], [2, 2], [0, 1]]), [0, 1, 3])
    })
    it('returns early once a full frame is found', () => {
        assert.deepEqual(affineHull([[0, 0], [1, 0], [0, 1], [5, 7]]), [0, 1, 2])
        assert.deepEqual(affineHull([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]]), [0, 1, 2, 3])
    })
    it('is not fooled by points a tiny distance off the line', () => {
        assert.deepEqual(affineHull([[0, 0], [1e-64, 1e-64], [1, 1]]), [0, 1])
        assert.equal(affineHull([[0, 0], [1, 1], [1, 1 + 1e-15]]).length, 3)
    })
    it('always returns a genuinely independent frame', () => {
        for (let d = 1; d <= 4; ++d) {
            for (let trial = 0; trial < 60; ++trial) {
                const n = 1 + Math.floor(Math.random() * 8)
                // A small coordinate range makes degenerate sets common
                const points = Array.from({ length: n }, () =>
                    Array.from({ length: d }, () => Math.floor(Math.random() * 3)))
                const index = affineHull(points)
                const label = `d=${d} ${JSON.stringify(points)}`

                assert.ok(index.length <= d + 1, `at most d+1 indices: ${label}`)
                for (let i = 1; i < index.length; ++i) {
                    assert.ok(index[i] > index[i - 1], `increasing: ${label}`)
                }
                for (const i of index) {
                    assert.ok(i >= 0 && i < n, `in range: ${label}`)
                }
                assert.equal(
                    affineRank(index.map(i => points[i])),
                    index.length - 1,
                    `selected frame is independent: ${label}`
                )
            }
        }
    })
    it('recovers the full rank once the first coordinate is not 1', () => {
        // The moment-curve padding has first coordinate 1, so moving the data
        // off that value is enough for the orientation tests to see the rank.
        assert.deepEqual(affineHull([[2, 1, 2], [2, 2, 1], [2, 1, 2], [2, 1, 1]]), [0, 1, 3])
        assert.deepEqual(affineHull([[0, 1, 2], [0, 2, 1], [0, 1, 2], [0, 1, 1]]), [0, 1, 3])
        // Reordering the coordinates has the same effect
        assert.deepEqual(affineHull([[2, 1, 1], [1, 2, 1], [2, 1, 1], [1, 1, 1]]), [0, 1, 3])
    })
})
