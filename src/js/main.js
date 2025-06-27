/**
 * Main module for the 3D Drone Flight Simulator
 * Initializes and runs the simulation
 */

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", function() {
    // Scene variables
    let scene, camera, renderer;
    let droneManager;
    let navigationGrid;
    
    // Initialize Three.js scene
    function init() {
        // Create scene
        scene = new THREE.Scene();
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.set(0, 10, 30);
        camera.lookAt(0, 0, 0);
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x87CEEB);
        renderer.shadowMap.enabled = true;
        
        // Add renderer to DOM
        document.getElementById('canvas').appendChild(renderer.domElement);
        
        // Create lights
        setupLights();
        
        // Initialize environment
        Environment.init(scene);
        
        // Initialize drone manager
        const collidableObjects = Environment.getCollidableObjects();
        
        // Define NavigationGrid parameters
        const navGridWorldWidth = Environment.getWorldWidth();
        const navGridWorldDepth = Environment.getWorldDepth();
        const NAV_GRID_CELL_SIZE = 5; // Define cell size for the navigation grid

        navigationGrid = new NavigationGrid(navGridWorldWidth, navGridWorldDepth, NAV_GRID_CELL_SIZE, 0 /* groundLevel */);
        navigationGrid.populateFromObjects(collidableObjects);
        // navigationGrid.visualize(scene); // User moved this, let's ensure it's called after droneManager if that's the intent or place it here if preferred before.

        // Instantiate Pathfinder and WaypointNavigator
        const pathfinder = Pathfinder; // Assuming Pathfinder is accessible globally or as a module import
        const waypointNavigator = new WaypointNavigator(pathfinder, navigationGrid);

        // Pass waypointNavigator to DroneManagerModule
        // Note: The actual static create method for DroneManagerModule might be in a different file or an alias.
        // Assuming DroneManagerModule.create is the correct entry point based on previous code.
        droneManager = DroneManagerModule.create(scene, camera, collidableObjects, navigationGrid, waypointNavigator);
        
        navigationGrid.visualize(scene); // Visualize the navigation grid (user placed it after droneManager creation)

        // Create initial drones with different colors
        droneManager.addDrone({
            position: { x: 0, y: 10, z: 0 },
            color: 0x3366ff,
            name: "Leader Drone"
        });
        
        droneManager.addDrone({
            position: { x: -5, y: 10, z: -5 },
            color: 0xff3366,
            name: "Follower 1"
        });
        
        droneManager.addDrone({
            position: { x: 5, y: 10, z: -5 },
            color: 0x33ff66,
            name: "Follower 2"
        });
        
        // Initialize controls
        Controls.init();
        
        // Enhance Controls with additional keybindings for drone manager
        enhanceControls();
        
        // Set up window resize handler
        window.addEventListener('resize', onWindowResize);
        
        // Start button
        document.getElementById('startButton').addEventListener('click', function() {
            document.getElementById('message').style.display = 'none';
            droneManager.startAllDrones();
            
            // Show the formation controls info
            showFormationControls();
        });
        
        // Start animation loop
        animate();
    }
    
    /**
     * Enhance controls with additional keybindings for drone management
     */
    function enhanceControls() {
        // Add the number keys (1-9) to the Controls module
        for (let i = 1; i <= 9; i++) {
            Controls.keys[`${i}`] = false;
        }
        
        // Add formation mode toggle keys
        Controls.keys.f = false; // Toggle formation mode
        Controls.keys.p = false; // Change formation pattern
        Controls.keys.n = false; // Added: Key for toggling autonomous nav test
    }
    
    /**
     * Show formation controls info in the UI
     */
    function showFormationControls() {
        const controls = document.getElementById('controls');
        if (controls) {
            controls.innerHTML += `
                <h3>Formation Controls:</h3>
                <p><span class="key">1-3</span> Select Drone</p>
                <p><span class="key">F</span> Toggle Formation Mode</p>
                <p><span class="key">P</span> Change Formation Pattern</p>
            `;
        }
    }
    
    /**
     * Set up scene lighting
     */
    function setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
    }
    
    /**
     * Handle window resize
     */
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Animation loop
     */
    function animate() {
        requestAnimationFrame(animate);
        
        // Apply physics with deltaTime for consistent movement
        const delta = Math.min(0.1, clock.getDelta()); // Cap delta to avoid jumps
        
        // Get key states from Controls module
        const keys = Controls.getKeyStates();
        
        // --- Test Autonomous Toggle (using 'N' key) ---
        if (keys.n && !lastNKeyState) { // Check if 'N' is pressed and wasn't pressed last frame
            const activeDrone = droneManager.getActiveDrone();
            if (activeDrone) {
                if (!activeDrone.isAutonomous) {
                    // Define some test waypoints if not already autonomous
                    const testWaypoints = [
                        new THREE.Vector3(50, 20, 50),
                        new THREE.Vector3(-50, 15, 50),
                        new THREE.Vector3(-50, 25, -50),
                        new THREE.Vector3(50, 10, -50),
                        new THREE.Vector3(0, 20, 0) // Back to near start
                    ];
                    activeDrone.setWaypoints(testWaypoints);
                    activeDrone.toggleAutonomousMode(); // This will also trigger path calculation
                } else {
                    activeDrone.toggleAutonomousMode(); // Just toggle off if already on
                }
            }
        }
        lastNKeyState = keys.n; // Update lastNKeyState
        // --- End Test Autonomous Toggle ---

        // Update drone manager
        droneManager.update(delta, keys);
        
        // Render scene
        renderer.render(scene, camera);
    }
    
    // Clock for timing
    const clock = new THREE.Clock();
    let lastNKeyState = false; // Added: To track 'N' key state for single press detection
    
    // Initialize the scene
    init();
}); 