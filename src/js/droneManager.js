/**
 * DroneManager module for managing multiple drone instances
 * Handles creation, selection, and formation control of drones
 */

class DroneManager {
    constructor(scene, camera, collidableObjects = [], navigationGrid = null) {
        this.scene = scene;
        this.camera = camera;
        this.drones = [];        // Array of all drone instances
        this.activeDroneIndex = -1;  // Index of currently active drone
        this.formationMode = false;  // Whether drones are in formation mode
        this.formationPattern = 'v'; // Default formation pattern (v, line, square)
        this.formationSpacing = 5;   // Spacing between drones in formation
        this.collidableObjects = collidableObjects;
        this.navigationGrid = navigationGrid;
        this._lastFKeyState = false; // Added: Initialize for clarity
        this._lastPKeyState = false; // Added: Initialize for clarity
    }

    /**
     * Add a new drone to the manager
     * @param {Object} options - Optional drone creation parameters (position, color, etc)
     * @returns {number} - Index of the newly created drone
     */
    addDrone(options = {}) {
        const defaults = {
            position: { x: 0, y: 10, z: 0 },
            color: 0x333333,
            name: `Drone ${this.drones.length + 1}`,
            collidableObjects: this.collidableObjects
        };
        
        const droneOptions = { ...defaults, ...options };
        
        // Create a new drone instance with the given options, including the navigationGrid
        const drone = DroneModule.create(this.scene, this.camera, droneOptions, this.navigationGrid);
        
        // Add to drones array
        this.drones.push(drone);
        
        // If this is the first drone, make it active
        if (this.drones.length === 1 && this.activeDroneIndex === -1) {
            this.setActiveDrone(0);
        }
        
        return this.drones.length - 1;
    }
    
    /**
     * Remove a drone from the manager
     * @param {number} index - Index of the drone to remove
     * @returns {boolean} - Whether the operation was successful
     */
    removeDrone(index) {
        if (index < 0 || index >= this.drones.length) {
            return false;
        }
        
        // Get drone to remove
        const drone = this.drones[index];
        
        // Remove from scene
        drone.renderer.removeFromScene();
        
        // Remove from array
        this.drones.splice(index, 1);
        
        // Update active drone index if necessary
        if (this.activeDroneIndex === index) {
            // If we removed the active drone, select the next one if available
            if (this.drones.length > 0) {
                this.activeDroneIndex = Math.min(index, this.drones.length - 1);
            } else {
                this.activeDroneIndex = -1;
            }
        } else if (this.activeDroneIndex > index) {
            // If we removed a drone before the active one, adjust the index
            this.activeDroneIndex--;
        }
        
        return true;
    }
    
    /**
     * Set the active drone by index
     * @param {number} index - Index of the drone to make active
     * @returns {boolean} - Whether the operation was successful
     */
    setActiveDrone(index) {
        if (index < 0 || index >= this.drones.length || index === this.activeDroneIndex) {
            return false;
        }
        
        // Deactivate current active drone
        if (this.activeDroneIndex !== -1 && this.drones[this.activeDroneIndex]) {
            this.drones[this.activeDroneIndex].setActive(false);
        }
        
        this.activeDroneIndex = index;
        const newActiveDrone = this.drones[this.activeDroneIndex];

        if (newActiveDrone) {
            newActiveDrone.setActive(true);
            newActiveDrone.exitFormation();
        }
        return true;
    }
    
    /**
     * Get the currently active drone
     * @returns {Object|null} - The active drone or null if none exists
     */
    getActiveDrone() {
        if (this.activeDroneIndex === -1) {
            return null;
        }
        
        return this.drones[this.activeDroneIndex];
    }
    
    /**
     * Toggle formation mode on/off
     * @param {boolean} enabled - Whether formation mode should be enabled
     */
    setFormationMode(enabled) {
        this.formationMode = enabled;
    }
    
    /**
     * Set the formation pattern
     * @param {string} pattern - The pattern to use ('v', 'line', 'square', etc)
     */
    setFormationPattern(pattern) {
        this.formationPattern = pattern;
    }
    
