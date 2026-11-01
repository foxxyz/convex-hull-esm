// Exact floating point arithmetic (Shewchuk expansions)
//
// A non-overlapping expansion is an array of doubles, smallest magnitude first,
// whose sum is exactly the represented value.

const SPLITTER = 2 ** 27 + 1

// Returns [error, product] such that error + product === a * b exactly
export function twoProduct(a, b, result = [0, 0]) {
    const x = a * b

    const c = SPLITTER * a
    const abig = c - a
    const ahi = c - abig
    const alo = a - ahi

    const d = SPLITTER * b
    const bbig = d - b
    const bhi = d - bbig
    const blo = b - bhi

    const err1 = x - ahi * bhi
    const err2 = err1 - alo * bhi
    const err3 = err2 - ahi * blo

    result[0] = alo * blo - err3
    result[1] = x
    return result
}

// Returns [error, sum] such that error + sum === a + b exactly
export function twoSum(a, b, result = [0, 0]) {
    const x = a + b
    const bv = x - a
    const av = x - bv
    const br = b - bv
    const ar = a - av
    result[0] = ar + br
    result[1] = x
    return result
}

// Exact sum of two scalars as an expansion
function scalarScalar(a, b) {
    const x = a + b
    const bv = x - a
    const av = x - bv
    const br = b - bv
    const ar = a - av
    const y = ar + br
    if (y) {
        return [y, x]
    }
    return [x]
}

// Sums two expansions e and f, where each term of f is multiplied by fsign
// (1 for addition, -1 for subtraction). This single routine replaces the
// near-identical bodies of robust-sum and robust-subtract.
function expansionSum(e, f, fsign) {
    const ne = e.length | 0
    const nf = f.length | 0
    if (ne === 1 && nf === 1) {
        return scalarScalar(e[0], fsign * f[0])
    }
    const g = new Array(ne + nf)
    let count = 0
    let eptr = 0
    let fptr = 0
    const abs = Math.abs
    let ei = e[eptr]
    let ea = abs(ei)
    let fi = fsign * f[fptr]
    let fa = abs(fi)
    let a
    let b
    if (ea < fa) {
        b = ei
        eptr += 1
        if (eptr < ne) {
            ei = e[eptr]
            ea = abs(ei)
        }
    } else {
        b = fi
        fptr += 1
        if (fptr < nf) {
            fi = fsign * f[fptr]
            fa = abs(fi)
        }
    }
    if (eptr < ne && ea < fa || fptr >= nf) {
        a = ei
        eptr += 1
        if (eptr < ne) {
            ei = e[eptr]
            ea = abs(ei)
        }
    } else {
        a = fi
        fptr += 1
        if (fptr < nf) {
            fi = fsign * f[fptr]
            fa = abs(fi)
        }
    }
    let x = a + b
    let bv = x - a
    let y = b - bv
    let q0 = y
    let q1 = x
    let _x
    let _bv
    let _av
    let _br
    let _ar
    while (eptr < ne && fptr < nf) {
        if (ea < fa) {
            a = ei
            eptr += 1
            if (eptr < ne) {
                ei = e[eptr]
                ea = abs(ei)
            }
        } else {
            a = fi
            fptr += 1
            if (fptr < nf) {
                fi = fsign * f[fptr]
                fa = abs(fi)
            }
        }
        b = q0
        x = a + b
        bv = x - a
        y = b - bv
        if (y) {
            g[count++] = y
        }
        _x = q1 + x
        _bv = _x - q1
        _av = _x - _bv
        _br = x - _bv
        _ar = q1 - _av
        q0 = _ar + _br
        q1 = _x
    }
    while (eptr < ne) {
        a = ei
        b = q0
        x = a + b
        bv = x - a
        y = b - bv
        if (y) {
            g[count++] = y
        }
        _x = q1 + x
        _bv = _x - q1
        _av = _x - _bv
        _br = x - _bv
        _ar = q1 - _av
        q0 = _ar + _br
        q1 = _x
        eptr += 1
        if (eptr < ne) {
            ei = e[eptr]
        }
    }
    while (fptr < nf) {
        a = fi
        b = q0
        x = a + b
        bv = x - a
        y = b - bv
        if (y) {
            g[count++] = y
        }
        _x = q1 + x
        _bv = _x - q1
        _av = _x - _bv
        _br = x - _bv
        _ar = q1 - _av
        q0 = _ar + _br
        q1 = _x
        fptr += 1
        if (fptr < nf) {
            fi = fsign * f[fptr]
        }
    }
    if (q0) {
        g[count++] = q0
    }
    if (q1) {
        g[count++] = q1
    }
    if (!count) {
        g[count++] = 0.0
    }
    g.length = count
    return g
}

export function robustSum(e, f) {
    return expansionSum(e, f, 1)
}

export function robustSubtract(e, f) {
    return expansionSum(e, f, -1)
}

// Multiplies an expansion by a scalar
export function robustScale(e, scale) {
    const n = e.length
    if (n === 1) {
        const ts = twoProduct(e[0], scale)
        if (ts[0]) {
            return ts
        }
        return [ts[1]]
    }
    const g = new Array(2 * n)
    const q = [0.1, 0.1]
    const t = [0.1, 0.1]
    let count = 0
    twoProduct(e[0], scale, q)
    if (q[0]) {
        g[count++] = q[0]
    }
    for (let i = 1; i < n; ++i) {
        twoProduct(e[i], scale, t)
        const pq = q[1]
        twoSum(pq, t[0], q)
        if (q[0]) {
            g[count++] = q[0]
        }
        const a = t[1]
        const b = q[1]
        const x = a + b
        const bv = x - a
        const y = b - bv
        q[1] = x
        if (y) {
            g[count++] = y
        }
    }
    if (q[1]) {
        g[count++] = q[1]
    }
    if (count === 0) {
        g[count++] = 0.0
    }
    g.length = count
    return g
}
