/**
 * WaypointNavigator class
 * Manages a sequence of waypoints and uses Pathfinder to generate a continuous path.
 */
class WaypointNavigator {
    /**
     * @param {Pathfinder} pathfinder - An instance of the Pathfinder class.
     * @param {NavigationGrid} navGrid - The navigation grid instance.
     */
    constructor(pathfinder, navGrid) {
        this.pathfinder = pathfinder;
        this.navGrid = navGrid;
    }

    /**
     * Generates a complete path by navigating through a sequence of waypoints.
     * @param {THREE.Vector3} startPos - The initial starting position of the drone.
     * @param {Array<THREE.Vector3>} waypoints - An array of THREE.Vector3 waypoints to visit.
     * @param {number} droneSafetyMargin - Minimum vertical distance to keep above obstacles.
     * @param {number} altitudeChangePenalty - Factor to penalize changing altitude.
     * @returns {Array<THREE.Vector3>|null} A continuous path (array of THREE.Vector3 points) or null if any segment is unnavigable.
     */
    generatePathThroughWaypoints(startPos, waypoints, droneSafetyMargin = 1.0, altitudeChangePenalty = 1.5) {
        if (!waypoints || waypoints.length === 0) {
            console.log("WaypointNavigator: No waypoints provided.");
            return [startPos]; // Or null, depending on desired behavior for no waypoints
        }

        const fullPath = [];
        let currentPosition = startPos;

        // Add the initial starting position to the path.
        // Note: Pathfinder.findPath returns a path including its own start point.
        // We will need to handle potential duplicates when concatenating.
        fullPath.push(currentPosition.clone()); 

        for (let i = 0; i < waypoints.length; i++) {
            const nextWaypoint = waypoints[i];
            console.log(`WaypointNavigator: Planning path from`, currentPosition, `to waypoint ${i+1}`, nextWaypoint);

            const segmentPath = this.pathfinder.findPath(
                this.navGrid,
                currentPosition,
                nextWaypoint,
                droneSafetyMargin,
                altitudeChangePenalty
            );

            if (!segmentPath) {
                console.error(`WaypointNavigator: Failed to find path from`, currentPosition, `to waypoint`, nextWaypoint);
                return null; // Or handle error differently (e.g., try to skip waypoint)
            }

            // Concatenate the segment path, avoiding duplicate points
            // The first point of segmentPath is currentPosition, which is already in fullPath or was the end of the previous segment.
            fullPath.push(...segmentPath.slice(1)); 
            
            currentPosition = nextWaypoint.clone(); // More accurately, should be the last point of segmentPath
            // If segmentPath is not null, its last point is indeed related to nextWaypoint
            if (segmentPath.length > 0) {
                currentPosition = segmentPath[segmentPath.length - 1].clone();
            }
        }
        
        console.log("WaypointNavigator: Full path generated:", fullPath);
        return fullPath;
    }
}

// Example Usage (assuming Pathfinder and NavigationGrid are already defined and instantiated):
// const navGrid = new NavigationGrid(...);
// const pathfinder = Pathfinder; // Pathfinder is an object with static-like methods
// const waypointNavigator = new WaypointNavigator(pathfinder, navGrid);
//
// const startPosition = new THREE.Vector3(0, 10, 0);
// const missionWaypoints = [
//   new THREE.Vector3(50, 15, 50),
//   new THREE.Vector3(100, 10, 0),
//   new THREE.Vector3(50, 20, -50)
// ];
//
// const dronePath = waypointNavigator.generatePathThroughWaypoints(startPosition, missionWaypoints, 2.0, 1.2);
// if (dronePath) {
//   console.log("Full drone path:", dronePath);
//   // Next: Feed this dronePath to the drone for execution.
// } else {
//   console.log("Failed to generate full drone path.");
// } 