    /**
     * Calculate formation positions for follower drones
     * @private
     */
    _calculateFormationPositions() {
        if (!this.formationMode || this.drones.length <= 1 || this.activeDroneIndex === -1) {
            return [];
        }
        
        const leader = this.drones[this.activeDroneIndex];
        const leaderPosition = leader.physics.position;
        const leaderRotation = leader.physics.rotation * Math.PI / 180; // Convert to radians
        
        // Calculate positions based on formation pattern
        const positions = [];
        
        switch (this.formationPattern) {
            case 'v':
                // V formation - drones positioned behind leader in a V shape
                for (let i = 0; i < this.drones.length; i++) {
                    if (i === this.activeDroneIndex) continue; // Skip leader
                    
                    const index = positions.length;
                    const side = index % 2 === 0 ? 1 : -1; // Alternate sides
                    const row = Math.floor(index / 2) + 1; // Row behind leader
                    
                    // Calculate position offset from leader
                    const xOffset = side * this.formationSpacing * row;
                    const zOffset = -this.formationSpacing * row;
                    
                    // Rotate offset based on leader's rotation
                    const rotatedX = xOffset * Math.cos(leaderRotation) - zOffset * Math.sin(leaderRotation);
                    const rotatedZ = xOffset * Math.sin(leaderRotation) + zOffset * Math.cos(leaderRotation);
                    
                    positions.push({
                        index: i,
                        position: {
                            x: leaderPosition.x + rotatedX,
                            y: leaderPosition.y,
                            z: leaderPosition.z + rotatedZ
                        },
                        rotation: leader.physics.rotation
                    });
                }
                break;
                
            case 'line':
                // Line formation - drones positioned in a line behind leader
                for (let i = 0; i < this.drones.length; i++) {
                    if (i === this.activeDroneIndex) continue; // Skip leader
                    
                    const row = positions.length + 1; // Row behind leader
                    
                    // Calculate position offset from leader
                    const xOffset = 0;
                    const zOffset = -this.formationSpacing * row;
                    
                    // Rotate offset based on leader's rotation
                    const rotatedX = xOffset * Math.cos(leaderRotation) - zOffset * Math.sin(leaderRotation);
                    const rotatedZ = xOffset * Math.sin(leaderRotation) + zOffset * Math.cos(leaderRotation);
                    
                    positions.push({
                        index: i,
                        position: {
                            x: leaderPosition.x + rotatedX,
                            y: leaderPosition.y,
                            z: leaderPosition.z + rotatedZ
                        },
                        rotation: leader.physics.rotation
                    });
                }
                break;
                
            case 'square':
                // Square formation - drones positioned in a square around leader
                const squareSize = Math.ceil(Math.sqrt(this.drones.length - 1));
                let posIndex = 0;
                
                for (let i = 0; i < this.drones.length; i++) {
                    if (i === this.activeDroneIndex) continue; // Skip leader
                    
                    const row = Math.floor(posIndex / squareSize);
                    const col = posIndex % squareSize;
                    posIndex++;
                    
                    // Calculate position offset from leader
                    const xOffset = (col - (squareSize - 1) / 2) * this.formationSpacing;
                    const zOffset = -row * this.formationSpacing - this.formationSpacing;
                    
                    // Rotate offset based on leader's rotation
                    const rotatedX = xOffset * Math.cos(leaderRotation) - zOffset * Math.sin(leaderRotation);
                    const rotatedZ = xOffset * Math.sin(leaderRotation) + zOffset * Math.cos(leaderRotation);
                    
                    positions.push({
                        index: i,
                        position: {
                            x: leaderPosition.x + rotatedX,
                            y: leaderPosition.y,
                            z: leaderPosition.z + rotatedZ
                        },
                        rotation: leader.physics.rotation
                    });
                }
                break;
        }
        
        return positions;
    }
    
