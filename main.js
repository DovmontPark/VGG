'use strict';

let gl;                 // Контекст WebGL.
let surface;            // Модель поверхности.
let shProgram;          // Шейдерная программа.
let spaceball;          // Объект SimpleRotator для вращения вида с помощью мыши.

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

class Model {
    constructor(name) {
        this.name = name;
        this.iVertexBuffer = gl.createBuffer();
        this.iNormalBuffer = gl.createBuffer();
        this.count = 0;
    }

    bufferData(vertices, normals) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    draw() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}

class ShaderProgram {
    constructor(name, program) {
        this.name = name;
        this.prog = program;
        this.iAttribVertex = -1;
        this.iAttribNormal = -1;
        this.iColor = -1;
        this.iModelViewProjectionMatrix = -1;
        this.iNormalMatrix = -1;
        this.iLDir = -1;
        this.iLPos = -1;
        this.iLimit = -1;
        this.iEasing = -1;
    }

    use() {
        gl.useProgram(this.prog);
    }
}

function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI / 8, 1, 8, 20);
    let modelView = spaceball.getViewMatrix();
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.0);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    let modelViewProjection = m4.multiply(projection, matAccum1);
    const normal = m4.identity();
    m4.inverse(modelView, normal);
    m4.transpose(normal, normal);

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normal);
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);
    let dx = parseFloat(document.getElementById('dx').value);
    let dy = parseFloat(document.getElementById('dy').value);
    let dz = parseFloat(document.getElementById('dz').value);
    let px = parseFloat(document.getElementById('px').value);
    let py = parseFloat(document.getElementById('py').value);
    let pz = parseFloat(document.getElementById('pz').value);

    gl.uniform3fv(shProgram.iLDir, [dx, dy, dz]);
    gl.uniform3fv(shProgram.iLPos, [px, py, pz]);
    gl.uniform1f(shProgram.iLimit, parseFloat(document.getElementById('lim').value));
    gl.uniform1f(shProgram.iEasing, parseFloat(document.getElementById('ease').value));

    surface.draw();
}

function drawe() {
    draw();
    window.requestAnimationFrame(drawe);
}

function createSurfaceData() {
    let vertexList = [];
    let normalList = [];
    let step = 0.03;
    let derivStep = 0.0001;
    let a = 1;
    let r = 1;
    let theta = 0;

    let getVert = (u, v) => {
        let x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v);
        let y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v);
        let z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta);
        return [x, y, z];
    };

    let getAvgNorm = (u, v) => {
        let v0 = getVert(u, v);
        let v1 = getVert(u + step, v);
        let v2 = getVert(u, v + step);
        let v3 = getVert(u - step, v + step);
        let v4 = getVert(u - step, v);
        let v5 = getVert(u - step, v - step);
        let v6 = getVert(u, v - step);
        let v01 = m4.subtractVectors(v1, v0);
        let v02 = m4.subtractVectors(v2, v0);
        let v03 = m4.subtractVectors(v3, v0);
        let v04 = m4.subtractVectors(v4, v0);
        let v05 = m4.subtractVectors(v5, v0);
        let v06 = m4.subtractVectors(v6, v0);
        let n1 = m4.normalize(m4.cross(v01, v02));
        let n2 = m4.normalize(m4.cross(v02, v03));
        let n3 = m4.normalize(m4.cross(v03, v04));
        let n4 = m4.normalize(m4.cross(v04, v05));
        let n5 = m4.normalize(m4.cross(v05, v06));
        let n6 = m4.normalize(m4.cross(v06, v01));
        let n = [
            (n1[0] + n2[0] + n3[0] + n4[0] + n5[0] + n6[0]) / 6.0,
            (n1[1] + n2[1] + n3[1] + n4[1] + n5[1] + n6[1]) / 6.0,
            (n1[2] + n2[2] + n3[2] + n4[2] + n5[2] + n6[2]) / 6.0
        ];
        n = m4.normalize(n);
        return n;
    };

    for (let u = -Math.PI; u <= Math.PI; u += step) {
        for (let v = 0; v <= 2 * Math.PI; v += step) {
            let x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v);
            let y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v);
            let z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta);
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u, v));
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta);
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u + step, v));
            x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v + step);
            y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v + step);
            z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta);
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u, v + step));
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u, v + step));
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta);
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u + step, v));
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v + step);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v + step);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta);
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u + step, v + step));
        }
    }
    return [vertexList, normalList];
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram('Basic', prog);
    shProgram.use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iLDir = gl.getUniformLocation(prog, "lDir");
    shProgram.iLPos = gl.getUniformLocation(prog, "lPos");
    shProgram.iLimit = gl.getUniformLocation(prog, "lim");
    shProgram.iEasing = gl.getUniformLocation(prog, "eas");

    surface = new Model('Surface');
    surface.bufferData(createSurfaceData()[0], createSurfaceData()[1]);

    gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);

    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader: " + gl.getShaderInfoLog(vsh));
    }

    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);

    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader: " + gl.getShaderInfoLog(fsh));
    }

    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program: " + gl.getProgramInfoLog(prog));
    }

    return prog;
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Браузер не поддерживает WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Извините, не удалось получить контекст графики WebGL.</p>";
        return;
    }

    try {
        initGL();  // Инициализация контекста графики WebGL.
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Извините, не удалось инициализировать контекст графики WebGL: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    drawe();
}