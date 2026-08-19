const textContainer = document.getElementById("textContainer");
let easeFactor = 0.02;
let scene, camera, renderer, planeMesh;
let mousePosition = { x: 0.5, y: 0.5 };
let targetMousePosition = { x: 0.5, y: 0.5 };
let prevPosition = { x: 0.5, y: 0.5 };
let clock;
let isMouseOver = false;

let revealProgress = 0.0;
const REVEAL_DURATION = 1.8;

let mouseVelocity = { x: 0, y: 0 };
let smoothVelocity = { x: 0, y: 0 };
let resizeTimer = null;

const cursor = document.createElement("div");
cursor.id = "customCursor";
document.body.appendChild(cursor);

let cursorPos = { x: -100, y: -100 };
let cursorTarget = { x: -100, y: -100 };

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform sampler2D u_texture;
  uniform vec2  u_mouse;
  uniform vec2  u_prevMouse;
  uniform float u_time;
  uniform vec2  u_velocity;      // smoothed mouse velocity
  uniform float u_reveal;        // 0 → 1 reveal progress

  void main() {
    float gridSize = 60.0;
    vec2 gridUV        = floor(vUv * vec2(gridSize)) / vec2(gridSize);
    vec2 centerOfPixel = gridUV + vec2(1.0 / gridSize);

    vec2  mouseDirection = u_mouse - u_prevMouse;
    float speed          = length(u_velocity);

    vec2  pixelToMouse = centerOfPixel - u_mouse;
    float dist         = length(pixelToMouse);

    // Ripple wave radiating from cursor
    float ripple   = sin(dist * 30.0 - u_time * 6.0) * 0.5 + 0.5;
    float strength = smoothstep(0.35, 0.0, dist) * (1.0 + ripple * 0.4);

    // ── Velocity-based directional stretch ──────────────────────────────────
    // Project pixel offset onto velocity direction → stretch along movement axis
    float velLen = length(u_velocity) + 0.0001;
    vec2  velDir = u_velocity / velLen;
    float along  = dot(pixelToMouse, velDir);          // signed projection
    float stretch = along * strength * clamp(speed * 8.0, 0.0, 1.2);
    vec2 stretchOffset = velDir * stretch * 0.18;

    // Main distortion
    vec2 uvOffset = strength * -mouseDirection * 0.35 + stretchOffset;

    // Idle floating wave
    float idleWave = sin(vUv.x * 8.0 + u_time * 1.2)
                   * cos(vUv.y * 6.0 + u_time * 0.9) * 0.003;
    uvOffset += vec2(idleWave, idleWave * 0.6);

    // ── Reveal animation ────────────────────────────────────────────────────
    // At reveal=0 the whole texture is heavily distorted; settles to 0 at reveal=1
    float revealDistort = (1.0 - u_reveal) * 0.12;
    float revealWave    = sin(vUv.x * 12.0 - u_time * 4.0)
                        * cos(vUv.y * 10.0 + u_time * 3.0);
    uvOffset += vec2(revealWave * revealDistort, revealWave * revealDistort * 0.7);

    vec2 uv    = vUv - uvOffset;
    vec4 color = texture2D(u_texture, uv);

    // Fade in during reveal
    color.a *= u_reveal;

    gl_FragColor = color;
  }
