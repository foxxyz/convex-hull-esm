// Ported from the test suite of monotone-convex-hull-2d
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { monotoneConvexHull2D } from '../monotone-hull-2d.js'

describe('monotoneConvexHull2D', () => {
    it('drops interior points', () => {
        assert.deepEqual(monotoneConvexHull2D([[0, 0], [1, 1], [1, 0], [0.5, 0.5], [0.7, 0.1]]), [0, 1, 2])
    })
    it('returns the corners of a square, in either input order', () => {
        assert.deepEqual(monotoneConvexHull2D([[0, 0], [1, 0], [1, 1], [0, 1]]), [0, 3, 2, 1])
        assert.deepEqual(monotoneConvexHull2D([[0, 0], [1, 1], [1, 0], [0, 1]]), [0, 3, 1, 2])
    })
    it('ignores points added on the edges and inside', () => {
        const points = [[0, 0], [1, 1], [1, 0], [0, 1]]
        for (let i = 0; i < 1000; ++i) {
            points.push([Math.random(), Math.random()])
            points.push([0, Math.random()])
            points.push([Math.random(), 0])
            points.push([Math.random(), 1])
            points.push([1, Math.random()])
        }
        assert.deepEqual(monotoneConvexHull2D(points), [0, 3, 1, 2])
    })
    it('handles degenerate inputs', () => {
        assert.deepEqual(monotoneConvexHull2D([[0, 0]]), [0])
        assert.deepEqual(monotoneConvexHull2D([]), [])
        assert.deepEqual(monotoneConvexHull2D([[0, 0], [1, 1]]), [0, 1])
        assert.deepEqual(monotoneConvexHull2D([[0, 0], [0, 0]]), [0])
    })
    it('collapses a set of collinear points to its two extremes', () => {
        const points = [[0, 0], [1, 1], [2, 2], [3, 3]]
        assert.deepEqual(monotoneConvexHull2D(points), [0, 3])
    })
})
