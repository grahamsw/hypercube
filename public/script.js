const canvas = document.getElementById('hypercube');
const sizeSlider = document.getElementById('size-slider');
const depthSlider = document.getElementById('depth-slider');
const colorToggle = document.getElementById('color-toggle');
const stereoToggle = document.getElementById('stereo-toggle');
const autoToggle = document.getElementById('auto-toggle');
const shapeSelect = document.getElementById('shape-select');
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

let autoRotate = autoToggle.checked;
autoToggle.addEventListener('change', (e) => {
    autoRotate = e.target.checked;
});

// Shape Geometries
const shapes = {
    tesseract: {
        vertices: (() => {
            const v = [];
            for (let i = 0; i < 16; i++) {
                v.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
            }
            return v;
        })(),
        edges: (() => {
            const e = [];
            for (let i = 0; i < 16; i++) {
                for (let j = i + 1; j < 16; j++) {
                    let diff = 0;
                    for (let k = 0; k < 4; k++) {
                        let vi = (i >> k) & 1, vj = (j >> k) & 1;
                        if (vi !== vj) diff++;
                    }
                    if (diff === 1) e.push([i, j]);
                }
            }
            return e;
        })(),
        cells: [
            { name: "x-min", color: "rgba(255, 100, 100, 0.15)", fixed: [0, -1] },
            { name: "x-max", color: "rgba(100, 255, 100, 0.15)", fixed: [0, 1] },
            { name: "y-min", color: "rgba(100, 100, 255, 0.15)", fixed: [1, -1] },
            { name: "y-max", color: "rgba(255, 255, 100, 0.15)", fixed: [1, 1] },
            { name: "z-min", color: "rgba(100, 255, 255, 0.15)", fixed: [2, -1] },
            { name: "z-max", color: "rgba(255, 100, 255, 0.15)", fixed: [2, 1] },
            { name: "w-min", color: "rgba(255, 180, 100, 0.15)", fixed: [3, -1] },
            { name: "w-max", color: "rgba(100, 255, 180, 0.15)", fixed: [3, 1] }
        ],
        getFaces: () => {
            const f = [];
            for (let d1 = 0; dim1 < 4; dim1++) { // Fix: d1 instead of dim1
                // ... (refactoring below for clarity)
            }
        }
    }
};

