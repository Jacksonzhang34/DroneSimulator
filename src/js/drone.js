/**
 * Drone module for the Drone Simulator
 * Refactored into modular components with clear separation of concerns
 */

// DronePhysics - Handles all physics calculations and state
class DronePhysics {
    constructor(initialPosition = { x: 0, y: 1, z: 0 }) {
        // Physics constants
        this.GRAVITY = 9.8;
        this.LIFT_POWER = 6;
        this.MAX_TILT = 30;
        this.ROTATION_SPEED = 1.0;
        this.MOVEMENT_SPEED = 25;
        this.DRAG_FACTOR = 0.95;
        this.VERTICAL_DRAG_FACTOR = 0.97;
        this.GROUND_LEVEL = 0;
        this.FORMATION_FOLLOW_SPEED = 10; // Speed for formation following
        
        // State
        this.altitude = initialPosition.y;
        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = 0; // degrees
        this.tilt = { x: 0, z: 0 }; // tilt angles in degrees
        this.position = { ...initialPosition };
        this.inFormation = false; // Whether this drone is following in formation
        this.crashed = false; // Added: Flag to indicate if the drone has crashed
        this.autonomousTargetReachedThreshold = 1.5; // How close to a point to consider it reached
    }
    
    /**
     * Apply physics calculations based on current inputs
     * @param {number} delta - Time delta since last frame
     * @param {Object} keys - Object containing the state of keyboard keys
     * @param {boolean} isFlying - Whether the drone is currently flying
     * @param {THREE.Vector3 | null} autonomousTarget - Optional 3D target for autonomous flight.
     */
    update(delta, keys, isFlying, autonomousTarget = null) {
        if (!isFlying) return;
        
        if (this.crashed) {
            // If crashed, only apply gravity and ground collision
            this.velocity.y -= this.GRAVITY * delta;
            this._updatePosition(delta);
            this._handleGroundCollision();
            this.altitude = this.position.y;
            // Reset tilt when crashed
            this.tilt.x = 0;
            this.tilt.z = 0;
            return;
        }
        
        if (autonomousTarget) {
            this._steerTowardsPoint(autonomousTarget, delta);
        } else {
            // Manual control or non-autonomous hover/formation
            let lift = this._calculateLift(keys);
            this.velocity.y += (lift - this.GRAVITY) * delta;
            this._handleRotation(keys);
            this._handleMovement(delta, keys);
        }
        
        // Apply air resistance (drag)
        this._applyDrag();
        
        // Update position
        this._updatePosition(delta);
        
        // Handle ground collision
        this._handleGroundCollision();
        
        // Update altitude
        this.altitude = this.position.y;
    }
    
    /**
     * Calculate lift based on current inputs
     * @private
     */
    _calculateLift(keys) {
        let lift = 0;
        
        // Vertical controls (up/down)
        if (keys.ArrowUp || keys.Space) {
            lift += this.LIFT_POWER * 4.5;
        } else if (keys.ArrowDown || keys.ShiftLeft || keys.ShiftRight) {
            lift -= this.LIFT_POWER * 4.5;
        } else {
            // Hover oscillation
            lift = this.GRAVITY;
            lift += Math.sin(Date.now() / 500) * 3.0;
            lift += (Math.random() - 0.5) * 3.0;
            
            // Small correction to prevent extreme drift
            const distanceFromHover = this.altitude - this.position.y;
            if (Math.abs(distanceFromHover) > 2.0) {
                lift += distanceFromHover * 0.1;
            }
        }
        
        return lift;
    }
    
    /**
     * Handle drone rotation
     * @private
     */
    _handleRotation(keys) {
        if (keys.q) {
            this.rotation += this.ROTATION_SPEED;
        }
        if (keys.e) {
            this.rotation -= this.ROTATION_SPEED;
        }
        
        // Normalize rotation to 0-360
        this.rotation = (this.rotation + 360) % 360;
    }
    
