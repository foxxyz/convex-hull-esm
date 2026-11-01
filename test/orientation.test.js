// Ported from the test suite of robust-orientation.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { orientation } from '../orientation.js'

describe('orientation', () => {
    it('handles 2d, including near-degenerate configurations', () => {
        assert.equal(orientation([0.1, 0.1], [0.1, 0.1], [0.3, 0.7]), 0)
        assert.ok(orientation([0, 0], [-1e-64, 0], [0, 1]) > 0)
        assert.equal(orientation([0, 0], [1e-64, 1e-64], [1, 1]), 0)
        assert.ok(orientation([0, 0], [1e-64, 0], [0, 1]) < 0)

        let x = 1e-64
        for (let i = 0; i < 200; ++i) {
            assert.ok(orientation([-x, 0], [0, 1], [x, 0]) > 0, `x=${x}`)
            assert.equal(orientation([-x, 0], [0, 0], [x, 0]), 0, `x=${x}`)
            assert.ok(orientation([-x, 0], [0, -1], [x, 0]) < 0, `x=${x}`)
            assert.ok(orientation([0, 1], [0, 0], [x, x]) < 0, `x=${x}`)
            x *= 10
        }
    })
    it('handles 3d', () => {
        assert.ok(orientation([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]) < 0)
        assert.ok(orientation([0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 0]) > 0)
        assert.ok(orientation([0, 0, 0], [1e-64, 0, 0], [0, 0, 1], [0, 1e64, 0]) > 0)
    })
    it('handles 4d', () => {
        assert.ok(orientation(
            [0, 0, 0, 0],
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ) > 0)
    })
    it('handles 5d', () => {
        assert.ok(orientation(
            [0, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ) > 0)
    })
    it('returns zero for degenerate point counts', () => {
        assert.equal(orientation(), 0)
        assert.equal(orientation([1, 2]), 0)
    })
    it('flips sign when two points are swapped', () => {
        const a = [0.3, 0.1]
        const b = [0.7, 0.9]
        const c = [0.2, 0.8]
        assert.equal(orientation(a, b, c), -orientation(b, a, c))
    })
})