// Refactored face generation for Tesseract
function getTesseractFaces() {
    const f = [];
    for (let dim1 = 0; dim1 < 4; dim1++) {
        for (let dim2 = dim1 + 1; dim2 < 4; dim2++) {
            for (let val1 of [-1, 1]) {
                for (let val2 of [-1, 1]) {
                    const faceVertices = [];
                    const otherDims = [0, 1, 2, 3].filter(d => d !== dim1 && d !== dim2);
                    const variations = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
                    for (let v of variations) {
                        let vert = [0, 0, 0, 0];
                        vert[dim1] = val1; vert[dim2] = val2;
                        vert[otherDims[0]] = v[0]; vert[otherDims[1]] = v[1];
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

// 5-Cell (Pentachoron)
const pentachoronVertices = [
    [1, 1, 1, -1 / Math.sqrt(5)],
    [1, -1, -1, -1 / Math.sqrt(5)],
    [-1, 1, -1, -1 / Math.sqrt(5)],
    [-1, -1, 1, -1 / Math.sqrt(5)],
    [0, 0, 0, Math.sqrt(5) - 1 / Math.sqrt(5)]
];
const pentachoronEdges = [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]];
const pentachoronCells = [
    { vertices: [1, 2, 3, 4], color: "rgba(255, 100, 100, 0.2)" },
    { vertices: [0, 2, 3, 4], color: "rgba(100, 255, 100, 0.2)" },
    { vertices: [0, 1, 3, 4], color: "rgba(100, 100, 255, 0.2)" },
    { vertices: [0, 1, 2, 4], color: "rgba(255, 255, 100, 0.2)" },
    { vertices: [0, 1, 2, 3], color: "rgba(255, 100, 255, 0.2)" }
];

// 16-Cell (Orthoplex)
const orthoplexVertices = [
    [1, 0, 0, 0], [-1, 0, 0, 0], [0, 1, 0, 0], [0, -1, 0, 0],
    [0, 0, 1, 0], [0, 0, -1, 0], [0, 0, 0, 1], [0, 0, 0, -1]
];
const orthoplexEdges = [];
for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
        if (!(i % 2 === 0 && j === i + 1)) orthoplexEdges.push([i, j]);
    }
}
// 16-cell has 16 tetrahedral cells. Each uses 4 vertices, no two being opposites.
function getOrthoplexCells() {
    const c = [];
    const colors = ["#f66", "#6f6", "#66f", "#ff6", "#f6f", "#6ff", "#f96", "#9f6", "#69f", "#96f", "#f69", "#6f9", "#ccc", "#999", "#666", "#333"];
    let colorIdx = 0;
    for (let i = 0; i < 2; i++) {
        for (let j = 2; j < 4; j++) {
            for (let k = 4; k < 6; k++) {
                for (let l = 6; l < 8; l++) {
                    c.push({ vertices: [i, j, k, l], color: hexToRgba(colors[colorIdx++], 0.15) });
                }
            }
        }
    }
    return c;
}
const orthoplexCells = getOrthoplexCells();

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 2), 16) * 17;
    const g = parseInt(hex.slice(2, 3), 16) * 17;
    const b = parseInt(hex.slice(3, 4), 16) * 17;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

let currentShape = 'tesseract';
shapeSelect.addEventListener('change', (e) => {
    currentShape = e.target.value;
});

// Rotation angles: XY, XZ, XW, YZ, YW, ZW
let angles = [0, 0, 0, 0, 0, 0];

// Mouse / Touch interaction
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', () => { isDragging = false; });

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        let deltaX = e.clientX - previousMousePosition.x;
        let deltaY = e.clientY - previousMousePosition.y;
        const speed = 0.005;
        if (e.shiftKey) { angles[2] += deltaX * speed; angles[4] += deltaY * speed; }
        else if (e.altKey) { angles[1] += deltaX * speed; angles[5] += deltaY * speed; }
        else { angles[0] += deltaX * speed; angles[3] += deltaY * speed; }
        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
    isDragging = true;
    const touch = e.touches[0];
    previousMousePosition = { x: touch.clientX, y: touch.clientY };
    e.preventDefault();
}, { passive: false });

window.addEventListener('touchend', () => { isDragging = false; });

window.addEventListener('touchmove', (e) => {
    if (isDragging) {
        const touch = e.touches[0];
        let deltaX = touch.clientX - previousMousePosition.x;
        let deltaY = touch.clientY - previousMousePosition.y;
        const speed = 0.005;
        const num = e.touches.length;
        if (num === 2) { angles[2] += deltaX * speed; angles[4] += deltaY * speed; }
        else if (num >= 3) { angles[1] += deltaX * speed; angles[5] += deltaY * speed; }
        else { angles[0] += deltaX * speed; angles[3] += deltaY * speed; }
        previousMousePosition = { x: touch.clientX, y: touch.clientY };
        e.preventDefault();
    }
}, { passive: false });

function applyRotations(v, angles) {
    let [x, y, z, w] = v;
    let t1, t2;
    const [xy, xz, xw, yz, yw, zw] = angles;
    t1 = x * Math.cos(xy) - y * Math.sin(xy); t2 = x * Math.sin(xy) + y * Math.cos(xy); x = t1; y = t2;
    t1 = x * Math.cos(xz) - z * Math.sin(xz); t2 = x * Math.sin(xz) + z * Math.cos(xz); x = t1; z = t2;
    t1 = x * Math.cos(xw) - w * Math.sin(xw); t2 = x * Math.sin(xw) + w * Math.cos(xw); x = t1; w = t2;
    t1 = y * Math.cos(yz) - z * Math.sin(yz); t2 = y * Math.sin(yz) + z * Math.cos(yz); y = t1; z = t2;
    t1 = y * Math.cos(yw) - w * Math.sin(yw); t2 = y * Math.sin(yw) + w * Math.cos(yw); y = t1; w = t2;
    t1 = z * Math.cos(zw) - w * Math.sin(zw); t2 = z * Math.sin(zw) + w * Math.cos(zw); z = t1; w = t2;
    return [x, y, z, w];
}