    /**
     * Handle drone movement and calculate tilting
     * @private
     */
    _handleMovement(delta, keys) {
        const rotationRad = this.rotation * Math.PI / 180;
        
        // Forward/backward tilt and movement
        if (keys.w) {
            this.tilt.x = Math.min(this.tilt.x + 1, this.MAX_TILT);
            this.velocity.z += Math.cos(rotationRad) * this.MOVEMENT_SPEED * delta;
            this.velocity.x += Math.sin(rotationRad) * this.MOVEMENT_SPEED * delta;
        } else if (keys.s) {
            this.tilt.x = Math.max(this.tilt.x - 1, -this.MAX_TILT);
            this.velocity.z -= Math.cos(rotationRad) * this.MOVEMENT_SPEED * delta;
            this.velocity.x -= Math.sin(rotationRad) * this.MOVEMENT_SPEED * delta;
        } else {
            // Return to level
            this.tilt.x = this.tilt.x * 0.95;
        }
        
        // Left/right tilt and movement
        if (keys.a) {
            this.tilt.z = Math.max(this.tilt.z - 1, -this.MAX_TILT);
            this.velocity.x += Math.cos(rotationRad) * this.MOVEMENT_SPEED * delta;
            this.velocity.z -= Math.sin(rotationRad) * this.MOVEMENT_SPEED * delta;
        } else if (keys.d) {
            this.tilt.z = Math.min(this.tilt.z + 1, this.MAX_TILT);
            this.velocity.x -= Math.cos(rotationRad) * this.MOVEMENT_SPEED * delta;
            this.velocity.z += Math.sin(rotationRad) * this.MOVEMENT_SPEED * delta;
        } else {
            // Return to level
            this.tilt.z = this.tilt.z * 0.95;
        }
        
        // Reset position
        if (keys.r) {
            this.reset();
        }
    }
    
    /**
     * Apply drag to velocity
     * @private
     */
    _applyDrag() {
        this.velocity.x *= this.DRAG_FACTOR;
        this.velocity.y *= this.VERTICAL_DRAG_FACTOR;
        this.velocity.z *= this.DRAG_FACTOR;
    }
    
    /**
     * Update position based on velocity
     * @private
     */
    _updatePosition(delta) {
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;
    }
    
    /**
     * Handle collision with the ground
     * @private
     */
    _handleGroundCollision() {
        if (this.position.y < 1) {
            this.position.y = 1;
            this.velocity.y = 0;
        }
    }
    
    /**
     * Reset the drone physics to default position
     */
    reset() {
        this.position = { x: 0, y: 10, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = 0;
        this.tilt = { x: 0, z: 0 };
        this.crashed = false; // Added: Reset crashed state
    }
    
    /**
     * Get the current speed of the drone
     */
    getSpeed() {
        return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    }
    
    /**
     * Get the current tilt magnitude of the drone
     */
    getTiltMagnitude() {
        return Math.sqrt(this.tilt.x * this.tilt.x + this.tilt.z * this.tilt.z);
    }
    
    /**
     * Steers the drone towards a given 3D target point (for autonomous flight).
     * Modifies velocity, rotation, and tilt.
     * @param {THREE.Vector3} targetWorldPos - The target position in world coordinates.
     * @param {number} delta - Time delta since last frame.
     * @private
     */
    _steerTowardsPoint(targetWorldPos, delta) {
        const desiredVelocity = new THREE.Vector3().subVectors(targetWorldPos, this.position);
        const distanceToTarget = desiredVelocity.length();

        // --- Yaw Control (Rotation) ---
        if (distanceToTarget > 0.1) { // Only adjust yaw if not too close
            const targetRotationRad = Math.atan2(desiredVelocity.x, desiredVelocity.z);
            let targetRotationDeg = THREE.MathUtils.radToDeg(targetRotationRad);
            
            // Normalize targetRotationDeg to be positive
            if (targetRotationDeg < 0) targetRotationDeg += 360;

            let rotationDiff = targetRotationDeg - this.rotation;
            // Normalize to shortest angle
            if (rotationDiff > 180) rotationDiff -= 360;
            if (rotationDiff < -180) rotationDiff += 360;

            const maxRotationChange = this.ROTATION_SPEED * 2.0; // Allow faster autonomous turning
            this.rotation += THREE.MathUtils.clamp(rotationDiff, -maxRotationChange, maxRotationChange) * delta * 50; // Multiplying by delta * 50 is a heuristic for speed
            this.rotation = (this.rotation + 360) % 360;
        }

        // --- Lift and Y-Velocity Control ---
        const heightDifference = targetWorldPos.y - this.position.y;
        const verticalSpeedFactor = 5.0; // How aggressively to change y-velocity

        if (Math.abs(heightDifference) > 0.2) { // Threshold to avoid jitter
            this.velocity.y += heightDifference * verticalSpeedFactor * delta;
        } else {
            this.velocity.y *= 0.8; // Dampen y-velocity when close to target height
        }
        // Clamp vertical speed to avoid excessive lift/fall rates
        this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -this.LIFT_POWER, this.LIFT_POWER);


        // --- XZ Movement and Tilt Control ---
        const maxHorizontalSpeed = this.MOVEMENT_SPEED * 0.03; // Adjusted from original usage
        
        if (distanceToTarget > this.autonomousTargetReachedThreshold * 0.5) { // Start slowing down if close
             // Reduce speed if very close to avoid overshooting, but maintain some movement
            const speedReductionFactor = Math.min(1.0, distanceToTarget / (this.autonomousTargetReachedThreshold * 2));
            desiredVelocity.setLength(maxHorizontalSpeed * speedReductionFactor);

            this.velocity.x = desiredVelocity.x;
            this.velocity.z = desiredVelocity.z;
        } else if (distanceToTarget > 0.1) { // Creep if very close but not at point
             desiredVelocity.setLength(maxHorizontalSpeed * 0.2);
             this.velocity.x = desiredVelocity.x;
             this.velocity.z = desiredVelocity.z;
        }
         else { // Almost at target
            this.velocity.x *= 0.9; // Dampen XZ velocity
            this.velocity.z *= 0.9;
        }
        
        // --- Tilt Calculation (simplified for autonomous) ---
        // Tilt forward/backward based on Z velocity relative to drone's orientation
        // Tilt left/right based on X velocity relative to drone's orientation
        const rotationRad = this.rotation * Math.PI / 180;
        const localVelocityZ = this.velocity.z * Math.cos(rotationRad) - this.velocity.x * Math.sin(rotationRad);
        const localVelocityX = this.velocity.x * Math.cos(rotationRad) + this.velocity.z * Math.sin(rotationRad);

        const tiltFactor = 0.5; // How much velocity translates to tilt
        this.tilt.x = THREE.MathUtils.clamp(localVelocityZ * tiltFactor, -this.MAX_TILT, this.MAX_TILT);
        this.tilt.z = THREE.MathUtils.clamp(-localVelocityX * tiltFactor, -this.MAX_TILT, this.MAX_TILT); // Note the negation for Z tilt

        // No direct key presses for 'r' (reset) in autonomous mode
    }
    
