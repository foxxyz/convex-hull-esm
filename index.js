/**
 * convex-hull, consolidated from npm into a dependency-free ES module.
 *
 * Merges the following packages (all MIT, by Mikola Lysenko):
 *   convex-hull, affine-hull, incremental-convex-hull, monotone-convex-hull-2d,
 *   robust-orientation, robust-sum, robust-subtract, robust-scale,
 *   two-product, two-sum, simplicial-complex (compareCells only)
 *
 * bit-twiddle and union-find were transitive dependencies of simplicial-complex
 * but are unused by the convex hull code path, so they are omitted.
 *
 * This file is the entry point. It dispatches on dimension and re-exports the
 * pieces that were previously separate packages.
 */

import { affineHull } from './affine-hull.js'
import { incrementalConvexHull } from './incremental-hull.js'
import { monotoneConvexHull2D } from './monotone-hull-2d.js'

export { affineHull, incrementalConvexHull, monotoneConvexHull2D }
export { compareCells } from './compare-cells.js'
export { orientation } from './orientation.js'
export { robustScale, robustSubtract, robustSum, twoProduct, twoSum } from './robust-arithmetic.js'

// convex-hull: dimension dispatch

function convexHull1D(points) {
    let lo = 0
    let hi = 0
    for (let i = 1; i < points.length; ++i) {
        if (points[i][0] < points[lo][0]) {
            lo = i
        }
        if (points[i][0] > points[hi][0]) {
            hi = i
        }
    }
    if (lo < hi) {
        return [[lo], [hi]]
    } else if (lo > hi) {
        return [[hi], [lo]]
    }
    return [[lo]]
}

function convexHull2D(points) {
    const hull = monotoneConvexHull2D(points)
    if (hull.length <= 2) {
        return []
    }
    // Close the cycle: index -1 wraps to the last vertex
    return hull.map((b, i) => [hull.at(i - 1), b])
}

// Moves the basis points to the front, keeping the rest in order
function permute(points, basis) {
    const chosen = new Set(basis)
    return [
        ...basis.map(i => points[i]),
        ...points.filter((_, i) => !chosen.has(i))
    ]
}

// Maps one index in the permuted ordering back to its original position
function unpermuteIndex(index, basis) {
    if (index < basis.length) {
        return basis[index]
    }
    // Skip back over the basis points that were lifted out of the tail
    let original = index - basis.length
    for (const chosen of basis) {
        if (original >= chosen) {
            original += 1
        }
    }
    return original
}

function invPermute(cells, basis) {
    for (const cell of cells) {
        for (let j = 0; j < cell.length; ++j) {
            cell[j] = unpermuteIndex(cell[j], basis)
        }
    }
    return cells
}

function convexHullND(points, d) {
    try {
        return incrementalConvexHull(points, true)
    } catch {
        // If point set is degenerate, try to find a basis and rerun it
        const basis = affineHull(points)
        if (basis.length <= d) {
            // No basis, no try
            return []
        }
        const permuted = permute(points, basis)
        return invPermute(incrementalConvexHull(permuted, true), basis)
    }
}

/**
 * Computes the convex hull of a set of points in arbitrary dimension.
 *
 * @param {number[][]} points  An array of points, each an array of d coordinates
 * @returns {number[][]}  The facets of the hull, each given as an array of
 *   point indices (d indices per facet, oriented consistently)
 */
export function convexHull(points) {
    const n = points.length
    if (n === 0) {
        return []
    } else if (n === 1) {
        return [[0]]
    }
    const d = points[0].length
    if (d === 0) {
        return []
    } else if (d === 1) {
        return convexHull1D(points)
    } else if (d === 2) {
        return convexHull2D(points)
    }
    return convexHullND(points, d)
}

export default convexHull
