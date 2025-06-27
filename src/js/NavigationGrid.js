/**
 * NavigationGrid module for managing a 2D grid representation of the environment
 * for autonomous pathfinding.
 */
class NavigationGrid {
    constructor(worldWidth, worldDepth, cellSize, groundLevel = 0) {
        this.worldWidth = worldWidth; // Total width of the navigable area in world units (X-axis)
        this.worldDepth = worldDepth; // Total depth of the navigable area in world units (Z-axis)
        this.cellSize = cellSize;     // Size of each square grid cell in world units
        this.groundLevel = groundLevel; // Base Y-level of the ground

        // Calculate the number of cells in each dimension
        this.gridCellsX = Math.floor(worldWidth / cellSize);
        this.gridCellsZ = Math.floor(worldDepth / cellSize);

        // Initialize the grid
        // Each cell will store { maxObstacleHeight: groundLevel, isObstacle: false, worldX: centerX, worldZ: centerZ }
        this.grid = [];
        for (let i = 0; i < this.gridCellsX; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.gridCellsZ; j++) {
                const worldX = (i + 0.5) * this.cellSize - (this.worldWidth / 2);
                const worldZ = (j + 0.5) * this.cellSize - (this.worldDepth / 2);
                this.grid[i][j] = {
                    maxObstacleHeight: this.groundLevel,
                    isObstacle: false,
                    worldX: worldX, // X-coordinate of the cell's center in world space
                    worldZ: worldZ, // Z-coordinate of the cell's center in world space
                    // For A* later: gCost, hCost, fCost, parent
                };
            }
        }
    }

    /**
     * Converts world X, Z coordinates to grid cell indices.
     * @param {number} worldX - The X-coordinate in world space.
     * @param {number} worldZ - The Z-coordinate in world space.
     * @returns {{x: number, z: number}|null} Grid cell indices {x, z} or null if out of bounds.
     */
    worldToGridCoordinates(worldX, worldZ) {
        const gridX = Math.floor((worldX + this.worldWidth / 2) / this.cellSize);
        const gridZ = Math.floor((worldZ + this.worldDepth / 2) / this.cellSize);

        if (gridX >= 0 && gridX < this.gridCellsX && gridZ >= 0 && gridZ < this.gridCellsZ) {
            return { x: gridX, z: gridZ };
        }
        return null; // Out of bounds
    }

    /**
     * Converts grid cell indices to world X, Z coordinates (center of the cell).
     * @param {number} gridX - The X-index of the grid cell.
     * @param {number} gridZ - The Z-index of the grid cell.
     * @returns {{x: number, z: number}|null} World coordinates {x, z} or null if out of bounds.
     */
    gridToWorldCoordinates(gridX, gridZ) {
        if (gridX >= 0 && gridX < this.gridCellsX && gridZ >= 0 && gridZ < this.gridCellsZ) {
            return {
                x: this.grid[gridX][gridZ].worldX,
                z: this.grid[gridX][gridZ].worldZ,
            };
        }
        return null; // Out of bounds
    }

    /**
     * Populates the grid with obstacle information.
     * @param {Array<THREE.Object3D>} collidableObjects - Array of objects (buildings, trees).
     */
    populateFromObjects(collidableObjects) {
        // Reset grid isObstacle and maxObstacleHeight
        for (let i = 0; i < this.gridCellsX; i++) {
            for (let j = 0; j < this.gridCellsZ; j++) {
                this.grid[i][j].isObstacle = false;
                this.grid[i][j].maxObstacleHeight = this.groundLevel;
            }
        }

        for (const object of collidableObjects) {
            // TODO: Determine the 2D footprint (bounding box on XZ plane) of the object.
            // For THREE.Mesh with BoxGeometry, Box3 can be used.
            // For THREE.Group (like trees), iterate children or use a helper.
            
            const objectBox = new THREE.Box3().setFromObject(object);
            const minWorldX = objectBox.min.x;
            const maxWorldX = objectBox.max.x;
            const minWorldZ = objectBox.min.z;
            const maxWorldZ = objectBox.max.z;
            const objectTopY = objectBox.max.y; // This is a simplification, assumes ground is at Y=0 for object's base

            // Convert world footprint to grid cell range
            const startGridCoords = this.worldToGridCoordinates(minWorldX, minWorldZ);
            const endGridCoords = this.worldToGridCoordinates(maxWorldX, maxWorldZ);

            if (startGridCoords && endGridCoords) {
                for (let i = startGridCoords.x; i <= endGridCoords.x; i++) {
                    if (i < 0 || i >= this.gridCellsX) continue;
                    for (let j = startGridCoords.z; j <= endGridCoords.z; j++) {
                        if (j < 0 || j >= this.gridCellsZ) continue;
                        
                        // For now, a simple check if the cell's center is within the object's XZ range
                        // A more accurate check would be polygon intersection or sampling multiple points in cell
                        const cell = this.grid[i][j];
                        // This simplistic check below marks any cell touched by the object's AABB
                        
                        cell.isObstacle = true;
                        cell.maxObstacleHeight = Math.max(cell.maxObstacleHeight, objectTopY);
                    }
                }
            }
        }
        console.log("Navigation grid populated.");
    }

    /**
     * Gets the valid, navigable neighbors of a given grid cell.
     * @param {number} gridX - The X-index of the current cell.
     * @param {number} gridZ - The Z-index of the current cell.
     * @returns {Array<{x: number, z: number}>} An array of neighbor cell indices.
     */
    getNeighbors(gridX, gridZ) {
        const neighbors = [];
        const directions = [
            { x: -1, z: 0 }, { x: 1, z: 0 }, { x: 0, z: -1 }, { x: 0, z: 1 }, // Orthogonal
            { x: -1, z: -1 }, { x: -1, z: 1 }, { x: 1, z: -1 }, { x: 1, z: 1 } // Diagonal
        ];

        for (const dir of directions) {
            const nextX = gridX + dir.x;
            const nextZ = gridZ + dir.z;

            if (nextX >= 0 && nextX < this.gridCellsX &&
                nextZ >= 0 && nextZ < this.gridCellsZ &&
                !this.grid[nextX][nextZ].isObstacle) { // Only consider non-obstacle neighbors
                neighbors.push({ x: nextX, z: nextZ });
            }
        }
        return neighbors;
    }

    // Optional: Method to visualize the grid for debugging (draws lines or semi-transparent planes)
    visualize(scene) {
        const materialNonObstacle = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2 }); // Green for free
        const materialObstacle = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });    // Red for obstacle

        for (let i = 0; i < this.gridCellsX; i++) {
            for (let j = 0; j < this.gridCellsZ; j++) {
                const cell = this.grid[i][j];
                const geometry = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
                const plane = new THREE.Mesh(geometry, cell.isObstacle ? materialObstacle : materialNonObstacle);
                
                plane.position.set(cell.worldX, this.groundLevel + 0.1 + (cell.isObstacle ? cell.maxObstacleHeight / 200 : 0) , cell.worldZ); // slight offset for visibility & height cue
                plane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
                scene.add(plane);
            }
        }
         console.log("Navigation grid visualized.");
    }
} 