    /**
     * Move drone toward a formation position
     * @param {Object} targetPosition - Target position to move toward
     * @param {number} targetRotation - Target rotation in degrees
     * @param {number} delta - Time delta since last frame
     */
    moveToFormationPosition(targetPosition, targetRotation, delta) {
        this.inFormation = true;
        
        // Gradually move toward the target position
        const moveSpeed = this.FORMATION_FOLLOW_SPEED * delta;
        
        // Calculate direction vector to target
        const dirX = targetPosition.x - this.position.x;
        const dirY = targetPosition.y - this.position.y;
        const dirZ = targetPosition.z - this.position.z;
        
        // Calculate distance to target
        const distance = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
        
        if (distance > 0.1) {
            // Normalize direction and apply movement
            this.position.x += (dirX / distance) * moveSpeed * distance;
            this.position.y += (dirY / distance) * moveSpeed * distance;
            this.position.z += (dirZ / distance) * moveSpeed * distance;
            
            // Update velocity based on movement
            this.velocity.x = (dirX / distance) * moveSpeed * distance;
            this.velocity.y = (dirY / distance) * moveSpeed * distance;
            this.velocity.z = (dirZ / distance) * moveSpeed * distance;
        } else {
            // Close enough to target, slow down
            this.velocity.x *= 0.8;
            this.velocity.y *= 0.8;
            this.velocity.z *= 0.8;
        }
        
        // Gradually rotate toward target rotation
        const rotDiff = targetRotation - this.rotation;
        const normalizedRotDiff = ((rotDiff + 180) % 360) - 180; // Normalize to -180 to 180
        
        if (Math.abs(normalizedRotDiff) > 0.5) {
            this.rotation += normalizedRotDiff * 0.1;
            // Normalize rotation to 0-360
            this.rotation = (this.rotation + 360) % 360;
        }
        
        // Gradually reduce tilt
        this.tilt.x *= 0.9;
        this.tilt.z *= 0.9;
        
        // Update altitude
        this.altitude = this.position.y;
    }
    
    /**
     * Exit formation mode
     */
    exitFormation() {
        this.inFormation = false;
    }

