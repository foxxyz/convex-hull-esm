import { robustScale, robustSubtract, robustSum, twoProduct } from './robust-arithmetic.js'

// Robust orientation predicate
//
// orientation(p0, ..., pn) computes the determinant
//
//     | 1  p0[n-1]  ...  p0[1]  p0[0] |
//     | 1  p1[n-1]  ...  p1[1]  p1[0] |
//     |             ...               |
//
// using a fast floating point filter where available, and falling back to
// exact expansion arithmetic when the result is too close to zero to trust.
// This matches the sign convention of the robust-orientation package.

const EPSILON = 1.1102230246251565e-16
const ERRBOUND3 = (3.0 + 16.0 * EPSILON) * EPSILON
const ERRBOUND4 = (7.0 + 56.0 * EPSILON) * EPSILON

// Exact determinant of a square matrix of doubles, by cofactor expansion along
// the first row. Returns an expansion.
function exactDeterminant(matrix) {
    const n = matrix.length
    if (n === 1) {
        return [matrix[0][0]]
    }
    if (n === 2) {
        return robustSubtract(
            twoProduct(matrix[0][0], matrix[1][1]),
            twoProduct(matrix[0][1], matrix[1][0])
        )
    }
    let result = null
    for (let j = 0; j < n; ++j) {
        const minor = matrix.slice(1).map(row => row.filter((_, column) => column !== j))
        const term = robustScale(exactDeterminant(minor), matrix[0][j])
        if (result === null) {
            result = term
        } else if (j & 1) {
            result = robustSubtract(result, term)
        } else {
            result = robustSum(result, term)
        }
    }
    return result
}

// Exact orientation of an array of n points, each with at least n - 1 coords
function orientationExact(points) {
    const n = points.length
    // Leading 1, then the first n - 1 coordinates in reverse order
    const rows = points.map(p => [1, ...p.slice(0, n - 1).toReversed()])
    return exactDeterminant(rows).at(-1)
}

function orientation2(a, b) {
    return b[0] - a[0]
}

export function orientation3(a, b, c) {
    const left = (a[1] - c[1]) * (b[0] - c[0])
    const right = (a[0] - c[0]) * (b[1] - c[1])
    const det = left - right
    let magnitude
    if (left > 0) {
        if (right <= 0) {
            return det
        }
        magnitude = left + right
    } else if (left < 0) {
        if (right >= 0) {
            return det
        }
        magnitude = -(left + right)
    } else {
        return det
    }
    const tol = ERRBOUND3 * magnitude
    if (det >= tol || det <= -tol) {
        return det
    }
    return orientationExact([a, b, c])
}

function orientation4(a, b, c, d) {
    const adx = a[0] - d[0]
    const bdx = b[0] - d[0]
    const cdx = c[0] - d[0]
    const ady = a[1] - d[1]
    const bdy = b[1] - d[1]
    const cdy = c[1] - d[1]
    const adz = a[2] - d[2]
    const bdz = b[2] - d[2]
    const cdz = c[2] - d[2]
    const bdxcdy = bdx * cdy
    const cdxbdy = cdx * bdy
    const cdxady = cdx * ady
    const adxcdy = adx * cdy
    const adxbdy = adx * bdy
    const bdxady = bdx * ady
    const det = adz * (bdxcdy - cdxbdy)
        + bdz * (cdxady - adxcdy)
        + cdz * (adxbdy - bdxady)
    const permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz)
        + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz)
        + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz)
    const tol = ERRBOUND4 * permanent
    if (det > tol || -det > tol) {
        return det
    }
    return orientationExact([a, b, c, d])
}

// Orientation of an array of points (any dimension)
export function orientationOf(points) {
    switch (points.length) {
        case 0:
        case 1:
            return 0
        case 2:
            return orientation2(points[0], points[1])
        case 3:
            return orientation3(points[0], points[1], points[2])
        case 4:
            return orientation4(points[0], points[1], points[2], points[3])
        default:
            return orientationExact(points)
    }
}

// Variadic form, matching the robust-orientation API: orientation(a, b, c, ...)
export function orientation(...points) {
    return orientationOf(points)
}
