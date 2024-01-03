'use strict';

let gl;
let surface;
let shaderProgram;
let spaceball;

function degreesToRadians(angle) {
    return angle * Math.PI / 180;
}

class Model {
    constructor(name) {
        this.name = name;
        this.vertexBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();
        this.count = 0;
    }

    bufferData(vertices, normals) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    draw() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexAttrib, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.vertexAttrib);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(shaderProgram.normalAttrib, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.normalAttrib);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}

class ShaderProgram {
    constructor(name, program) {
        this.name = name;
        this.program = program;
        this.vertexAttrib = -1;
        this.normalAttrib = -1;
        this.colorUniform = -1;
        this.modelViewProjectionMatrixUniform = -1;
        this.normalMatrixUniform = -1;
        this.lightDirectionUniform = -1;
        this.lightPositionUniform = -1;
        this.limitUniform = -1;
        this.easingUniform = -1;
    }

    use() {
        gl.useProgram(this.program);
    }
}

function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projectionMatrix = m4.perspective(Math.PI / 8, 1, 8, 20);
    let modelViewMatrix = spaceball.getViewMatrix();
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.0);
    let translateToPointZero = m4.translation(0, 0, -10);

    let modelViewMatrixAccumulated0 = m4.multiply(rotateToPointZero, modelViewMatrix);
    let modelViewMatrixAccumulated1 = m4.multiply(translateToPointZero, modelViewMatrixAccumulated0);

    let modelViewProjectionMatrix = m4.multiply(projectionMatrix, modelViewMatrixAccumulated1);
    const normalMatrix = m4.identity();
    m4.inverse(modelViewMatrix, normalMatrix);
    m4.transpose(normalMatrix, normalMatrix);

    gl.uniformMatrix4fv(shaderProgram.normalMatrixUniform, false, normalMatrix);
    gl.uniformMatrix4fv(shaderProgram.modelViewProjectionMatrixUniform, false, modelViewProjectionMatrix);

    gl.uniform4fv(shaderProgram.colorUniform, [1, 1, 0, 1]);
    let dx = parseFloat(document.getElementById('dx').value);
    let dy = parseFloat(document.getElementById('dy').value);
    let dz = parseFloat(document.getElementById('dz').value);
    let px = parseFloat(document.getElementById('px').value);
    let py = parseFloat(document.getElementById('py').value);
    let pz = parseFloat(document.getElementById('pz').value);

    gl.uniform3fv(shaderProgram.lightDirectionUniform, [dx, dy, dz]);
    gl.uniform3fv(shaderProgram.lightPositionUniform, [px, py, pz]);
    gl.uniform1f(shaderProgram.limitUniform, parseFloat(document.getElementById('lim').value));
    gl.uniform1f(shaderProgram.easingUniform, parseFloat(document.getElementById('ease').value));

    surface.draw();
}

function drawLoop() {
    draw();
    window.requestAnimationFrame(drawLoop);
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
    let program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shaderProgram = new ShaderProgram('Basic', program);
    shaderProgram.use();

    shaderProgram.vertexAttrib = gl.getAttribLocation(program, "vertex");
    shaderProgram.normalAttrib = gl.getAttribLocation(program, "normal");
    shaderProgram.modelViewProjectionMatrixUniform = gl.getUniformLocation(program, "ModelViewProjectionMatrix");
    shaderProgram.normalMatrixUniform = gl.getUniformLocation(program, "NormalMatrix");
    shaderProgram.colorUniform = gl.getUniformLocation(program, "color");
    shaderProgram.lightDirectionUniform = gl.getUniformLocation(program, "lDir");
    shaderProgram.lightPositionUniform = gl.getUniformLocation(program, "lPos");
    shaderProgram.limitUniform = gl.getUniformLocation(program, "lim");
    shaderProgram.easingUniform = gl.getUniformLocation(program, "eas");

    surface = new Model('Surface');
    surface.bufferData(createSurfaceData()[0], createSurfaceData()[1]);

    gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vertexShader, fragmentShader) {
    let vertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShaderObject, vertexShader);
    gl.compileShader(vertexShaderObject);

    if (!gl.getShaderParameter(vertexShaderObject, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader: " + gl.getShaderInfoLog(vertexShaderObject));
    }

    let fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShaderObject, fragmentShader);
    gl.compileShader(fragmentShaderObject);

    if (!gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader: " + gl.getShaderInfoLog(fragmentShaderObject));
    }

    let programObject = gl.createProgram();
    gl.attachShader(programObject, vertexShaderObject);
    gl.attachShader(programObject, fragmentShaderObject);
    gl.linkProgram(programObject);

    if (!gl.getProgramParameter(programObject, gl.LINK_STATUS)) {
        throw new Error("Link error in program: " + gl.getProgramInfoLog(programObject));
    }

    return programObject;
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "The browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, unable to get WebGL graphics context.</p>";
        return;
    }

    try {
        initGL();
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, failed to initialize WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    drawLoop();
}
