import { compareCells } from './compare-cells.js'
import { orientationOf } from './orientation.js'

// incremental-convex-hull
//
// High level idea:
//   1. Use Clarkson's incremental construction to find convex hull
//   2. Point location in triangulation by jump and walk

class Simplex {
    constructor(vertices, adjacent, boundary) {
        this.vertices = vertices
        this.adjacent = adjacent
        this.boundary = boundary
        this.lastVisited = -1
    }

    flip() {
        const vertex = this.vertices[0]
        this.vertices[0] = this.vertices[1]
        this.vertices[1] = vertex
        const adjacentCell = this.adjacent[0]
        this.adjacent[0] = this.adjacent[1]
        this.adjacent[1] = adjacentCell
    }
}

class GlueFacet {
    constructor(vertices, cell, index) {
        this.vertices = vertices
        this.cell = cell
        this.index = index
    }
}

function compareGlue(a, b) {
    return compareCells(a.vertices, b.vertices)
}

class Triangulation {
    constructor(dimension, vertices, simplices) {
        this.dimension = dimension
        this.vertices = vertices
        this.simplices = simplices
        this.interior = simplices.filter(c => !c.boundary)

        this.tuple = new Array(dimension + 1)
        for (let i = 0; i <= dimension; ++i) {
            this.tuple[i] = this.vertices[i]
        }
    }

    orient() {
        return orientationOf(this.tuple)
    }

    // Degenerate situation where we are on boundary, but coplanar to face
    handleBoundaryDegeneracy(cell, point) {
        const d = this.dimension
        const newVertex = this.vertices.length - 1
        const tuple = this.tuple
        const vertices = this.vertices

        // Dumb solution: Just do dfs from boundary cell until we find any peak, or terminate
        const toVisit = [cell]
        cell.lastVisited = -newVertex
        while (toVisit.length > 0) {
            cell = toVisit.pop()
            const adjacent = cell.adjacent
            for (let i = 0; i <= d; ++i) {
                const neighbor = adjacent[i]
                if (!neighbor.boundary || neighbor.lastVisited <= -newVertex) {
                    continue
                }
                const neighborVertices = neighbor.vertices
                for (let j = 0; j <= d; ++j) {
                    const vertex = neighborVertices[j]
                    if (vertex < 0) {
                        tuple[j] = point
                    } else {
                        tuple[j] = vertices[vertex]
                    }
                }
                const side = this.orient()
                if (side > 0) {
                    return neighbor
                }
                neighbor.lastVisited = -newVertex
                if (side === 0) {
                    toVisit.push(neighbor)
                }
            }
        }
        return null
    }

    walk(point, random) {
        // Alias local properties
        const newVertex = this.vertices.length - 1
        const d = this.dimension
        const vertices = this.vertices
        const tuple = this.tuple

        // Compute initial jump cell
        const startIndex = random ? this.interior.length * Math.random() | 0 : this.interior.length - 1
        let cell = this.interior[startIndex]

        // Start walking
        outerLoop:
        while (!cell.boundary) {
            const cellVertices = cell.vertices
            const cellAdjacent = cell.adjacent

            for (let i = 0; i <= d; ++i) {
                tuple[i] = vertices[cellVertices[i]]
            }
            cell.lastVisited = newVertex

            // Find farthest adjacent cell
            for (let i = 0; i <= d; ++i) {
                const neighbor = cellAdjacent[i]
                if (neighbor.lastVisited >= newVertex) {
                    continue
                }
                const previous = tuple[i]
                tuple[i] = point
                const side = this.orient()
                tuple[i] = previous
                if (side < 0) {
                    cell = neighbor
                    continue outerLoop
                } else if (!neighbor.boundary) {
                    neighbor.lastVisited = newVertex
                } else {
                    neighbor.lastVisited = -newVertex
                }
            }
            return
        }

        return cell
    }

    addPeaks(point, cell) {
        const newVertex = this.vertices.length - 1
        const d = this.dimension
        const vertices = this.vertices
        const tuple = this.tuple
        const interior = this.interior
        const simplices = this.simplices

        // Walking finished at boundary, time to add peaks
        const toVisit = [cell]

        // Stretch initial boundary cell into a peak
        cell.lastVisited = newVertex
        cell.vertices[cell.vertices.indexOf(-1)] = newVertex
        cell.boundary = false
        interior.push(cell)

        // Record a list of all new boundaries created by added peaks so we can glue them together when we are all done
        const glueFacets = []

        // Do a traversal of the boundary walking outward from starting peak
        while (toVisit.length > 0) {
            // Pop off peak and walk over adjacent cells
            cell = toVisit.pop()
            const cellVertices = cell.vertices
            const cellAdjacent = cell.adjacent
            const indexOfNewVertex = cellVertices.indexOf(newVertex)
            if (indexOfNewVertex < 0) {
                continue
            }

            for (let i = 0; i <= d; ++i) {
                if (i === indexOfNewVertex) {
                    continue
                }

                // For each boundary neighbor of the cell
                const neighbor = cellAdjacent[i]
                if (!neighbor.boundary || neighbor.lastVisited >= newVertex) {
                    continue
                }

                const neighborVertices = neighbor.vertices

                // Test if neighbor is a peak
                if (neighbor.lastVisited !== -newVertex) {
                    // Compute orientation of p relative to each boundary peak
                    let indexOfPlaceholder = 0
                    for (let j = 0; j <= d; ++j) {
                        if (neighborVertices[j] < 0) {
                            indexOfPlaceholder = j
                            tuple[j] = point
                        } else {
                            tuple[j] = vertices[neighborVertices[j]]
                        }
                    }
                    const side = this.orient()

                    // Test if neighbor cell is also a peak
                    if (side > 0) {
                        neighborVertices[indexOfPlaceholder] = newVertex
                        neighbor.boundary = false
                        interior.push(neighbor)
                        toVisit.push(neighbor)
                        neighbor.lastVisited = newVertex
                        continue
                    } else {
                        neighbor.lastVisited = -newVertex
                    }
                }

                const neighborAdjacent = neighbor.adjacent

                // Otherwise, replace neighbor with new face
                const newVertices = cellVertices.slice()
                const newAdjacent = cellAdjacent.slice()
                const newCell = new Simplex(newVertices, newAdjacent, true)
                simplices.push(newCell)

                // Connect to neighbor
                const opposite = neighborAdjacent.indexOf(cell)
                if (opposite < 0) {
                    continue
                }
                neighborAdjacent[opposite] = newCell
                newAdjacent[indexOfNewVertex] = neighbor

                // Connect to cell
                newVertices[i] = -1
                newAdjacent[i] = cell
                cellAdjacent[i] = newCell

                // Flip facet
                newCell.flip()

                // Add to glue list
                for (let j = 0; j <= d; ++j) {
                    const vertex = newVertices[j]
                    if (vertex < 0 || vertex === newVertex) {
                        continue
                    }
                    // Every vertex except the placeholder and this one
                    const facet = newVertices.filter((v, k) => v >= 0 && k !== j)
                    glueFacets.push(new GlueFacet(facet, newCell, j))
                }
            }
        }

        // Glue boundary facets together
        glueFacets.sort(compareGlue)

        for (let i = 0; i + 1 < glueFacets.length; i += 2) {
            const a = glueFacets[i]
            const b = glueFacets[i + 1]
            if (a.index < 0 || b.index < 0) {
                continue
            }
            a.cell.adjacent[a.index] = b.cell
            b.cell.adjacent[b.index] = a.cell
        }
    }

