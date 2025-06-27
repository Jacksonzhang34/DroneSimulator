/**
 * Controls module for the Drone Simulator
 * Handles keyboard input for controlling the drone
 */

const Controls = {
    // Key states
    keys: {
        w: false, a: false, s: false, d: false,
        ArrowUp: false, ArrowDown: false, 
        Space: false, ShiftLeft: false, ShiftRight: false,
        q: false, e: false, r: false
    },
    
    /**
     * Initialize the keyboard controls
     */
    init: function() {
        // Set up keyboard controls
        window.addEventListener('keydown', (event) => {
            if (this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = true;
            }
        });
        
        window.addEventListener('keyup', (event) => {
            if (this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = false;
            }
        });
    },
    
    /**
     * Get the current state of the keys
     * @returns {Object} - The current key states
     */
    getKeyStates: function() {
        return this.keys;
    }
}; 