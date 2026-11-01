import { orientationOf } from './orientation.js'

// affine-hull: finds a maximal affinely independent subset of the points

// Tests whether the given points span an independent frame, padding a partial
// frame out to d + 1 points with samples from the moment curve [t^0, t^1, ...]
function linearlyIndependent(points, d) {
    const padded = new Array(d + 1)
    for (let i = 0; i < points.length; ++i) {
        padded[i] = points[i]
    }
    for (let offset = 0; offset <= points.length; ++offset) {
        for (let j = points.length; j <= d; ++j) {
            const t = j + 1 - offset
            padded[j] = Array.from({ length: d }, (_, power) => t ** power)
        }
        if (orientationOf(padded)) {
            return true
        }
    }
    return false
}

export function affineHull(points) {
    const n = points.length
    if (n === 0) {
        return []
    }
    if (n === 1) {
        return [0]
    }
    const d = points[0].length
    const frame = [points[0]]
    const indices = [0]
    for (let i = 1; i < n; ++i) {
        frame.push(points[i])
        if (!linearlyIndependent(frame, d)) {
            frame.pop()
            continue
        }
        indices.push(i)
        if (indices.length === d + 1) {
            return indices
        }
    }
    return indices
}
