'use strict';

let webglContext;
let geometry;
let program;
let controller;
let lightSource1, lightSource2;

const angleToRadians = angle => angle * Math.PI / 180;

class Figure {
    constructor(name) {
        this.name = name;
        this.vertexBuffer = webglContext.createBuffer();
        this.normalBuffer = webglContext.createBuffer();
        this.count = 0;
    }

    setData(vertices, normals) {
        webglContext.bindBuffer(webglContext.ARRAY_BUFFER, this.vertexBuffer);
        webglContext.bufferData(webglContext.ARRAY_BUFFER, new Float32Array(vertices), webglContext.STREAM_DRAW);
        webglContext.bindBuffer(webglContext.ARRAY_BUFFER, this.normalBuffer);
        webglContext.bufferData(webglContext.ARRAY_BUFFER, new Float32Array(normals), webglContext.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    draw() {
        webglContext.bindBuffer(webglContext.ARRAY_BUFFER, this.vertexBuffer);
        webglContext.vertexAttribPointer(program.attributeVertex, 3, webglContext.FLOAT, false, 0, 0);
        webglContext.enableVertexAttribArray(program.attributeVertex);

        webglContext.bindBuffer(webglContext.ARRAY_BUFFER, this.normalBuffer);
        webglContext.vertexAttribPointer(program.attributeNormal, 3, webglContext.FLOAT, true, 0, 0);
        webglContext.enableVertexAttribArray(program.attributeNormal);

        webglContext.drawArrays(webglContext.TRIANGLES, 0, this.count);
    }

    drawLight() {
        webglContext.bindBuffer(webglContext.ARRAY_BUFFER, this.vertexBuffer);
        webglContext.vertexAttribPointer(program.attributeVertex, 3, webglContext.FLOAT, false, 0, 0);
        webglContext.enableVertexAttribArray(program.attributeVertex);

        webglContext.bindBuffer(webglContext.ARRAY_BUFFER, this.normalBuffer);
        webglContext.vertexAttribPointer(program.attributeNormal, 3, webglContext.FLOAT, true, 0, 0);
        webglContext.enableVertexAttribArray(program.attributeNormal);

        webglContext.drawArrays(webglContext.LINE_STRIP, 0, this.count);
    }
}

class ShaderProgram {
    constructor(name, program) {
        this.name = name;
        this.programObject = program;
        this.attributeVertex = webglContext.getAttribLocation(program, "vertex");
        this.attributeNormal = webglContext.getAttribLocation(program, "normal");
        this.uniformModelViewProjectionMatrix = webglContext.getUniformLocation(program, "ModelViewProjectionMatrix");
        this.uniformNormalMatrix = webglContext.getUniformLocation(program, "NormalMatrix");
        this.uniformColor = webglContext.getUniformLocation(program, "color");
        this.uniformLightDirection = webglContext.getUniformLocation(program, "lDir");
        this.uniformLightPosition = webglContext.getUniformLocation(program, "lPos");
        this.uniformLimit = webglContext.getUniformLocation(program, "lim");
        this.uniformEasing = webglContext.getUniformLocation(program, "eas");
    }

    use() {
        webglContext.useProgram(this.programObject);
    }
}

function render() {
    webglContext.clearColor(0, 0, 0, 1);
    webglContext.clear(webglContext.COLOR_BUFFER_BIT | webglContext.DEPTH_BUFFER_BIT);

    let projectionMatrix = m4.perspective(Math.PI / 8, 1, 8, 20);
    let modelViewMatrix = controller.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.0);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelViewMatrix);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    let modelViewProjectionMatrix = m4.multiply(projectionMatrix, matAccum1);

    const normalMatrix = m4.identity();
    m4.inverse(modelViewMatrix, normalMatrix);
    m4.transpose(normalMatrix, normalMatrix);

    webglContext.uniformMatrix4fv(program.uniformNormalMatrix, false, normalMatrix);
    webglContext.uniformMatrix4fv(program.uniformModelViewProjectionMatrix, false, modelViewProjectionMatrix);

    webglContext.uniform4fv(program.uniformColor, [1, 1, 0, 1]);

    let lightDirectionX = document.getElementById('dx').value;
    let lightDirectionY = document.getElementById('dy').value;
    let lightDirectionZ = document.getElementById('dz').value;
    let lightPositionX = document.getElementById('px').value;
    let lightPositionZ = document.getElementById('pz').value;

    webglContext.uniform3fv(program.uniformLightDirection, [lightDirectionX, lightDirectionY, lightDirectionZ]);
    webglContext.uniform3fv(program.uniformLightPosition, [lightPositionX, 3 * Math.sin(Date.now() * 0.001), lightPositionZ]);
    webglContext.uniform1f(program.uniformLimit, parseFloat(document.getElementById('lim').value));
    webglContext.uniform1f(program.uniformEasing, parseFloat(document.getElementById('ease').value));

    geometry.draw();
    webglContext.uniform1f(program.uniformLimit, -100.0);
    webglContext.uniformMatrix4fv(program.uniformModelViewProjectionMatrix, false, m4.multiply(modelViewProjectionMatrix, m4.translation(lightPositionX,  1* Math.sin(Date.now() * 0.001), 1)));