`;

function createSVGTexture(svgUrl) {
    return new Promise((resolve) => {
        const canvasWidth = window.innerWidth * 2;
        const canvasHeight = window.innerHeight * 2;

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const img = new Image();
        img.onload = () => {
            const padding = 0.10;
            const maxW = canvasWidth * (1 - padding * 2);
            const maxH = canvasHeight * (1 - padding * 2);
            const scale = Math.min(maxW / img.width, maxH / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const x = (canvasWidth - drawW) / 2;
            const y = (canvasHeight - drawH) / 2;

            ctx.drawImage(img, x, y, drawW, drawH);
            URL.revokeObjectURL(img.src);

            const texture = new THREE.CanvasTexture(canvas);
            resolve(texture);
        };
        img.src = svgUrl;
    });
}

function initializeScene(texture) {
    scene = new THREE.Scene();
    clock = new THREE.Clock();

    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(
        -1, 1,
        1 / aspectRatio, -1 / aspectRatio,
        0.1, 1000
    );
    camera.position.z = 1;

    const shaderUniforms = {
        u_mouse: { type: "v2", value: new THREE.Vector2(0.5, 0.5) },
        u_prevMouse: { type: "v2", value: new THREE.Vector2(0.5, 0.5) },
        u_texture: { type: "t", value: texture },
        u_time: { type: "f", value: 0.0 },
        u_velocity: { type: "v2", value: new THREE.Vector2(0.0, 0.0) },
        u_reveal: { type: "f", value: 0.0 },
    };

    planeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
            uniforms: shaderUniforms,
            vertexShader,
            fragmentShader,
            transparent: true,
        })
    );

    scene.add(planeMesh);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x000000, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Cap pixel ratio at 2 for performance
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    textContainer.appendChild(renderer.domElement);
}

const SVG_URL = `./kurae_small_white_footer.svg?v=${Date.now()}`;

function reloadTexture() {
    createSVGTexture(SVG_URL).then((texture) => {
        planeMesh.material.uniforms.u_texture.value = texture;
    });
}

createSVGTexture(SVG_URL).then((texture) => {
    initializeScene(texture);
    animateScene();
});
function animateScene() {
    requestAnimationFrame(animateScene);

    const elapsed = clock.getElapsedTime();
    if (revealProgress < 1.0) {
        revealProgress = Math.min(1.0, elapsed / REVEAL_DURATION);
        const eased = 1 - Math.pow(1 - revealProgress, 3);
        planeMesh.material.uniforms.u_reveal.value = eased;
    }

    mousePosition.x += (targetMousePosition.x - mousePosition.x) * easeFactor;
    mousePosition.y += (targetMousePosition.y - mousePosition.y) * easeFactor;

    mouseVelocity.x = targetMousePosition.x - prevPosition.x;
    mouseVelocity.y = targetMousePosition.y - prevPosition.y;

    const velEase = 0.08;
    smoothVelocity.x += (mouseVelocity.x - smoothVelocity.x) * velEase;
    smoothVelocity.y += (mouseVelocity.y - smoothVelocity.y) * velEase;

    planeMesh.material.uniforms.u_mouse.value.set(
        mousePosition.x, 1.0 - mousePosition.y
    );
    planeMesh.material.uniforms.u_prevMouse.value.set(
        prevPosition.x, 1.0 - prevPosition.y
    );
    planeMesh.material.uniforms.u_velocity.value.set(
        smoothVelocity.x, -smoothVelocity.y
    );
    planeMesh.material.uniforms.u_time.value = elapsed;

    cursorPos.x += (cursorTarget.x - cursorPos.x) * 0.12;
    cursorPos.y += (cursorTarget.y - cursorPos.y) * 0.12;
    cursor.style.transform = `translate(${cursorPos.x}px, ${cursorPos.y}px)`;

    renderer.render(scene, camera);
}

function getRelativePos(clientX, clientY) {
    const rect = textContainer.getBoundingClientRect();
    return {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
    };
}

function handleMouseMove(event) {
    easeFactor = 0.05;
    prevPosition = { ...targetMousePosition };
    const pos = getRelativePos(event.clientX, event.clientY);
    targetMousePosition.x = pos.x;
    targetMousePosition.y = pos.y;
    cursorTarget.x = event.clientX;
    cursorTarget.y = event.clientY;
}

function handleMouseEnter(event) {
    easeFactor = 0.02;
    isMouseOver = true;
    cursor.classList.add("active");
    const pos = getRelativePos(event.clientX, event.clientY);
    mousePosition.x = targetMousePosition.x = pos.x;
    mousePosition.y = targetMousePosition.y = pos.y;
}

function handleMouseLeave() {
    easeFactor = 0.02;
    isMouseOver = false;
    cursor.classList.remove("active");
    targetMousePosition = { ...prevPosition };
}

textContainer.addEventListener("mousemove", handleMouseMove);
textContainer.addEventListener("mouseenter", handleMouseEnter);
textContainer.addEventListener("mouseleave", handleMouseLeave);

// ─── Touch events ─────────────────────────────────────────────────────────────
function handleTouchMove(event) {
    event.preventDefault();
    easeFactor = 0.05;
    const touch = event.touches[0];
    prevPosition = { ...targetMousePosition };
    const pos = getRelativePos(touch.clientX, touch.clientY);
    targetMousePosition.x = pos.x;
    targetMousePosition.y = pos.y;
}

function handleTouchStart(event) {
    easeFactor = 0.02;
    const touch = event.touches[0];
    const pos = getRelativePos(touch.clientX, touch.clientY);
    mousePosition.x = targetMousePosition.x = pos.x;
    mousePosition.y = targetMousePosition.y = pos.y;
}

function handleTouchEnd() {
    easeFactor = 0.02;
    targetMousePosition = { ...prevPosition };
}

textContainer.addEventListener("touchmove", handleTouchMove, { passive: false });
textContainer.addEventListener("touchstart", handleTouchStart, { passive: true });
textContainer.addEventListener("touchend", handleTouchEnd);

// ─── Resize (debounced) ───────────────────────────────────────────────────────
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onWindowResize, 150);
});

function onWindowResize() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera.left = -1;
    camera.right = 1;
    camera.top = 1 / aspectRatio;
    camera.bottom = -1 / aspectRatio;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    reloadTexture();
}