    /**
     * Check for collision with environmental objects
     * @param {Array<THREE.Object3D>} collidableObjects - Array of objects to check against
     * @param {THREE.Box3} droneBoundingBox - The drone's bounding box
     */
    checkCollision(collidableObjects, droneBoundingBox) {
        if (this.crashed) return; // Don't check collisions if already crashed

        for (const object of collidableObjects) {
            const objectBoundingBox = new THREE.Box3().setFromObject(object);
            if (droneBoundingBox.intersectsBox(objectBoundingBox)) {
                this.crashed = true;
                this.velocity.x = 0; // Stop horizontal movement
                this.velocity.z = 0;
                // Potentially add a small bounce effect or sound later
                console.log("Drone crashed!");
                break;
            }
        }
    }
}

// DroneRenderer - Handles 3D model creation and rendering
class DroneRenderer {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.object = null;
        this.bodyColor = options.color || 0x333333;
        this.armColor = options.armColor || 0x555555;
        this.rotorColor = options.rotorColor || 0x888888;
        this.mountColor = options.mountColor || 0x222222;
        this.showLabel = options.showLabel !== undefined ? options.showLabel : true;
        this.labelText = options.name || "Drone";
        this.labelColor = options.labelColor || 0xffffff;
        this.isActive = false; // Whether this drone is the active one
        
        this._createDroneModel();
        this._createLabel();
    }
    
    /**
     * Create the 3D drone model with custom colors
     * @private
     */
    _createDroneModel() {
        // Create drone body
        const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.bodyColor });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        
        // Create drone arms
        const armGeometry = new THREE.BoxGeometry(0.25, 0.25, 1.5);
        const armMaterial = new THREE.MeshStandardMaterial({ color: this.armColor });
        
        const armFR = new THREE.Mesh(armGeometry, armMaterial);
        armFR.position.set(0.75, 0, -0.75);
        armFR.castShadow = true;
        
        const armFL = new THREE.Mesh(armGeometry, armMaterial);
        armFL.position.set(-0.75, 0, -0.75);
        armFL.castShadow = true;
        
        const armBR = new THREE.Mesh(armGeometry, armMaterial);
        armBR.position.set(0.75, 0, 0.75);
        armBR.castShadow = true;
        
        const armBL = new THREE.Mesh(armGeometry, armMaterial);
        armBL.position.set(-0.75, 0, 0.75);
        armBL.castShadow = true;
        
        // Create rotors
        const rotorGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
        const rotorMaterial = new THREE.MeshStandardMaterial({ color: this.rotorColor });
        
        const rotorFR = new THREE.Mesh(rotorGeometry, rotorMaterial);
        rotorFR.position.set(1.25, 0.05, -1.25);
        rotorFR.castShadow = true;
        
        const rotorFL = new THREE.Mesh(rotorGeometry, rotorMaterial);
        rotorFL.position.set(-1.25, 0.05, -1.25);
        rotorFL.castShadow = true;
        
        const rotorBR = new THREE.Mesh(rotorGeometry, rotorMaterial);
        rotorBR.position.set(1.25, 0.05, 1.25);
        rotorBR.castShadow = true;
        
        const rotorBL = new THREE.Mesh(rotorGeometry, rotorMaterial);
        rotorBL.position.set(-1.25, 0.05, 1.25);
        rotorBL.castShadow = true;
        
        // Create camera mount
        const cameraMountGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.5);
        const cameraMountMaterial = new THREE.MeshStandardMaterial({ color: this.mountColor });
        const cameraMount = new THREE.Mesh(cameraMountGeometry, cameraMountMaterial);
        cameraMount.position.set(0, -0.25, -1);
        cameraMount.castShadow = true;
        
        // Create active indicator (visible when drone is active)
        const indicatorGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const indicatorMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.7 
        });
        this.activeIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        this.activeIndicator.position.set(0, 1.2, 0);
        this.activeIndicator.visible = false;
        
        // Assemble drone
        this.object = new THREE.Group();
        this.object.add(body);
        this.object.add(armFR);
        this.object.add(armFL);
        this.object.add(armBR);
        this.object.add(armBL);
        this.object.add(rotorFR);
        this.object.add(rotorFL);
        this.object.add(rotorBR);
        this.object.add(rotorBL);
        this.object.add(cameraMount);
        this.object.add(this.activeIndicator);
        
        this.object.receiveShadow = true;
        this.object.castShadow = true;
        this.scene.add(this.object);
    }
    
    /**
     * Create a text label for the drone
     * @private
     */
    _createLabel() {
        if (!this.showLabel) return;
        
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw background
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.font = '24px Arial';
        context.fillStyle = `#${this.labelColor.toString(16)}`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.labelText, canvas.width / 2, canvas.height / 2);
        
        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        
        this.labelSprite = new THREE.Sprite(material);
        this.labelSprite.position.set(0, 2, 0);
        this.labelSprite.scale.set(4, 1, 1);
        
        this.object.add(this.labelSprite);
    }
    
    /**
     * Update the drone 3D model based on physics state
     * @param {Object} physicsState - Current physics state of the drone
     */
    update(physicsState) {
        // Update position
        this.object.position.x = physicsState.position.x;
        this.object.position.y = physicsState.position.y;
        this.object.position.z = physicsState.position.z;
        
        // Reset rotation and set order
        this.object.rotation.set(0, 0, 0);
        this.object.rotation.order = 'YXZ';
        
        // Apply rotations
        this.object.rotation.y = THREE.MathUtils.degToRad(physicsState.rotation);
        this.object.rotation.x = THREE.MathUtils.degToRad(physicsState.tilt.x);
        this.object.rotation.z = THREE.MathUtils.degToRad(physicsState.tilt.z);
    }
    
    /**
     * Set whether this drone is the active one
     * @param {boolean} isActive - Whether this drone is active
     */
    setActive(isActive) {
        this.isActive = isActive;
        if (this.activeIndicator) {
            this.activeIndicator.visible = isActive;
        }
    }
    
    /**
     * Remove the drone from the scene
     */
    removeFromScene() {
        if (this.object && this.scene) {
            this.scene.remove(this.object);
        }
    }
}

