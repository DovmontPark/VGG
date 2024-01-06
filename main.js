'use strict';

let glContext; 
let geometry;   
let program;    
let rotator;    

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

class GeometryModel {
    constructor(id) {
        this.id = id;
        this.buffer = glContext.createBuffer();
        this.count = 0;
    }

    setData(vertices) {
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.buffer);
        glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(vertices), glContext.STREAM_DRAW);
        this.count = vertices.length / 3;
    }

    draw() {
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.buffer);
        glContext.vertexAttribPointer(program.vertexAttrib, 3, glContext.FLOAT, false, 0, 0);
        glContext.enableVertexAttribArray(program.vertexAttrib);
        glContext.drawArrays(glContext.LINE_STRIP, 0, this.count);
    }
}

class ShaderProgram {
    constructor(id, prog) {
        this.id = id;
        this.prog = prog;
        this.vertexAttrib = -1;
        this.colorUniform = -1;
        this.modelViewProjectionMatrixUniform = -1;
    }

    use() {
        glContext.useProgram(this.prog);
    }
}

function render() {
    glContext.clearColor(0, 0, 0, 1);
    glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);

    let projectionMatrix = m4.perspective(Math.PI / 8, 1, 8, 12);
    let modelViewMatrix = rotator.getViewMatrix();
    let rotateToZeroMatrix = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToZeroMatrix = m4.translation(0, 0, -10);
    let accumulatedMatrix0 = m4.multiply(rotateToZeroMatrix, modelViewMatrix);
    let accumulatedMatrix1 = m4.multiply(translateToZeroMatrix, accumulatedMatrix0);

    let modelViewProjectionMatrix = m4.multiply(projectionMatrix, accumulatedMatrix1);

    glContext.uniformMatrix4fv(program.modelViewProjectionMatrixUniform, false, modelViewProjectionMatrix);
    glContext.uniform4fv(program.colorUniform, [1, 1, 0, 1]);

    geometry.draw();
}

function createGeometryData() {
    let vertexList = [];
    let step = 0.03;
    let a = 1;
    let r = 1;

    for (let u = -Math.PI; u <= Math.PI; u += step) {
        for (let v = 0; v <= 2 * Math.PI; v += step) {
            let x = (2 + a * Math.cos(v)) * Math.cos(u);
            let y = (2 + a * Math.cos(v)) * Math.sin(u);
            let z = a * Math.sin(v) + a * Math.sin(2 * v) * Math.sin(u);

            vertexList.push(x, y, z);
        }
    }

    return vertexList;
}


function initializeGL() {
    let prog = createShaderProgram(glContext, vertexShaderSource, fragmentShaderSource);

    program = new ShaderProgram('Basic', prog);
    program.use();

    program.vertexAttrib = glContext.getAttribLocation(prog, "vertex");
    program.modelViewProjectionMatrixUniform = glContext.getUniformLocation(prog, "ModelViewProjectionMatrix");
    program.colorUniform = glContext.getUniformLocation(prog, "color");

    let a = 0.2; 
    let r = 1;
    let stepU = 0.1;
    let stepV = 0.1;
    
    geometry = new GeometryModel('Geometry');
    geometry.setData(createGeometryData(a, r, stepU, stepV));

    glContext.enable(glContext.DEPTH_TEST);
}


function createShaderProgram(gl, vertexShaderSource, fragmentShaderSource) {
    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vertexShader));
    }

    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fragmentShader));
    }

    let prog = gl.createProgram();
    gl.attachShader(prog, vertexShader);
    gl.attachShader(prog, fragmentShader);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }

    return prog;
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        glContext = canvas.getContext("webgl");
        if (!glContext) {
            throw "Browser does not support WebGL";
        }
    } catch (error) {
        document.getElementById("canvas-holder").innerHTML =
            `<p>Sorry, could not get a WebGL graphics context.</p>`;
        return;
    }

    try {
        initializeGL();
    } catch (error) {
        document.getElementById("canvas-holder").innerHTML =
            `<p>Sorry, could not initialize the WebGL graphics context: ${error}</p>`;
        return;
    }

    rotator = new TrackballRotator(canvas, render, 0);
    render();
}