    insert(point, random) {
        // Add point
        const vertices = this.vertices
        vertices.push(point)

        let cell = this.walk(point, random)
        if (!cell) {
            return
        }

        // Alias local properties
        const d = this.dimension
        const tuple = this.tuple

        // Degenerate case: If point is coplanar to cell, then walk until we find a non-degenerate boundary
        for (let i = 0; i <= d; ++i) {
            const vertex = cell.vertices[i]
            if (vertex < 0) {
                tuple[i] = point
            } else {
                tuple[i] = vertices[vertex]
            }
        }
        const side = this.orient()
        if (side < 0) {
            return
        } else if (side === 0) {
            cell = this.handleBoundaryDegeneracy(cell, point)
            if (!cell) {
                return
            }
        }

        // Add peaks
        this.addPeaks(point, cell)
    }

    // Extract all boundary cells
    boundary() {
        const d = this.dimension
        const boundary = []
        const cells = this.simplices
        const nc = cells.length
        for (let i = 0; i < nc; ++i) {
            const cell = cells[i]
            if (cell.boundary) {
                const boundaryCell = new Array(d)
                const cellVertices = cell.vertices
                let ptr = 0
                let parity = 0
                for (let j = 0; j <= d; ++j) {
                    if (cellVertices[j] >= 0) {
                        boundaryCell[ptr++] = cellVertices[j]
                    } else {
                        parity = j & 1
                    }
                }
                if (parity === (d & 1)) {
                    const swap = boundaryCell[0]
                    boundaryCell[0] = boundaryCell[1]
                    boundaryCell[1] = swap
                }
                boundary.push(boundaryCell)
            }
        }
        return boundary
    }
}

export function incrementalConvexHull(points, randomSearch) {
    const n = points.length
    if (n === 0) {
        throw new Error('Must have at least d+1 points')
    }
    const d = points[0].length
    if (n <= d) {
        throw new Error('Must input at least d+1 points')
    }

    // FIXME: This could be degenerate, but need to select d+1 non-coplanar points to bootstrap process
    const initialSimplex = points.slice(0, d + 1)

    // Make sure initial simplex is positively oriented
    const orientationSign = orientationOf(initialSimplex)
    if (orientationSign === 0) {
        throw new Error('Input not in general position')
    }
    const initialCoords = new Array(d + 1)
    for (let i = 0; i <= d; ++i) {
        initialCoords[i] = i
    }
    if (orientationSign < 0) {
        initialCoords[0] = 1
        initialCoords[1] = 0
    }

    // Create initial topological index, glue pointers together (kind of messy)
    const initialCell = new Simplex(initialCoords, new Array(d + 1), false)
    const boundary = initialCell.adjacent
    const cells = new Array(d + 2)
    for (let i = 0; i <= d; ++i) {
        const vertices = initialCoords.slice()
        for (let j = 0; j <= d; ++j) {
            if (j === i) {
                vertices[j] = -1
            }
        }
        const swap = vertices[0]
        vertices[0] = vertices[1]
        vertices[1] = swap
        const cell = new Simplex(vertices, new Array(d + 1), true)
        boundary[i] = cell
        cells[i] = cell
    }
    cells[d + 1] = initialCell
    for (let i = 0; i <= d; ++i) {
        const vertices = boundary[i].vertices
        const adjacent = boundary[i].adjacent
        for (let j = 0; j <= d; ++j) {
            const v = vertices[j]
            if (v < 0) {
                adjacent[j] = initialCell
                continue
            }
            for (let k = 0; k <= d; ++k) {
                if (boundary[k].vertices.indexOf(v) < 0) {
                    adjacent[j] = boundary[k]
                }
            }
        }
    }

    // Initialize triangles
    const triangles = new Triangulation(d, initialSimplex, cells)

    // Insert remaining points
    const useRandom = !!randomSearch
    for (let i = d + 1; i < n; ++i) {
        triangles.insert(points[i], useRandom)
    }

    // Extract boundary cells
    return triangles.boundary()
}
