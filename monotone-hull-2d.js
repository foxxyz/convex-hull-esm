import { orientation3 } from './orientation.js'

// monotone-convex-hull-2d: Andrew's monotone chain algorithm

export function monotoneConvexHull2D(points) {
    const n = points.length

    if (n < 3) {
        if (n === 2 &&
            points[0][0] === points[1][0] &&
            points[0][1] === points[1][1]) {
            return [0]
        }
        return [...points.keys()]
    }

    // Sort point indices along the x-axis, breaking ties on y
    const sorted = [...points.keys()].sort((a, b) =>
        points[a][0] - points[b][0] || points[a][1] - points[b][1])

    // Construct upper and lower hulls
    const lower = [sorted[0], sorted[1]]
    const upper = [sorted[0], sorted[1]]

    for (let i = 2; i < n; ++i) {
        const index = sorted[i]
        const point = points[index]

        // Pop from the lower chain while the last turn is not a right turn
        while (lower.length > 1 && orientation3(
            points[lower.at(-2)],
            points[lower.at(-1)],
            point) <= 0) {
            lower.pop()
        }
        lower.push(index)

        // Pop from the upper chain while the last turn is not a left turn
        while (upper.length > 1 && orientation3(
            points[upper.at(-2)],
            points[upper.at(-1)],
            point) >= 0) {
            upper.pop()
        }
        upper.push(index)
    }

    // The two chains share their endpoints, so drop them from the upper one
    return [...lower, ...upper.slice(1, -1).toReversed()]
}