    lightSource1.draw();
    lightSource2.setData([0, 0, 0, -lightPositionX,  -1* Math.sin(Date.now() * 0.001), -1],[0, 0, 0, 1, 1, 1]);
    lightSource2.drawLight();
}

function drawFrame() {
    render();
    window.requestAnimationFrame(drawFrame);
}

function createSurfaceData() {
    let vertexList = [];
    let normalList = [];
    let step = 0.03;
    let derivStep = 0.0001;
    let a = 1;
    let r = 1;
    let theta = 0;

    let getVertex = (u, v) => {
        let x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v);
        let y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v);
        let z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta);
        return [x, y, z];
    };

    let getAverageNormal = (u, v) => {
        let v0 = getVertex(u, v);
        let v1 = getVertex(u + step, v);
        let v2 = getVertex(u, v + step);
        let v3 = getVertex(u - step, v + step);
        let v4 = getVertex(u - step, v);
        let v5 = getVertex(u - step, v - step);
        let v6 = getVertex(u, v - step);
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
            normalList.push(...getAverageNormal(u, v));
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta);
            vertexList.push(x, y, z);
            normalList.push(...getAverageNormal(u + step, v));
            x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v + step);
            y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v + step);
            z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta);
            vertexList.push(x, y, z);
            normalList.push(...getAverageNormal(u, v + step));
            vertexList.push(x, y, z);
            normalList.push(...getAverageNormal(u, v + step));
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta);
            vertexList.push(x, y, z);
            normalList.push(...getAverageNormal(u + step, v));
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v + step);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v + step);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta);
            vertexList.push(x, y, z);
            normalList.push(...getAverageNormal(u + step, v + step));
        }
    }
    return [vertexList, normalList];
}

function createSphereData() {
    let vertexList = [];
    let normalList = [];

    let u = 0, t = 0;
    while (u < Math.PI * 2) {
        while (t < Math.PI) {
            let v = getSphereVertex(u, t);
            let w = getSphereVertex(u + 0.1, t);
            let wv = getSphereVertex(u, t + 0.1);
            let ww = getSphereVertex(u + 0.1, t + 0.1);
            vertexList.push(v.x, v.y, v.z);
            normalList.push(v.x, v.y, v.z);
            vertexList.push(w.x, w.y, w.z);
            normalList.push(w.x, w.y, w.z);
            vertexList.push(wv.x, wv.y, wv.z);
            normalList.push(wv.x, wv.y, wv.z);
            vertexList.push(wv.x, wv.y, wv.z);
            normalList.push(wv.x, wv.y, wv.z);
            vertexList.push(w.x, w.y, w.z);
            normalList.push(w.x, w.y, w.z);
            vertexList.push(ww.x, ww.y, ww.z);
            normalList.push(ww.x, ww.y, ww.z);
            t += 0.1;
        }
        t = 0;
        u += 0.1;
    }
    return [vertexList, normalList];
}

const radius = 0.05;

function getSphereVertex(long, lat) {
    return {
        x: radius * Math.cos(long) * Math.sin(lat),
        y: radius * Math.sin(long) * Math.sin(lat),
        z: radius * Math.cos(lat)
    };
}

function initializeGL() {
    let shaderProgram = createProgram(webglContext, vertexShaderSource, fragmentShaderSource);
    program = new ShaderProgram('Basic', shaderProgram);
    program.use();

    program.attributeVertex = webglContext.getAttribLocation(shaderProgram, "vertex");
    program.attributeNormal = webglContext.getAttribLocation(shaderProgram, "normal");
    program.uniformModelViewProjectionMatrix = webglContext.getUniformLocation(shaderProgram, "ModelViewProjectionMatrix");
    program.uniformNormalMatrix = webglContext.getUniformLocation(shaderProgram, "NormalMatrix");
    program.uniformColor = webglContext.getUniformLocation(shaderProgram, "color");
    program.uniformLightDirection = webglContext.getUniformLocation(shaderProgram, "lDir");
    program.uniformLightPosition = webglContext.getUniformLocation(shaderProgram, "lPos");
    program.uniformLimit = webglContext.getUniformLocation(shaderProgram, "lim");
    program.uniformEasing = webglContext.getUniformLocation(shaderProgram, "eas");

    geometry = new Figure('Geometry');
    geometry.setData(createSurfaceData()[0], createSurfaceData()[1]);
    lightSource1 = new Figure();
    lightSource2 = new Figure();
    lightSource1.setData(createSphereData()[0], createSphereData()[1]);
    lightSource2.setData([0, 0, 0, 1, 1, 1], [0, 0, 0, 1, 1, 1]);

    webglContext.enable(webglContext.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vShader);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader: " + gl.getShaderInfoLog(vertexShader));
    }

    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fShader);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader: " + gl.getShaderInfoLog(fragmentShader));
    }

    let shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw new Error("Link error in program: " + gl.getProgramInfoLog(shaderProgram));
    }

    return shaderProgram;
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        webglContext = canvas.getContext("webgl");
        if (!webglContext) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initializeGL();
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    controller = new TrackballRotator(canvas, render, 0);

    drawFrame();
}


