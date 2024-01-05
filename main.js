'use strict';

let webgl;
let object;
let program;
let orb;

function radiansToDegrees(angle) {
    return angle * 180 / Math.PI;
}

class Entity {
    constructor(identifier) {
        this.identifier = identifier;
        this.vertexBuffer = webgl.createBuffer();
        this.normalBuffer = webgl.createBuffer();
        this.count = 0;
    }

    loadBufferData(vertices, normals) {
        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.vertexBuffer);
        webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(vertices), webgl.STREAM_DRAW);

        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.normalBuffer);
        webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(normals), webgl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    render() {
        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.vertexBuffer);
        webgl.vertexAttribPointer(program.vertexAttrib, 3, webgl.FLOAT, false, 0, 0);
        webgl.enableVertexAttribArray(program.vertexAttrib);

        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.normalBuffer);
        webgl.vertexAttribPointer(program.normalAttrib, 3, webgl.FLOAT, true, 0, 0);
        webgl.enableVertexAttribArray(program.normalAttrib);

        webgl.drawArrays(webgl.TRIANGLES, 0, this.count);
    }
}

class ShaderProgram {
    constructor(identifier, programObject) {
        this.identifier = identifier;
        this.programObject = programObject;
        this.vertexAttrib = -1;
        this.normalAttrib = -1;
        this.colorUniform = -1;
        this.mvpMatrixUniform = -1;
        this.normalMatrixUniform = -1;
        this.lightDirUniform = -1;
        this.lightPosUniform = -1;
        this.limitUniform = -1;
        this.easingUniform = -1;
    }

    apply() {
        webgl.useProgram(this.programObject);
    }
}

function render() {
    webgl.clearColor(0, 0, 0, 1);
    webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);

    let projectionMatrix = m4.perspective(Math.PI / 8, 1, 8, 20);
    let modelViewMatrix = orb.getViewMatrix();
    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.0);
    let translateToPointZero = m4.translation(0, 0, -10);

    let modelViewMatrixAccumulated0 = m4.multiply(rotateToPointZero, modelViewMatrix);
    let modelViewMatrixAccumulated1 = m4.multiply(translateToPointZero, modelViewMatrixAccumulated0);

    let modelViewProjectionMatrix = m4.multiply(projectionMatrix, modelViewMatrixAccumulated1);
    const normalMatrix = m4.identity();
    m4.inverse(modelViewMatrix, normalMatrix);
    m4.transpose(normalMatrix, normalMatrix);

    webgl.uniformMatrix4fv(program.normalMatrixUniform, false, normalMatrix);
    webgl.uniformMatrix4fv(program.mvpMatrixUniform, false, modelViewProjectionMatrix);

    webgl.uniform4fv(program.colorUniform, [1, 1, 0, 1]);
    let dx = parseFloat(document.getElementById('dx').value);
    let dy = parseFloat(document.getElementById('dy').value);
    let dz = parseFloat(document.getElementById('dz').value);
    let px = parseFloat(document.getElementById('px').value);
    let py = parseFloat(document.getElementById('py').value);
    let pz = parseFloat(document.getElementById('pz').value);

    webgl.uniform3fv(program.lightDirUniform, [dx, dy, dz]);
    webgl.uniform3fv(program.lightPosUniform, [px, py, pz]);
    webgl.uniform1f(program.limitUniform, parseFloat(document.getElementById('lim').value));
    webgl.uniform1f(program.easingUniform, parseFloat(document.getElementById('ease').value));

    object.render();
}

function renderLoop() {
    render();
    window.requestAnimationFrame(renderLoop);
}

function generateObjectData() {
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
    let programObject = createProgram(webgl, vertexShaderSource, fragmentShaderSource);
    program = new ShaderProgram('Basic', programObject);
    program.apply();

    program.vertexAttrib = webgl.getAttribLocation(programObject, "vertex");
    program.normalAttrib = webgl.getAttribLocation(programObject, "normal");
    program.mvpMatrixUniform = webgl.getUniformLocation(programObject, "ModelViewProjectionMatrix");
    program.normalMatrixUniform = webgl.getUniformLocation(programObject, "NormalMatrix");
    program.colorUniform = webgl.getUniformLocation(programObject, "color");
    program.lightDirUniform = webgl.getUniformLocation(programObject, "lDir");
    program.lightPosUniform = webgl.getUniformLocation(programObject, "lPos");
    program.limitUniform = webgl.getUniformLocation(programObject, "lim");
    program.easingUniform = webgl.getUniformLocation(programObject, "eas");

    object = new Entity('Surface');
    object.loadBufferData(generateObjectData()[0], generateObjectData()[1]);

    webgl.enable(webgl.DEPTH_TEST);
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
        webgl = canvas.getContext("webgl");
        if (!webgl) {
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

    orb = new TrackballRotator(canvas, render, 0);
    renderLoop();
}
