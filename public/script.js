const canvas = document.getElementById('hypercube');
const sizeSlider = document.getElementById('size-slider');
const ctx = canvas.getContext('2d');

let width, height;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let scaleFactor = parseFloat(sizeSlider.value);
sizeSlider.addEventListener('input', (e) => {
    scaleFactor = parseFloat(e.target.value);
});

// 16 Vertices of a Tesseract
const vertices = [];
for (let i = 0; i < 16; i++) {
    let x = (i & 1) ? 1 : -1;
    let y = (i & 2) ? 1 : -1;
    let z = (i & 4) ? 1 : -1;
    let w = (i & 8) ? 1 : -1;
    vertices.push([x, y, z, w]);
}

// 32 Edges
const edges = [];
for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
        let diffCount = 0;
        if (vertices[i][0] !== vertices[j][0]) diffCount++;
        if (vertices[i][1] !== vertices[j][1]) diffCount++;
        if (vertices[i][2] !== vertices[j][2]) diffCount++;
        if (vertices[i][3] !== vertices[j][3]) diffCount++;
        if (diffCount === 1) {
            edges.push([i, j]);
        }
    }
}

// Rotation angles: XY, XZ, XW, YZ, YW, ZW
let angles = [0, 0, 0, 0, 0, 0];

// Mouse / Touch interaction
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        let deltaX = e.clientX - previousMousePosition.x;
        let deltaY = e.clientY - previousMousePosition.y;
        
        const rotationSpeed = 0.005;

        if (e.shiftKey) {
            // Shift + Drag = Rotate XW (left/right) and YW (up/down)
            angles[2] += deltaX * rotationSpeed; // XW
            angles[4] += deltaY * rotationSpeed; // YW
        } else if (e.altKey) {
            // Alt + Drag = Rotate XZ (left/right) and ZW (up/down)
            angles[1] += deltaX * rotationSpeed; // XZ
            angles[5] += deltaY * rotationSpeed; // ZW
        } else {
            // Normal Drag = Rotate XY (left/right) and YZ (up/down)
            angles[0] += deltaX * rotationSpeed; // XY
            angles[3] += deltaY * rotationSpeed; // YZ
        }

        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
});

function applyRotations(v, angles) {
    let [x, y, z, w] = v;
    let temp1, temp2;
    const [xy, xz, xw, yz, yw, zw] = angles;

    // XY Plane
    temp1 = x * Math.cos(xy) - y * Math.sin(xy);
    temp2 = x * Math.sin(xy) + y * Math.cos(xy);
    x = temp1; y = temp2;

    // XZ Plane
    temp1 = x * Math.cos(xz) - z * Math.sin(xz);
    temp2 = x * Math.sin(xz) + z * Math.cos(xz);
    x = temp1; z = temp2;

    // XW Plane
    temp1 = x * Math.cos(xw) - w * Math.sin(xw);
    temp2 = x * Math.sin(xw) + w * Math.cos(xw);
    x = temp1; w = temp2;

    // YZ Plane
    temp1 = y * Math.cos(yz) - z * Math.sin(yz);
    temp2 = y * Math.sin(yz) + z * Math.cos(yz);
    y = temp1; z = temp2;

    // YW Plane
    temp1 = y * Math.cos(yw) - w * Math.sin(yw);
    temp2 = y * Math.sin(yw) + w * Math.cos(yw);
    y = temp1; w = temp2;

    // ZW Plane
    temp1 = z * Math.cos(zw) - w * Math.sin(zw);
    temp2 = z * Math.sin(zw) + w * Math.cos(zw);
    z = temp1; w = temp2;

    return [x, y, z, w];
}

function draw() {
    ctx.clearRect(0, 0, width, height);

    // Auto-rotate if not interacting to keep it looking "alive"
    if (!isDragging) {
        angles[2] += 0.002; // Slowly rotate XW
        angles[5] += 0.003; // Slowly rotate ZW
    }

    const projectedVertices = [];

    // Scale down the 4D object space
    const baseScale = (Math.min(width, height) / 4) * scaleFactor;

    for (let i = 0; i < vertices.length; i++) {
        let v = applyRotations(vertices[i], angles);
        
        let x = v[0];
        let y = v[1];
        let z = v[2];
        let w = v[3];

        // 4D to 3D Stereographic Projection
        const distance4D = 2.8; 
        const w_factor = 1 / (distance4D - w);
        
        let x3 = x * w_factor;
        let y3 = y * w_factor;
        let z3 = z * w_factor;

        // 3D to 2D Perspective Projection
        const distance3D = 2.8;
        const z_factor = 1 / (distance3D - z3);
        
        let x2 = x3 * z_factor;
        let y2 = y3 * z_factor;

        // Convert to canvas coordinates
        let px = x2 * baseScale + width / 2;
        let py = y2 * baseScale + height / 2;
        
        projectedVertices.push({ px, py, z3, w });

        // Draw vertex
        ctx.beginPath();
        // Point size based on distance for 3D depth cue
        let radius = Math.max(1, 4 * z_factor * w_factor);
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        
        // Intensity based on W axis (4th dimension)
        let intensity = Math.floor(((w + 1) / 2) * 150 + 105);
        ctx.fillStyle = `rgb(${intensity}, ${intensity}, 255)`;
        ctx.fill();
    }

    // Draw edges
    for (let i = 0; i < edges.length; i++) {
        let p1 = projectedVertices[edges[i][0]];
        let p2 = projectedVertices[edges[i][1]];

        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        
        // Fade edges based on 4D distance (W) to simulate 4D depth
        let avgW = (p1.w + p2.w) / 2;
        let alpha = (avgW + 2.5) / 4; // Shifted range for better visibility
        alpha = Math.max(0.3, Math.min(1.0, alpha));
        
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
        ctx.lineWidth = Math.max(0.8, 2.5 * alpha);
        ctx.stroke();
    }

    requestAnimationFrame(draw);
}

// Start animation loop
draw();