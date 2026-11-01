// Ported from the cube, sphere, parabola and simplex test suites of incremental-convex-hull
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { incrementalConvexHull } from '../incremental-hull.js'
import { assertSameCells } from './helpers.js'

// Boundary facets of a list of cells, each cell with one vertex dropped
function cellBoundary(cells) {
    const out = []
    for (const c of cells) {
        for (let j = 0; j < c.length; ++j) {
            out.push(c.filter((_, k) => k !== j))
        }
    }
    return out
}

// A regular grid of points filling the unit hypercube, interior included
function createHypercube(dimension, numSubdivs) {
    const samples = new Array(numSubdivs + 2)
    samples[0] = 0.0
    samples[numSubdivs + 1] = 1.0
    for (let i = 1; i <= numSubdivs; ++i) {
        samples[i] = i / (numSubdivs + 2)
    }
    let points = samples.map(x => [x])
    for (let i = 1; i < dimension; ++i) {
        const next = []
        for (const point of points) {
            for (const sample of samples) {
                next.push([...point, sample])
            }
        }
        points = next
    }
    return points
}

function validateCube(dimension) {
    const verts = createHypercube(dimension, 3 + (4 - dimension) * 2)

    // Lead with a non-degenerate simplex so the construction can bootstrap
    const origin = new Array(dimension).fill(0)
    verts.unshift(origin)
    for (let i = 0; i < dimension; ++i) {
        const y = origin.slice()
        y[i] = 1
        verts.unshift(y)
    }

    const hull = incrementalConvexHull(verts, true)

    const hullVerts = []
    for (const facet of hull) {
        assert.equal(facet.length, dimension, `check facet: ${facet.join()}`)
        hullVerts.push(...facet)
    }

    const corners = new Set()
    for (const v of new Set(hullVerts)) {
        const p = verts[v]
        let onBoundary = false
        let index = 0
        let isCorner = true
        for (let j = 0; j < dimension; ++j) {
            if (p[j] === 0 || p[j] === 1) {
                onBoundary = true
                index += p[j] << j
            } else {
                isCorner = false
            }
        }
        if (isCorner) {
            corners.add(index)
        }
        assert.ok(onBoundary, `point on boundary: ${p.join()}`)
    }

    assert.equal(corners.size, 1 << dimension, 'all corners are covered')
}

// Points on a parabola, lifted into 2d, have a hull that is exactly the sequence of neighbours in sorted order
function validateBowl(points, message) {
    const tagged = points.map((p, i) => [p, i])
    const lifted = points.map(p => [p, p * p])
    tagged.sort((a, b) => a[0] - b[0])

    const expected = []
    for (let i = 1; i < tagged.length; ++i) {
        expected.push([tagged[i - 1][1], tagged[i][1]])
    }
    expected.push([tagged[tagged.length - 1][1], tagged[0][1]])

    assertSameCells(incrementalConvexHull(lifted), expected, message)
}

function createSphere(dimension, numBoundary, numInterior) {
    const points = []
    for (let i = 0; i < numBoundary; ++i) {
        const point = new Array(dimension)
        let r2 = 0.0
        for (let j = 0; j < dimension; ++j) {
            const v = Math.random() - 0.5
            r2 += v * v
            point[j] = v
        }
        const r = Math.sqrt(r2)
        for (let j = 0; j < dimension; ++j) {
            point[j] /= r
        }
        points.push(point)
    }
    for (let i = 0; i < numInterior; ++i) {
        points.push(Array.from({ length: dimension }, () => 0.5 * (Math.random() - 0.5)))
    }
    return points
}

function validateSphere(dimension, numBoundary, numInterior) {
    const points = createSphere(dimension, numBoundary, numInterior)
    const hull = incrementalConvexHull(points)
    const boundary = [...new Set(hull.flat())].sort((a, b) => a - b)

    assert.equal(boundary.length, numBoundary, `sphere ${dimension} boundary ok`)
    for (let i = 0; i < boundary.length; ++i) {
        assert.equal(boundary[i], i, `boundary ${i}`)
    }
}

describe('incrementalConvexHull', () => {
    describe('hypercube', () => {
        for (const dimension of [2, 3]) {
            it(`covers every corner in ${dimension}d`, () => {
                for (let i = 0; i < 10; ++i) {
                    validateCube(dimension)
                }
            })
        }
        it('covers every corner in 4d', () => {
            validateCube(4)
        })
    })
    describe('parabola', () => {
        it('links neighbours along an ordered list', () => {
            const list = []
            for (let i = -10; i <= 10; ++i) {
                list.push(i)
            }
            validateBowl(list, 'ordered list')
        })
        it('links neighbours for random points', () => {
            for (let i = 0; i < 10; ++i) {
                validateBowl(Array.from({ length: 100 }, () => Math.random()), 'random')
            }
        })
    })
    describe('sphere', () => {
        it('puts every boundary point on the hull in 2d', () => {
            for (let i = 0; i < 10; ++i) {
                validateSphere(2, 50, 50)
            }
        })
        it('puts every boundary point on the hull in 3d', () => {
            for (let i = 0; i < 10; ++i) {
                validateSphere(3, 100, 100)
            }
        })
        it('puts every boundary point on the hull in 4d', () => {
            for (let i = 0; i < 10; ++i) {
                validateSphere(4, 120, 120)
            }
        })
    })
    describe('simplex', () => {
        for (let d = 2; d <= 7; ++d) {
            it(`matches the boundary of a ${d}d simplex`, () => {
                const origin = new Array(d).fill(0.0)
                const points = [origin]
                const cell = [0]
                for (let i = 0; i < d; ++i) {
                    const y = origin.slice()
                    y[i] = 1
                    points.push(y)
                    cell.push(i + 1)
                }

                assertSameCells(
                    incrementalConvexHull(points),
                    cellBoundary([cell]),
                    'test base simplex boundary ok'
                )

                // Adding a point inside the simplex must not change the hull
                points.unshift(new Array(d).fill(1.0 / (d + 1)))
                cell.shift()
                cell.push(d + 1)

                assertSameCells(
                    incrementalConvexHull(points),
                    cellBoundary([cell]),
                    'test simplex with point in center'
                )
            })
        }
    })
    describe('input validation', () => {
        it('rejects an empty point set', () => {
            assert.throws(() => incrementalConvexHull([]), /at least d\+1 points/)
        })
        it('rejects too few points', () => {
            assert.throws(() => incrementalConvexHull([[0, 0], [1, 0]]), /at least d\+1 points/)
        })
        it('rejects a degenerate initial simplex', () => {
            assert.throws(
                () => incrementalConvexHull([[0, 0], [1, 1], [2, 2], [3, 4]]),
                /not in general position/
            )
        })
    })
})