// CameraController - Handles camera positioning relative to the drone
class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.camDistance = 30;
        this.camHeight = 10;
    }
    
    /**
     * Update camera position to follow the drone
     * @param {Object} dronePosition - Current position of the drone
     * @param {number} droneRotation - Current rotation of the drone in degrees
     */
    update(dronePosition, droneRotation) {
        const droneRotRad = THREE.MathUtils.degToRad(droneRotation);
        
        this.camera.position.x = dronePosition.x - Math.sin(droneRotRad) * this.camDistance;
        this.camera.position.y = dronePosition.y + this.camHeight;
        this.camera.position.z = dronePosition.z - Math.cos(droneRotRad) * this.camDistance;
        
        this.camera.lookAt(
            dronePosition.x,
            dronePosition.y,
            dronePosition.z
        );
    }
}

// DashboardUpdater - Handles updating the UI elements
class DashboardUpdater {
    constructor() {
        this.altitudeElement = document.getElementById('altitude');
        this.rotationElement = document.getElementById('rotation');
        this.tiltElement = document.getElementById('tilt');
        this.speedElement = document.getElementById('speed');
        this.droneNameElement = document.getElementById('droneName');
    }
    
    /**
     * Update the dashboard with current flight data
     * @param {Object} data - Current flight data
     */
    update(data) {
        this.altitudeElement.textContent = data.altitude.toFixed(1);
        this.rotationElement.textContent = data.rotation.toFixed(1);
        this.tiltElement.textContent = data.tiltMagnitude.toFixed(1);
        this.speedElement.textContent = data.speed.toFixed(1);
    }
    
    /**
     * Update the drone name displayed in the dashboard
     * @param {string} name - Name of the active drone
     */
    updateDroneName(name) {
        if (this.droneNameElement) {
            this.droneNameElement.textContent = name;
        }
    }
}

// Main Drone class that composes the components
class Drone {
    constructor(scene, camera, options = {}, navigationGrid = null) {
        const initialPosition = options.position || { x: 0, y: 10, z: 0 };
        
        this.physics = new DronePhysics(initialPosition);
        this.renderer = new DroneRenderer(scene, options);
        this.cameraController = new CameraController(camera);
        this.dashboard = new DashboardUpdater();
        this.isFlying = false;
        this.name = options.name || "Drone";
        this.collidableObjects = options.collidableObjects || [];

        // Drone bounding box for collision detection
        this.droneBoundingBox = new THREE.Box3();

        // Autonomous navigation properties
        this.navigationGrid = navigationGrid; // Store the navigation grid
        this.isAutonomous = false;
        this.waypoints = []; // Array of THREE.Vector3
        this.currentWaypointIndex = -1;
        this.currentPath = null; // Array of THREE.Vector3 from Pathfinder
        this.currentTargetPathNodeIndex = -1;
        this.autonomousSpeedFactor = 0.8; // Can be used to modulate speed in autonomous mode
        this.pathVisualization = null; // For THREE.Line visual of the path
        this.sceneRef = scene; // Keep a reference to the scene for path visualization
    }
    
