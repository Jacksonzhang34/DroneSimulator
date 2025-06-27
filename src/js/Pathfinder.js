/**
 * Pathfinder module using A* algorithm to find paths on the NavigationGrid.
 */
const Pathfinder = {
    /**
     * Finds a path from start to end 3D world coordinates using A*.
     * @param {NavigationGrid} navGrid - The navigation grid instance.
     * @param {THREE.Vector3} startWorldPos - The starting 3D position in world coordinates.
     * @param {THREE.Vector3} endWorldPos - The target 3D position in world coordinates.
     * @param {number} droneSafetyMargin - Minimum vertical distance to keep above obstacles.
     * @param {number} altitudeChangePenalty - Factor to penalize changing altitude.
     * @returns {Array<THREE.Vector3>|null} An array of 3D world points representing the path, or null if no path found.
     */
    findPath: function(navGrid, startWorldPos, endWorldPos, droneSafetyMargin = 1.0, altitudeChangePenalty = 1.5) {
        // 1. Convert startWorldPos and endWorldPos to grid cell coordinates
        const startNodeCoords = navGrid.worldToGridCoordinates(startWorldPos.x, startWorldPos.z);
        const endNodeCoords = navGrid.worldToGridCoordinates(endWorldPos.x, endWorldPos.z);

        if (!startNodeCoords || !endNodeCoords) {
            console.error("Start or end coordinates are out of grid bounds.");
            return null;
        }

        const startCell = navGrid.grid[startNodeCoords.x][startNodeCoords.z];
        const endCell = navGrid.grid[endNodeCoords.x][endNodeCoords.z];

        if (startCell.isObstacle || endCell.isObstacle) {
            console.error("Start or end cell is an obstacle.");
            // TODO: Optionally find nearest valid cell for start/end
            return null;
        }

        // 2. Initialize openSet and closedSet
        const openSet = []; // Nodes to be evaluated (for simplicity, an array; for performance, a Min-Heap)
        const closedSet = new Set(); // Stringified "x,z" of nodes already evaluated

        // 3. Reset/initialize A* properties for all grid cells
        //    It's often better to store these externally or reset them per call
        //    For this implementation, we'll add them to the cell objects dynamically
        for (let i = 0; i < navGrid.gridCellsX; i++) {
            for (let j = 0; j < navGrid.gridCellsZ; j++) {
                const cell = navGrid.grid[i][j];
                cell.gCost = Infinity;
                cell.hCost = Infinity;
                cell.fCost = Infinity;
                cell.parent = null;
                cell.flyY = 0; // Planned flying altitude at this cell
            }
        }
        
        // Heuristic function (3D Euclidean distance)
        function heuristic(cellA, flyYA, cellB_worldX, cellB_worldZ, flyYB) {
            const dx = cellB_worldX - cellA.worldX;
            const dz = cellB_worldZ - cellA.worldZ;
            const dy = flyYB - flyYA;
            return Math.sqrt(dx * dx + dz * dz + dy * dy);
        }

        // 4. Initialize start node
        startCell.gCost = 0;
        // Calculate flyY for start and end cells (important for heuristic and costs)
        startCell.flyY = Math.max(startWorldPos.y, startCell.maxObstacleHeight + droneSafetyMargin);
        const endCellFlyY = Math.max(endWorldPos.y, endCell.maxObstacleHeight + droneSafetyMargin);

        startCell.hCost = heuristic(startCell, startCell.flyY, endCell.worldX, endCell.worldZ, endCellFlyY);
        startCell.fCost = startCell.gCost + startCell.hCost;
        openSet.push(startCell);

        // 5. Loop while openSet is not empty
        while (openSet.length > 0) {
            // a. Get node in openSet with lowest fCost
            openSet.sort((a, b) => a.fCost - b.fCost); // Simple sort, not efficient for large sets
            const currentNode = openSet.shift(); // Get and remove best node

            // b. If current node is the goal node
            if (currentNode === endCell) {
                return reconstructPath(currentNode, navGrid, droneSafetyMargin, endWorldPos.y);
            }

            // c. Add current node to closedSet
            closedSet.add(`${navGrid.worldToGridCoordinates(currentNode.worldX, currentNode.worldZ).x},${navGrid.worldToGridCoordinates(currentNode.worldX, currentNode.worldZ).z}`);

            // d. For each neighbor of the current node
            const currentGridCoords = navGrid.worldToGridCoordinates(currentNode.worldX, currentNode.worldZ);
            const neighborsGridCoords = navGrid.getNeighbors(currentGridCoords.x, currentGridCoords.z);

            for (const neighborCoord of neighborsGridCoords) {
                const neighborNode = navGrid.grid[neighborCoord.x][neighborCoord.z];

                // i. If neighbor is in closedSet or is an obstacle (getNeighbors should already filter obstacles)
                if (closedSet.has(`${neighborCoord.x},${neighborCoord.z}`)) {
                    continue;
                }

                // Calculate planned flyY for the neighbor
                // This should aim for the endWorldPos.y, but clear obstacles
                neighborNode.flyY = Math.max(endWorldPos.y, neighborNode.maxObstacleHeight + droneSafetyMargin);

                // ii. Calculate tentative_gCost
                // Determine if the move is diagonal or orthogonal
                const dxNeighbor = Math.abs(neighborCoord.x - currentGridCoords.x);
                const dzNeighbor = Math.abs(neighborCoord.z - currentGridCoords.z);
                const isDiagonalMove = dxNeighbor === 1 && dzNeighbor === 1;
                const costToMove = isDiagonalMove ? navGrid.cellSize * Math.SQRT2 : navGrid.cellSize;
                
                const altitudeChange = Math.abs(neighborNode.flyY - currentNode.flyY);
                const tentativeGCost = currentNode.gCost + costToMove + (altitudeChange * altitudeChangePenalty);

                // iii. If this path to neighbor is better or neighbor not in openSet
                if (tentativeGCost < neighborNode.gCost) {
                    neighborNode.parent = currentNode;
                    neighborNode.gCost = tentativeGCost;
                    neighborNode.hCost = heuristic(neighborNode, neighborNode.flyY, endCell.worldX, endCell.worldZ, endCellFlyY);
                    neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;

                    if (!openSet.some(node => node === neighborNode)) {
                        openSet.push(neighborNode);
                    }
                } else if (!openSet.some(node => node === neighborNode)) {
                     // If not in openSet but path wasn't better (should only happen if gCost was inf)
                     // Still add it with calculated costs if it was never added.
                    neighborNode.hCost = heuristic(neighborNode, neighborNode.flyY, endCell.worldX, endCell.worldZ, endCellFlyY);
                    neighborNode.fCost = neighborNode.gCost + neighborNode.hCost; // gCost would be inf here if not updated
                    if(neighborNode.gCost === Infinity) { // only add if it truly hasn't been processed with a valid path
                         openSet.push(neighborNode);
                    }
                }
            }
        }

        // 6. If openSet is empty and goal not reached
        console.log("Pathfinder: No path found.");
        return null;
    }
};

/**
 * Reconstructs the path from the end node back to the start node.
 * @param {Object} endNode - The end cell/node from the A* search.
 * @param {NavigationGrid} navGrid
 * @param {number} droneSafetyMargin
 * @param {number} targetWaypointY
 * @returns {Array<THREE.Vector3>}
 */
function reconstructPath(endNode, navGrid, droneSafetyMargin, targetWaypointY) {
    const path = [];
    let currentNode = endNode;
    while (currentNode) {
        // Calculate the flyable Y for this point in the path
        const flyY = Math.max(targetWaypointY, currentNode.maxObstacleHeight + droneSafetyMargin);
        path.unshift(new THREE.Vector3(currentNode.worldX, flyY, currentNode.worldZ));
        currentNode = currentNode.parent;
    }
    return path;
} 