    /**
     * Update all drones in the manager
     * @param {number} delta - Time delta since last frame
     * @param {Object} keys - Object containing the state of keyboard keys
     */
    update(delta, keys) {
        if (this.drones.length === 0) {
            return;
        }
        
        // Process number keys to switch active drone
        for (let i = 1; i <= 9 && i <= this.drones.length; i++) {
            if (keys[`${i}`]) {
                // Deactivate current active drone
                // if (this.activeDroneIndex !== -1) { // Logic moved to setActiveDrone
                //     this.drones[this.activeDroneIndex].setActive(false);
                // }
                
                // Set new active drone
                this.setActiveDrone(i - 1);
                // const newActiveDrone = this.drones[this.activeDroneIndex]; // Logic moved
                // newActiveDrone.setActive(true); // Logic moved
                
                // Make sure the active drone exits formation mode
                // newActiveDrone.exitFormation(); // Logic moved to setActiveDrone
                
                break;
            }
        }
        
        // Toggle formation mode with 'F' key
        if (keys.f && !this._lastFKeyState) {
            this.formationMode = !this.formationMode;
            this._updateFormationStatus();
            
            // If exiting formation mode, tell all drones to exit formation
            if (!this.formationMode) {
                for (let i = 0; i < this.drones.length; i++) {
                    if (i !== this.activeDroneIndex) {
                        this.drones[i].exitFormation();
                    }
                }
            }
        }
        this._lastFKeyState = keys.f;
        
        // Cycle formation patterns with 'P' key
        if (keys.p && !this._lastPKeyState) {
            const patterns = ['v', 'line', 'square'];
            const currentIndex = patterns.indexOf(this.formationPattern);
            const nextIndex = (currentIndex + 1) % patterns.length;
            this.formationPattern = patterns[nextIndex];
            this._updateFormationStatus();
        }
        this._lastPKeyState = keys.p;
        
        // Update the active drone normally
        const activeDrone = this.getActiveDrone();
        if (activeDrone) {
            activeDrone.update(delta, keys);
        }
        
        // Handle formation mode updates for non-active drones
        if (this.formationMode && this.drones.length > 1) {
            const formationPositions = this._calculateFormationPositions();
            
            for (const posData of formationPositions) {
                const drone = this.drones[posData.index];
                
                // Move follower drone toward its formation position
                drone.followFormationPosition(
                    posData.position,
                    posData.rotation,
                    delta
                );
            }
        } else {
            // If not in formation mode, update all non-active drones normally
            // but without user input (keys would be empty)
            for (let i = 0; i < this.drones.length; i++) {
                if (i !== this.activeDroneIndex) {
                    this.drones[i].update(delta, {});
                }
            }
        }
    }
    
    /**
     * Update formation status in the dashboard
     * @private
     */
    _updateFormationStatus() {
        const formationModeElement = document.getElementById('formationMode');
        const formationPatternElement = document.getElementById('formationPattern');
        
        if (formationModeElement) {
            formationModeElement.textContent = this.formationMode ? 'On' : 'Off';
            formationModeElement.style.color = this.formationMode ? '#4CAF50' : '#ff3366';
        }
        
        if (formationPatternElement) {
            const patternDisplay = {
                'v': 'V-Formation',
                'line': 'Line Formation',
                'square': 'Square Formation'
            };
            formationPatternElement.textContent = patternDisplay[this.formationPattern] || this.formationPattern;
        }
    }
    
    /**
     * Start flying all drones
     */
    startAllDrones() {
        for (const drone of this.drones) {
            drone.startFlying();
        }
        
        // Initialize formation status display
        this._updateFormationStatus();
    }
}

// Export the DroneManager
const DroneManagerModule = {
    /**
     * Create a new DroneManager instance
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {THREE.PerspectiveCamera} camera - The Three.js camera
     * @param {Array<THREE.Object3D>} collidableObjects - Array of collidable meshes
     * @param {NavigationGrid} navigationGrid - The navigation grid for pathfinding
     * @returns {DroneManager} - The new DroneManager instance
     */
    create: function(scene, camera, collidableObjects, navigationGrid) {
        return new DroneManager(scene, camera, collidableObjects, navigationGrid);
    }
}; 