    /**
     * Start flying the drone
     */
    startFlying() {
        this.isFlying = true;
    }
    
    /**
     * Apply physics and update visuals based on current inputs
     * @param {number} delta - Time delta since last frame
     * @param {Object} keys - Object containing the state of keyboard keys
     */
    update(delta, keys) {
        if (!this.isFlying) return;

        if (this.isAutonomous) {
            this._updateAutonomousMovement(delta);
        } else {
            // Manual control physics update
            this.physics.update(delta, keys, this.isFlying, null);
        }
        
        // Common updates for both modes (bounding box, renderer, active drone camera/dashboard)
        if (this.renderer.object) {
            this.droneBoundingBox.setFromObject(this.renderer.object);
        }
        if (this.collidableObjects && this.collidableObjects.length > 0 && !this.physics.crashed) {
            this.physics.checkCollision(this.collidableObjects, this.droneBoundingBox);
        }
        this.renderer.update(this.physics);
        
        if (this.renderer.isActive) {
            this.cameraController.update(
                this.physics.position,
                this.physics.rotation
            );
            this.updateDashboard();
        }
    }
    
    /**
     * Update the dashboard with this drone's data
     */
    updateDashboard() {
        this.dashboard.update({
            altitude: this.physics.altitude,
            rotation: this.physics.rotation,
            tiltMagnitude: this.physics.getTiltMagnitude(),
            speed: this.physics.getSpeed()
        });
        
        this.dashboard.updateDroneName(this.name);
    }
    
    /**
     * Set whether this drone is active (currently controlled)
     * @param {boolean} isActive - Whether this drone is active
     */
    setActive(isActive) {
        this.renderer.setActive(isActive);
    }
    
    /**
     * Follow a formation position (for formation mode)
     * @param {Object} targetPosition - Target position to follow
     * @param {number} targetRotation - Target rotation in degrees
     * @param {number} delta - Time delta since last frame
     */
    followFormationPosition(targetPosition, targetRotation, delta) {
        if (!this.isFlying) return;
        
        // Move toward formation position
        this.physics.moveToFormationPosition(targetPosition, targetRotation, delta);
        
        // Update 3D model
        this.renderer.update(this.physics);
    }
    
    /**
     * Exit formation mode
     */
    exitFormation() {
        this.physics.exitFormation();
    }

    // --- Autonomous Navigation Methods ---

    /**
     * Sets the waypoints for autonomous navigation.
     * @param {Array<THREE.Vector3>} waypointsArray - An array of THREE.Vector3 points.
     */
    setWaypoints(waypointsArray) {
        this.waypoints = waypointsArray.map(wp => wp.clone()); // Store clones
        this.currentWaypointIndex = 0;
        this.currentPath = null;
        this.currentTargetPathNodeIndex = -1;
        this.clearPathVisualization();
        console.log(`Drone '${this.name}' waypoints set:`, this.waypoints);

        if (this.isAutonomous && this.waypoints.length > 0) {
            this._calculatePathToCurrentWaypoint();
        }
    }

    /**
     * Toggles the autonomous navigation mode.
     */
    toggleAutonomousMode() {
        this.isAutonomous = !this.isAutonomous;
        console.log(`Drone '${this.name}' autonomous mode: ${this.isAutonomous ? 'ON' : 'OFF'}`);
        if (this.isAutonomous) {
            this.physics.exitFormation(); // Ensure not in formation mode if switching to autonomous
            if (this.waypoints.length > 0 && this.currentWaypointIndex < this.waypoints.length && !this.currentPath) {
                this._calculatePathToCurrentWaypoint();
            }
        } else {
            this.currentPath = null; // Stop following path if mode is turned off
            this.currentTargetPathNodeIndex = -1;
            this.clearPathVisualization();
            // Optionally, reset drone to hover or some neutral state if needed
            // this.physics.velocity = { x: 0, y: 0, z: 0 }; 
        }
    }

