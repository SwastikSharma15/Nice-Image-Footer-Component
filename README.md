# Three.js Text Animation - Kura Footer

An interactive, WebGL-powered image distortion effect built with [Three.js](https://threejs.org/). This project features a custom shader that creates dynamic ripple, stretch, and floating wave animations reacting to mouse and touch movements.

<!-- ADD YOUR GIF PREVIEW BELOW -->
![Animation Preview](./preview.gif)

## Features

- **Custom WebGL Shaders**: Uses custom vertex and fragment shaders for high-performance image manipulation.
- **Interactive Mouse/Touch Effects**: 
  - **Ripple Wave**: Radiates from the cursor.
  - **Directional Stretch**: Stretches the image along the axis of mouse movement based on velocity.
  - **Floating Wave**: An idle, continuous ambient wave effect.
- **Custom Cursor**: A sleek, lagging custom cursor to enhance the interactive experience.
- **Reveal Animation**: Smooth ease-out reveal sequence when the page loads.
- **Responsive Design**: Automatically handles window resizing and scales the SVG accordingly.

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)
- [Three.js](https://threejs.org/) (v0.155.0)

## Getting Started

1. Clone or download this repository.
2. Since this project loads an external SVG file (`kurae_small_white_footer.svg`) into a canvas texture, you must serve it via a local web server to avoid CORS issues. You cannot simply open the `index.html` file directly in a browser (e.g., using `file://` protocol).

### Running a Local Server

You can use any local server of your choice. Some popular options:

**Using VS Code:**
- Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.
- Right-click `index.html` and select **Open with Live Server**.

**Using Node.js (http-server):**
```bash
npx http-server
```

**Using Python:**
```bash
# Python 3
python -m http.server 8000
```

3. Navigate to the local server URL (e.g., `http://localhost:8000`) in your web browser.

## Project Structure

- `index.html`: The main entry point. Includes the Three.js library and links to styles and scripts.
- `style.css`: Contains the basic layout, font setup, and styling for the custom cursor.
- `script.js`: The core logic. Handles scene setup, shader compilation, mouse/touch event tracking, and the animation loop.
- `kurae_small_white_footer.svg`: The image asset used in the demo.
