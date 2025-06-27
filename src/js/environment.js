/**
 * Environment module for the Drone Simulator
 * Handles creation of buildings, trees, ground, and other environmental elements
 */

// Export functions for use in other modules
const Environment = {
    scene: null,
    ground: null,
    collidableObjects: [],
    worldWidth: 0,
    worldDepth: 0,
    
    /**
     * Initialize the environment with a reference to the scene
     * @param {THREE.Scene} sceneRef - Reference to the Three.js scene
     */
    init: function(sceneRef) {
        this.scene = sceneRef;
        this.createGround();
        this.createBuildings();
        this.createTrees();
    },
    
    /**
     * Create the ground plane
     */
    createGround: function() {
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
        this.worldWidth = 1000;
        this.worldDepth = 1000;
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x3A9D23,
            side: THREE.DoubleSide,
            wireframe: false,
            roughness: 0.8
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = Math.PI / 2;
        this.ground.position.y = 0; // GROUND_LEVEL
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    },
    
    /**
     * Create buildings across the environment
     */
    createBuildings: function() {
        // Create some buildings
        for (let i = 0; i < 30; i++) {
            const height = Math.random() * 30 + 5;
            const width = Math.random() * 15 + 5;
            const depth = Math.random() * 15 + 5;
            
            const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
            const buildingMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(
                    0.5 + Math.random() * 0.5,
                    0.5 + Math.random() * 0.5,
                    0.5 + Math.random() * 0.5
                ),
                roughness: 0.7
            });
            
            const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
            
            // Random position, avoiding center area
            let x, z;
            do {
                x = Math.random() * 400 - 200;
                z = Math.random() * 400 - 200;
            } while (Math.abs(x) < 30 && Math.abs(z) < 30);
            
            building.position.set(x, height / 2, z);
            building.castShadow = true;
            building.receiveShadow = true;
            this.scene.add(building);
            this.collidableObjects.push(building);
        }
    },
    
    /**
     * Create trees across the environment
     */
    createTrees: function() {
        // Create some trees
        for (let i = 0; i < 50; i++) {
            const trunkHeight = Math.random() * 3 + 2;
            const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, trunkHeight, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            
            const leavesSize = Math.random() * 2 + 3;
            const leavesGeometry = new THREE.ConeGeometry(leavesSize, leavesSize * 2, 8);
            const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57 });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            
            leaves.position.y = trunkHeight / 2 + leavesSize;
            
            const tree = new THREE.Group();
            tree.add(trunk);
            tree.add(leaves);
            
            let x, z;
            do {
                x = Math.random() * 300 - 150;
                z = Math.random() * 300 - 150;
            } while (Math.abs(x) < 20 && Math.abs(z) < 20);
            
            tree.position.set(x, 0, z);
            tree.castShadow = true;
            tree.receiveShadow = true;
            this.scene.add(tree);
            this.collidableObjects.push(tree);
        }
    },

    /**
     * Get all collidable objects in the environment
     * @returns {Array<THREE.Object3D>} - Array of collidable meshes
     */
    getCollidableObjects: function() {
        return this.collidableObjects;
    },

    getWorldWidth: function() {
        return this.worldWidth;
    },
    getWorldDepth: function() {
        return this.worldDepth;
    }
}; 