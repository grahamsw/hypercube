const canvas = document.getElementById('hypercube');
const sizeSlider = document.getElementById('size-slider');
const depthSlider = document.getElementById('depth-slider');
const colorToggle = document.getElementById('color-toggle');
const stereoToggle = document.getElementById('stereo-toggle');
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

let perspectiveDepth = 6.5 - parseFloat(depthSlider.value);
depthSlider.addEventListener('input', (e) => {
    perspectiveDepth = 6.5 - parseFloat(e.target.value);
});

let showColor = colorToggle.checked;
colorToggle.addEventListener('change', (e) => {
    showColor = e.target.checked;
    if (showColor) {
        showStereo = false;
        stereoToggle.checked = false;
    }
});

let showStereo = stereoToggle.checked;
stereoToggle.addEventListener('change', (e) => {
    showStereo = e.target.checked;
    if (showStereo) {
        showColor = false;
        colorToggle.checked = false;
    }
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

// 8 Cells (Cubes) of a Tesseract, each defined by a fixed coordinate
const cells = [
    { name: "x-min", color: "rgba(255, 100, 100, 0.15)", fixed: [0, -1] },
    { name: "x-max", color: "rgba(100, 255, 100, 0.15)", fixed: [0, 1] },
    { name: "y-min", color: "rgba(100, 100, 255, 0.15)", fixed: [1, -1] },
    { name: "y-max", color: "rgba(255, 255, 100, 0.15)", fixed: [1, 1] },
    { name: "z-min", color: "rgba(100, 255, 255, 0.15)", fixed: [2, -1] },
    { name: "z-max", color: "rgba(255, 100, 255, 0.15)", fixed: [2, 1] },
    { name: "w-min", color: "rgba(255, 180, 100, 0.15)", fixed: [3, -1] },
    { name: "w-max", color: "rgba(100, 255, 180, 0.15)", fixed: [3, 1] }
];

// Generate the 24 unique faces of the Tesseract
function getTesseractFaces() {
    const f = [];
    // Each face is defined by fixing TWO coordinates
    for (let dim1 = 0; dim1 < 4; dim1++) {
        for (let dim2 = dim1 + 1; dim2 < 4; dim2++) {
            for (let val1 of [-1, 1]) {
                for (let val2 of [-1, 1]) {
                    const faceVertices = [];
                    const otherDims = [0, 1, 2, 3].filter(d => d !== dim1 && d !== dim2);
                    const variations = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
                    for (let v of variations) {
                        let vert = [0, 0, 0, 0];
                        vert[dim1] = val1;
                        vert[dim2] = val2;
                        vert[otherDims[0]] = v[0];
                        vert[otherDims[1]] = v[1];
                        let idx = 0;
                        if (vert[0] === 1) idx |= 1;
                        if (vert[1] === 1) idx |= 2;
                        if (vert[2] === 1) idx |= 4;
                        if (vert[3] === 1) idx |= 8;
                        faceVertices.push(idx);
                    }
                    f.push({ vertices: faceVertices, fixed: [[dim1, val1], [dim2, val2]] });
                }
            }
        }
    }
    return f;
}
const tesseractFaces = getTesseractFaces();

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
            angles[2] += deltaX * rotationSpeed; // XW
            angles[4] += deltaY * rotationSpeed; // YW
        } else if (e.altKey) {
            angles[1] += deltaX * rotationSpeed; // XZ
            angles[5] += deltaY * rotationSpeed; // ZW
        } else {
            angles[0] += deltaX * rotationSpeed; // XY
            angles[3] += deltaY * rotationSpeed; // YZ
        }

        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
    isDragging = true;
    const touch = e.touches[0];
    previousMousePosition = { x: touch.clientX, y: touch.clientY };
    // Prevent scrolling while interacting
    e.preventDefault();
}, { passive: false });

window.addEventListener('touchend', () => {
    isDragging = false;
});

