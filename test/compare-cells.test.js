// Ported from the compareCells portion of the simplicial-complex test suite.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { compareCells } from '../compare-cells.js'

describe('compareCells', () => {
    it('ranks cells of differing length', () => {
        assert.ok(compareCells([], [1]))
        assert.ok(compareCells([1, 3, 5], [1, 3, 5, 7]))
    })
    it('ranks single vertex cells', () => {
        assert.ok(compareCells([2], [3]))
        assert.ok(!compareCells([0], [0]))
    })
    it('ignores permutation for edges', () => {
        assert.ok(compareCells([4, 3], [7, 0]))
        assert.ok(!compareCells([10, 11], [11, 10]))
    })
    it('ignores permutation for triangles', () => {
        assert.ok(compareCells([2, 0, 5], [3, 0, 4]))
        assert.ok(!compareCells([0, 1, 2], [2, 0, 1]))
        assert.ok(!compareCells([0, 1, 2], [1, 2, 0]))
        assert.ok(!compareCells([0, 1, 2], [1, 0, 2]))
    })
    it('ignores permutation for larger cells', () => {
        assert.ok(compareCells([2, 4, 5, 6], [6, 7, 8, 9]))
        assert.ok(compareCells([1, 2, 3, 6], [1, 2, 3, 7]))
        assert.ok(!compareCells([0, 1, 2, 3], [3, 1, 2, 0]))
    })
    it('compares empty cells as equal', () => {
        assert.equal(compareCells([], []), 0)
    })
})
