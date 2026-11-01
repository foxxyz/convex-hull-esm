// Ported from the test suites of two-product, two-sum, robust-sum, robust-subtract and robust-scale.
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { robustScale, robustSubtract, robustSum, twoProduct, twoSum } from '../robust-arithmetic.js'

// Use BigInt to check numbers higher than 53-bit mantissas
// Convert double to BigInt by shifting left 1074 bits (2^-1074 is smallest finite double)
const FIXED_POINT_BITS = 1074
const FIXED_POINT_SHIFT = BigInt(FIXED_POINT_BITS)
function doubleToFixed(x) {
    const [whole, fraction = ''] = Math.abs(x).toString(2).split('.')
    const magnitude = BigInt(`0b${whole}${fraction.padEnd(FIXED_POINT_BITS, '0')}`)
    return x < 0 ? -magnitude : magnitude
}

function sequenceToFixed(seq) {
    let total = 0n
    for (const x of seq) {
        total += doubleToFixed(x)
    }
    return total
}

// Inclusive range of binary exponents spanned by a double's significand
function significandRange(x) {
    const fixed = doubleToFixed(x)
    const binary = (fixed < 0n ? -fixed : fixed).toString(2)
    return [binary.length - 1 - binary.lastIndexOf('1'), binary.length - 1]
}

// Terms of a robust sequence must share no binary exponent, or the sequence
// would be carrying the same bit of information twice
function floatsOverlap(a, b) {
    if (a === 0 || b === 0) {
        return false
    }
    const [lowA, highA] = significandRange(a)
    const [lowB, highB] = significandRange(b)
    return lowA <= highB && lowB <= highA
}

// A valid robust sequence is strictly increasing in magnitude and
// non-overlapping, so its terms sum exactly to the value it represents
function assertValidSequence(seq, message) {
    assert.ok(seq.length >= 1, `${message}: empty sequence`)
    for (let i = 1; i < seq.length; ++i) {
        const pair = `${seq[i - 1]}, ${seq[i]}`
        assert.ok(Math.abs(seq[i - 1]) < Math.abs(seq[i]), `${message}: not increasing: ${pair}`)
        assert.ok(!floatsOverlap(seq[i], seq[i - 1]), `${message}: overlapping: ${pair}`)
    }
}

// Strict deep equality separates negative zero from zero, a distinction these
// results do not intend, so flatten it before comparing
function assertSameNumbers(actual, expected, message) {
    const flatten = values => values.map(x => Object.is(x, -0) ? 0 : x)
    assert.deepEqual(flatten(actual), flatten(expected), message)
}

function shuffle(list) {
    const out = list.slice()
    for (let i = out.length - 1; i > 0; --i) {
        const j = Math.floor(Math.random() * (i + 1))
        const swap = out[i]
        out[i] = out[j]
        out[j] = swap
    }
    return out
}

describe('twoProduct', () => {
    const testValues = [
        0,
        1,
        2 ** -52,
        2 ** -53,
        1.0 - 2 ** -53,
        1.0 + 2 ** -52,
        2 ** -500,
        2 ** 500,
        2,
        0.5,
        3,
        1.5,
        0.1,
        0.3,
        0.7
    ]
    for (let i = 0; i < 20; ++i) {
        testValues.push(Math.random())
        testValues.push(Math.random() * 2 ** (1000 * Math.random() - 500))
    }
    for (let i = testValues.length - 1; i > 0; --i) {
        testValues.push(-testValues[i])
    }

    it('multiplies by zero, one and minus one', () => {
        for (const a of testValues) {
            assert.ok(a * a < Infinity, `check finite: ${a}`)
            assertSameNumbers(twoProduct(0, a), [0, 0], `multiply by 0: ${a}`)
            assertSameNumbers(twoProduct(1, a), [0, a], `multiply by 1: ${a}`)
            assertSameNumbers(twoProduct(-1, a), [0, -a], `multiply by -1: ${a}`)
        }
    })
    it('returns a non-overlapping, increasing, commutative pair', () => {
        for (const a of testValues) {
            for (const b of testValues) {
                const s = twoProduct(a, b)
                assert.ok(!floatsOverlap(s[0], s[1]), `overlapping: ${a} * ${b}`)
                assert.ok(Math.abs(s[0]) <= Math.abs(s[1]), `increasing: ${a} * ${b}`)
                assert.equal(s[1], a * b, `approximation: ${a} * ${b}`)
                assertSameNumbers(twoProduct(b, a), s, `commutativity: ${a} * ${b}`)
            }
        }
    })
    it('is exact while the error term stays normal', () => {
        for (const a of testValues) {
            for (const b of testValues) {
                // The error term runs about 2^-53 of the product, so once the
                // product falls below 2^-969 that term lands in the subnormal
                // range and loses bits. Shewchuk's two-product is only exact
                // while both of its terms stay normal.
                if (a * b !== 0 && Math.abs(a * b) < 2 ** -969) {
                    continue
                }
                const s = twoProduct(a, b)
                const product = doubleToFixed(a) * doubleToFixed(b)
                const represented = sequenceToFixed(s) << FIXED_POINT_SHIFT
                assert.equal(represented, product, `exactness: ${a} * ${b}`)
            }
        }
    })
    it('loses exactness only when the error term underflows', () => {
        const a = 2.6917503058457867e-143
        const b = 1.325403138650852e-150
        const s = twoProduct(a, b)
        assert.ok(Math.abs(s[0]) < 2 ** -1022, 'error term is subnormal')
        assert.notEqual(
            sequenceToFixed(s) << FIXED_POINT_SHIFT,
            doubleToFixed(a) * doubleToFixed(b),
            'subnormal error term cannot represent the product exactly'
        )

        // The same mantissas, scaled up into the normal range, are exact
        const scaledA = a * 2 ** 200
        const scaledB = b * 2 ** 200
        const scaled = twoProduct(scaledA, scaledB)
        assert.equal(
            sequenceToFixed(scaled) << FIXED_POINT_SHIFT,
            doubleToFixed(scaledA) * doubleToFixed(scaledB),
            'exact once the error term is normal'
        )
    })
    it('expands a product that needs both terms', () => {
        assertSameNumbers(
            twoProduct(1.0 + 2 ** -52, 1.0 + 2 ** -52),
            [2 ** -104, 1.0 + 2 ** -51],
            'test expansion'
        )
    })
})