window.addEventListener('touchmove', (e) => {
    if (isDragging) {
        const touch = e.touches[0];
        let deltaX = touch.clientX - previousMousePosition.x;
        let deltaY = touch.clientY - previousMousePosition.y;
        
        const rotationSpeed = 0.005;
        const numTouches = e.touches.length;

        if (numTouches === 2) {
            // 2 fingers = Shift (XW/YW)
            angles[2] += deltaX * rotationSpeed;
            angles[4] += deltaY * rotationSpeed;
        } else if (numTouches >= 3) {
            // 3+ fingers = Alt (XZ/ZW)
            angles[1] += deltaX * rotationSpeed;
            angles[5] += deltaY * rotationSpeed;
        } else {
            // 1 finger = Normal (XY/YZ)
            angles[0] += deltaX * rotationSpeed;
            angles[3] += deltaY * rotationSpeed;
        }

        previousMousePosition = { x: touch.clientX, y: touch.clientY };
        e.preventDefault();
    }
}, { passive: false });

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

function project(v, angles, offset = 0) {
    let [x, y, z, w] = applyRotations(v, angles);
    
    // Add horizontal offset for stereoscopic view
    x += offset;

    const distance4D = perspectiveDepth; 
    const w_factor = 1 / (distance4D - w);
    let x3 = x * w_factor, y3 = y * w_factor, z3 = z * w_factor;

    const distance3D = perspectiveDepth;
    const z_factor = 1 / (distance3D - z3);
    let x2 = x3 * z_factor, y2 = y3 * z_factor;

    const baseScale = (Math.min(width, height) / 4) * scaleFactor * (perspectiveDepth * perspectiveDepth / 8);
    let px = x2 * baseScale + width / 2;
    let py = y2 * baseScale + height / 2;
    
    return { px, py, z3, w, z_factor, w_factor };
}

function draw() {
    ctx.clearRect(0, 0, width, height);

    if (!isDragging) {
        angles[2] += 0.002;
        angles[5] += 0.003;
    }

    if (showStereo) {
        // Render Red (Left Eye)
        renderScene(-0.05, "rgba(255, 0, 0, 0.7)");
        // Render Cyan/Green (Right Eye)
        ctx.globalCompositeOperation = "screen";
        renderScene(0.05, "rgba(0, 255, 255, 0.7)");
        ctx.globalCompositeOperation = "source-over";
    } else {
        renderScene(0, "rgba(0, 255, 255, 1.0)");
    }

    requestAnimationFrame(draw);
}

function renderScene(offset, edgeColor) {
    const projectedVertices = [];
    for (let i = 0; i < vertices.length; i++) {
        projectedVertices.push(project(vertices[i], angles, offset));
    }

    if (showColor && offset === 0) {
        // Sort cells by average depth (Painter's algorithm)
        const sortedCells = cells.map((cell) => {
            let avgDepth = 0;
            let count = 0;
            for (let i = 0; i < 16; i++) {
                if (vertices[i][cell.fixed[0]] === cell.fixed[1]) {
                    avgDepth += projectedVertices[i].z3;
                    count++;
                }
            }
            return { ...cell, avgDepth: avgDepth / count };
        }).sort((a, b) => a.avgDepth - b.avgDepth);

        sortedCells.forEach(cell => {
            ctx.fillStyle = cell.color;
            tesseractFaces.forEach(face => {
                const isFaceInCell = face.vertices.every(vIdx => {
                    return vertices[vIdx][cell.fixed[0]] === cell.fixed[1];
                });

                if (isFaceInCell) {
                    ctx.beginPath();
                    ctx.moveTo(projectedVertices[face.vertices[0]].px, projectedVertices[face.vertices[0]].py);
                    for (let i = 1; i < 4; i++) {
                        ctx.lineTo(projectedVertices[face.vertices[i]].px, projectedVertices[face.vertices[i]].py);
                    }
                    ctx.closePath();
                    ctx.fill();
                }
            });
        });
    }

    // Draw edges
    for (let i = 0; i < edges.length; i++) {
        let p1 = projectedVertices[edges[i][0]];
        let p2 = projectedVertices[edges[i][1]];

        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        
        let avgW = (p1.w + p2.w) / 2;
        let alpha = (avgW + 2.5) / 4;
        alpha = Math.max(0.3, Math.min(1.0, alpha));
        
        ctx.strokeStyle = showStereo ? edgeColor : `rgba(0, 255, 255, ${alpha})`;
        ctx.lineWidth = Math.max(0.8, 2.5 * alpha);
        ctx.stroke();
    }
}

draw();