    _calculatePathToCurrentWaypoint() {
        if (!this.navigationGrid || this.currentWaypointIndex < 0 || this.currentWaypointIndex >= this.waypoints.length) {
            console.log("Cannot calculate path: No navGrid, or invalid waypoint index.");
            this.currentPath = null;
            this.currentTargetPathNodeIndex = -1;
            return;
        }

        const startPos = new THREE.Vector3(this.physics.position.x, this.physics.position.y, this.physics.position.z);
        const endPos = this.waypoints[this.currentWaypointIndex];

        console.log(`Drone '${this.name}': Calculating path from`, startPos, `to waypoint ${this.currentWaypointIndex}:`, endPos);
        this.currentPath = Pathfinder.findPath(this.navigationGrid, startPos, endPos);
        this.clearPathVisualization();

        if (this.currentPath && this.currentPath.length > 0) {
            this.currentTargetPathNodeIndex = 0;
            console.log(`Drone '${this.name}': Path found with ${this.currentPath.length} nodes.`);
            this.visualizePath(this.currentPath);
        } else {
            console.warn(`Drone '${this.name}': No path found to waypoint ${this.currentWaypointIndex}.`);
            this.currentPath = null;
            this.currentTargetPathNodeIndex = -1;
            // Consider next waypoint or stopping autonomous mode
            // For now, it will just retry on the next autonomous update if stuck.
        }
    }

    _updateAutonomousMovement(delta) {
        if (!this.waypoints || this.waypoints.length === 0 || this.currentWaypointIndex < 0 || this.currentWaypointIndex >= this.waypoints.length) {
            // No waypoints or finished all waypoints
            if (this.isAutonomous && this.waypoints.length > 0 && this.currentWaypointIndex >= this.waypoints.length) {
                 console.log(`Drone '${this.name}': All waypoints reached.`);
                 this.isAutonomous = false; // Turn off autonomous mode
                 this.clearPathVisualization();
            }
            this.physics.update(delta, {}, this.isFlying, null); // Hover or default physics
            return;
        }

        if (!this.currentPath || this.currentTargetPathNodeIndex < 0) {
            this._calculatePathToCurrentWaypoint();
            if (!this.currentPath) { // Still no path after trying
                this.physics.update(delta, {}, this.isFlying, null); // Hover
                return;
            }
        }
        
        const targetPathNode = this.currentPath[this.currentTargetPathNodeIndex];
        this.physics.update(delta, {}, this.isFlying, targetPathNode); // Steer towards target node

        // Check if target path node is reached
        const currentPosVec = new THREE.Vector3(this.physics.position.x, this.physics.position.y, this.physics.position.z);
        const distanceToNode = currentPosVec.distanceTo(targetPathNode);

        if (distanceToNode < this.physics.autonomousTargetReachedThreshold) {
            this.currentTargetPathNodeIndex++;
            if (this.currentTargetPathNodeIndex >= this.currentPath.length) {
                // Reached the end of the current path (i.e., arrived at current waypoint)
                console.log(`Drone '${this.name}': Reached waypoint ${this.currentWaypointIndex}`);
                this.currentWaypointIndex++;
                this.currentPath = null; // Force recalculation for the next waypoint
                this.currentTargetPathNodeIndex = -1;
                this.clearPathVisualization();

                if (this.currentWaypointIndex >= this.waypoints.length) {
                    console.log(`Drone '${this.name}': All waypoints completed.`);
                    this.isAutonomous = false; // Turn off autonomous after last waypoint
                }
            }
        }
    }

    visualizePath(path) {
        this.clearPathVisualization();
        if (!path || path.length < 2 || !this.sceneRef) return;

        const material = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 }); // Magenta path
        const points = path.map(p => new THREE.Vector3(p.x, p.y + 0.2, p.z)); // lift path slightly for visibility
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.pathVisualization = new THREE.Line(geometry, material);
        this.sceneRef.add(this.pathVisualization);
    }

    clearPathVisualization() {
        if (this.pathVisualization && this.sceneRef) {
            this.sceneRef.remove(this.pathVisualization);
            this.pathVisualization.geometry.dispose();
            this.pathVisualization.material.dispose();
            this.pathVisualization = null;
        }
    }
}

// Export the Drone class for use in main.js
const DroneModule = {
    create: function(scene, camera, options = {}, navigationGrid = null) {
        return new Drone(scene, camera, options, navigationGrid);
    }
}; 