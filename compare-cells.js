// compareCells (from simplicial-complex): ranks a pair of cells up to permutation

export function compareCells(a, b) {
    const length = a.length
    let difference = a.length - b.length
    if (difference) {
        return difference
    }
    switch (length) {
        case 0:
            return 0
        case 1:
            return a[0] - b[0]
        case 2: {
            const sumDifference = a[0] + a[1] - b[0] - b[1]
            if (sumDifference) {
                return sumDifference
            }
            return Math.min(a[0], a[1]) - Math.min(b[0], b[1])
        }
        case 3: {
            const pairSumA = a[0] + a[1]
            const pairSumB = b[0] + b[1]
            difference = pairSumA + a[2] - (pairSumB + b[2])
            if (difference) {
                return difference
            }
            const pairMinA = Math.min(a[0], a[1])
            const pairMinB = Math.min(b[0], b[1])
            difference = Math.min(pairMinA, a[2]) - Math.min(pairMinB, b[2])
            if (difference) {
                return difference
            }
            return Math.min(pairMinA + a[2], pairSumA) - Math.min(pairMinB + b[2], pairSumB)
        }
        default: {
            // Default sort is lexicographic, but both sides use it, so equal
            // multisets still compare equal
            const sortedA = a.toSorted()
            const sortedB = b.toSorted()
            for (let i = 0; i < length; ++i) {
                difference = sortedA[i] - sortedB[i]
                if (difference) {
                    return difference
                }
            }
            return 0
        }
    }
}