describe('twoSum', () => {
    it('matches known sums', () => {
        assertSameNumbers(twoSum(1e64, 1), [1, 1e64])
        assertSameNumbers(twoSum(1, 1), [0, 2])
        assertSameNumbers(twoSum(0, -1415), [0, -1415])
        assertSameNumbers(twoSum(1e-64, 1e64), [1e-64, 1e64])
        assertSameNumbers(twoSum(0, 0), [0, 0])
        assertSameNumbers(twoSum(9e15 + 1, 9e15), [1, 18000000000000000])
    })
})

describe('robustSum', () => {
    it('matches known sums', () => {
        assertSameNumbers(robustSum([1, 64], [-1e-64, 1e64]), [-1e-64, 65, 1e64])
        assertSameNumbers(robustSum([0], [0]), [0])
        assertSameNumbers(robustSum([0], [1]), [1])
        assertSameNumbers(robustSum([1, 1e64], [1e-64, 2]), [1e-64, 3, 1e64])
        assertSameNumbers(robustSum([1], [1e-64, 1e-16]), [1e-64, 1e-16, 1])
        assertSameNumbers(robustSum([0], [1, 1e64]), [1, 1e64])
    })
    it('adds small integers', () => {
        for (let i = -10; i <= 10; ++i) {
            for (let j = -10; j <= 10; ++j) {
                assertSameNumbers(robustSum([i], [j]), [i + j], `${i} + ${j}`)
            }
        }
    })
    it('keeps a valid sequence when terms are equal', () => {
        const x = [5.711861227349496e-133, 1e-116]
        assertValidSequence(robustSum(x, x), 'equal sequences')
    })
    it('doubles a widely spread sequence', () => {
        const noise = new Array(10)
        const expected = new Array(10)
        for (let i = 0; i < 10; ++i) {
            noise[i] = 2 ** (-1000 + 53 * i)
            expected[i] = 2 ** (-999 + 53 * i)
        }
        const x = robustSum(noise, noise)
        assertSameNumbers(x, expected)
        assertValidSequence(x, 'doubled sequence')
    })
    it('stays valid while accumulating random magnitudes', () => {
        let s = [0]
        for (let i = 0; i < 1000; ++i) {
            s = robustSum(s, [Math.random() * 2 ** (Math.random() * 1800 - 900)])
            assertValidSequence(s, `accumulation step ${i}`)
        }
    })
})

describe('robustSubtract', () => {
    it('cancels equal values', () => {
        assertSameNumbers(robustSubtract([1], [1]), [0])
    })
    it('stays valid while accumulating random magnitudes', () => {
        let s = [0]
        for (let i = 0; i < 100; ++i) {
            s = robustSubtract(s, [Math.random() * 2 ** (Math.random() * 1000)])
            assertValidSequence(s, `accumulation step ${i}`)
        }
    })
})

describe('robustScale', () => {
    it('matches known products', () => {
        assertSameNumbers(robustScale([4], 2), [8])
        assertSameNumbers(robustScale([1, 1e64], 2), [2, 2e64])
        assertSameNumbers(robustScale([1], 1), [1])
    })
    it('keeps the sign of a negative result', () => {
        const s = robustScale([-2.4707339790384e-144, -1.6401064715739963e-142, 2e-126], -10e-64)
        assertValidSequence(s, 'negative scale')
        assert.ok(s[s.length - 1] < 0, 'result is negative')
    })
    it('scales scalars', () => {
        for (let i = -50; i < 50; ++i) {
            for (let j = -50; j < 50; ++j) {
                assertSameNumbers(robustScale([i], j), [i * j], `${i} * ${j}`)
            }
        }
    })
    it('scales sequences exactly, in any order', () => {
        const sequences = [
            [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
            [Math.random(), Math.random(), Math.random(), Math.random()],
            [1, 2, 1 + 2 ** -52, 2 ** 100],
            Array.from({ length: 10 }, () => 2 * Math.random() - 1)
        ]

        function verifySequence(seq) {
            // Track the same product in exact fixed point and compare
            let exact = 1n << FIXED_POINT_SHIFT
            let r = [1]
            for (const h of seq) {
                r = robustScale(r, h)
                const scaled = exact * doubleToFixed(h)
                exact = scaled >> FIXED_POINT_SHIFT
                assertValidSequence(r, 'check increasing and non-overlapping')
                assert.equal(sequenceToFixed(r), exact, 'check result correct')
            }
        }

        for (const seq of sequences) {
            verifySequence(seq)
            for (let k = 0; k < 10; ++k) {
                verifySequence(shuffle(seq))
            }
        }
    })
})
