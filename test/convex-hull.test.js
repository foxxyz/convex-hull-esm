// ported from the test suite of convex-hull
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { convexHull } from '../index.js'
import { orientation } from '../orientation.js'
import { assertSameCells } from './helpers.js'

// Every input point must lie on the inner side of every facet, or on it.
// Facets are oriented so that interior points give a positive orientation.
// Only meaningful in two dimensions and above.
function assertValidHull(points, hull, message) {
    for (const facet of hull) {
        const facetPoints = facet.map(i => points[i])
        for (let i = 0; i < points.length; ++i) {
            if (facet.includes(i)) {
                continue
            }
            const o = orientation(...facetPoints, points[i])
            assert.ok(o >= 0, `${message}: point ${i} lies outside facet [${facet}]`)
        }
    }
}

describe('convexHull', () => {
    it('returns nothing for a flat 2d point set', () => {
        assert.deepEqual(convexHull([[0, 0], [1, 0], [2, 0]]), [])
    })
    it('returns nothing for a coplanar 3d point set', () => {
        assert.deepEqual(convexHull([
            [0, 0, 0],
            [0, 1, 0],
            [1, 0, 0],
            [1, 1, 0],
            [2, 3, 0]
        ]), [])
    })
    it('builds a pyramid and drops the point interior to its base', () => {
        const points = [
            [0, 0, 0],
            [0, 1, 0],
            [1, 0, 0],
            [0.5, 0.5, 0],
            [1, 1, 0],
            [0.5, 0.5, 1]
        ]
        const hull = convexHull(points)

        // Four sides to the apex, plus the square base split into two triangles
        assert.equal(hull.length, 6)
        // Index 3 sits inside the base face, so it is not a hull vertex
        assert.deepEqual([...new Set(hull.flat())].sort((a, b) => a - b), [0, 1, 2, 4, 5])
        assertSameCells(hull, [
            [0, 2, 5], [1, 0, 5], [0, 1, 2],
            [2, 4, 5], [4, 1, 5], [1, 4, 2]
        ], 'pyramid facets')
        assertValidHull(points, hull, 'pyramid')
    })
    describe('dimension dispatch', () => {
        it('handles an empty point set', () => {
            assert.deepEqual(convexHull([]), [])
        })
        it('handles a single point', () => {
            assert.deepEqual(convexHull([[5, 5]]), [[0]])
        })
        it('handles points with no coordinates', () => {
            assert.deepEqual(convexHull([[], [], []]), [])
        })
        it('returns the extremes in one dimension', () => {
            assert.deepEqual(convexHull([[3], [1], [2]]), [[0], [1]])
            assert.deepEqual(convexHull([[1], [3], [2]]), [[0], [1]])
            assert.deepEqual(convexHull([[1], [1]]), [[0]])
        })
        it('returns a closed cycle of edges in two dimensions', () => {
            const points = [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]]
            const edges = convexHull(points)
            assert.equal(edges.length, 4)
            for (const edge of edges) {
                assert.equal(edge.length, 2)
            }
            // Each edge starts where the previous one ended
            for (let i = 1; i < edges.length; ++i) {
                assert.equal(edges[i][0], edges[i - 1][1], 'edges form a cycle')
            }
            assert.equal(edges[0][0], edges[edges.length - 1][1], 'cycle closes')
            assertValidHull(points, edges, 'square')
        })
    })

    describe('random point sets', () => {
        for (let d = 2; d <= 4; ++d) {
            it(`produces a valid hull in ${d}d`, () => {
                for (let trial = 0; trial < 20; ++trial) {
                    const n = d + 2 + Math.floor(Math.random() * 15)
                    const points = Array.from({ length: n }, () =>
                        Array.from({ length: d }, () => Math.random() * 10 - 5))
                    const hull = convexHull(points)
                    assert.ok(hull.length > 0, `non-empty hull in ${d}d`)
                    for (const facet of hull) {
                        assert.equal(facet.length, d, `facet has ${d} vertices`)
                    }
                    assertValidHull(points, hull, `random ${d}d`)
                }
            })
        }
        it('falls back to an affine basis for a degenerate set it can still hull', () => {
            // A square sitting in the plane z = 0 of 3d space has no volume,
            // so the incremental construction fails and the affine hull path
            // decides there is nothing to return
            assert.deepEqual(convexHull([
                [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]
            ]), [])
        })
    })
})
