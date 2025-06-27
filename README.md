# 3D Drone Flight Simulator

A web-based 3D drone flight simulator using Three.js. Fly a drone with realistic physics in a 3D environment with buildings and trees.

## Features

- Realistic drone physics with gravity, lift, and drag
- Smooth flight controls with keyboard input
- 3D environment with buildings and trees
- Dynamic camera that follows the drone
- Real-time flight data dashboard
- Start menu with instructions

## Controls

- **W/S**: Forward/Backward movement
- **A/D**: Left/Right movement
- **Arrow Up/Space**: Ascend
- **Arrow Down/Shift**: Descend
- **Q/E**: Rotate Left/Right
- **R**: Reset Position

## Project Structure

```
/DroneSimulator
  index.html            - Main HTML file
  /src
    /css
      styles.css        - CSS styles for the simulator
    /js
      main.js           - Main application logic
      drone.js          - Drone creation and physics
      environment.js    - Environment creation (buildings, trees)
      controls.js       - User input handling
```

## Technologies Used

- **HTML5**: Structure and layout
- **CSS3**: Styling and layout
- **JavaScript**: Core programming language
- **Three.js**: 3D graphics library

## How to Run

Simply open `index.html` in a modern web browser. No build process or server is required.

## Performance Considerations

The simulator is designed to run smoothly on most modern computers. If you experience performance issues, you can:

1. Reduce the number of environmental objects by modifying the constants in `environment.js`
2. Lower the resolution of the renderer in `main.js`
3. Simplify the drone model in `drone.js` 