function project(v, angles, offset = 0) {
    let [x, y, z, w] = applyRotations(v, angles);
    x += offset;
    const d4 = perspectiveDepth; const wf = 1 / (d4 - w);
    let x3 = x * wf, y3 = y * wf, z3 = z * wf;
    const d3 = perspectiveDepth; const zf = 1 / (d3 - z3);
    let x2 = x3 * zf, y2 = y3 * zf;
    const base = (Math.min(width, height) / 4) * scaleFactor * (perspectiveDepth * perspectiveDepth / 8);
    return { px: x2 * base + width / 2, py: y2 * base + height / 2, z3, w };
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    if (autoRotate && !isDragging) { angles[2] += 0.002; angles[5] += 0.003; }
    if (showStereo) {
        renderScene(-0.05, "rgba(255, 0, 0, 0.7)");
        ctx.globalCompositeOperation = "screen";
        renderScene(0.05, "rgba(0, 255, 255, 0.7)");
        ctx.globalCompositeOperation = "source-over";
    } else {
        renderScene(0, "rgba(0, 255, 255, 1.0)");
    }
    requestAnimationFrame(draw);
}

function renderScene(offset, edgeColor) {
    let verts, edges_list, cell_list;
    if (currentShape === 'tesseract') {
        verts = shapes.tesseract.vertices;
        edges_list = shapes.tesseract.edges;
        cell_list = shapes.tesseract.cells;
    } else if (currentShape === 'pentachoron') {
        verts = pentachoronVertices;
        edges_list = pentachoronEdges;
        cell_list = pentachoronCells;
    } else if (currentShape === 'orthoplex') {
        verts = orthoplexVertices;
        edges_list = orthoplexEdges;
        cell_list = orthoplexCells;
    }

    const projected = verts.map(v => project(v, angles, offset));

    if (showColor && offset === 0) {
        const sortedCells = cell_list.map(c => {
            let avg = 0;
            if (currentShape === 'tesseract') {
                let count = 0;
                for (let i = 0; i < 16; i++) {
                    if (verts[i][c.fixed[0]] === c.fixed[1]) { avg += projected[i].z3; count++; }
                }
                avg /= count;
            } else {
                c.vertices.forEach(vIdx => avg += projected[vIdx].z3);
                avg /= c.vertices.length;
            }
            return { ...c, avg };
        }).sort((a, b) => a.avg - b.avg);

        sortedCells.forEach(cell => {
            ctx.fillStyle = cell.color;
            if (currentShape === 'tesseract') {
                tesseractFaces.forEach(face => {
                    if (face.vertices.every(vIdx => verts[vIdx][cell.fixed[0]] === cell.fixed[1])) {
                        ctx.beginPath();
                        ctx.moveTo(projected[face.vertices[0]].px, projected[face.vertices[0]].py);
                        for (let i = 1; i < 4; i++) ctx.lineTo(projected[face.vertices[i]].px, projected[face.vertices[i]].py);
                        ctx.closePath(); ctx.fill();
                    }
                });
            } else {
                // For Pentachoron and Orthoplex, cells are tetrahedra. Faces are triangles.
                const v = cell.vertices;
                const triFaces = [[v[0], v[1], v[2]], [v[0], v[1], v[3]], [v[0], v[2], v[3]], [v[1], v[2], v[3]]];
                triFaces.forEach(f => {
                    ctx.beginPath(); ctx.moveTo(projected[f[0]].px, projected[f[0]].py);
                    ctx.lineTo(projected[f[1]].px, projected[f[1]].py);
                    ctx.lineTo(projected[f[2]].px, projected[f[2]].py);
                    ctx.closePath(); ctx.fill();
                });
            }
        });
    }

    edges_list.forEach(e => {
        const p1 = projected[e[0]], p2 = projected[e[1]];
        ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py);
        let alpha = Math.max(0.3, Math.min(1.0, ((p1.w + p2.w) / 2 + 2.5) / 4));
        ctx.strokeStyle = showStereo ? edgeColor : `rgba(0, 255, 255, ${alpha})`;
        ctx.lineWidth = Math.max(0.8, 2.5 * alpha); ctx.stroke();
    });
}

draw();
