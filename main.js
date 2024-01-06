let gl;
let geometry;
let sh_prog;
let spaceball;
let lightSource1, lightSource2;
let parameters = [0.7, 0.3];

function angleToRadians(angle) {
    return angle * Math.PI / 180;
}

function Grap_Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normales, textures) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normales), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    };

    this.Draw = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(sh_prog.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(sh_prog.iAttribVertex);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(sh_prog.iAttribNormal, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(sh_prog.iAttribNormal);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(sh_prog.iAttribTexture, 2, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(sh_prog.iAttribTexture);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    };
}

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    this.iAttribVertex = -1;
    this.iColor = -1;
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    };
}

function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const getVert = (u, v) => {
        const a = 1;
        const r = 1;
        const theta = 0;
        const x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v);
        const y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v);
        const z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta);
        return [x, y, z];
    };


    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projection = m4.perspective(Math.PI / 8, 1, 8, 20);

    const modelView = spaceball.getViewMatrix();

    const rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.0);
    const translateToPointZero = m4.translation(0, 0, -10);
    const matAccum0 = m4.multiply(rotateToPointZero, modelView);
    const matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    const modelViewProjection = m4.multiply(projection, matAccum1);

    const normal = m4.identity();
    m4.inverse(modelView, normal);
    m4.transpose(normal, normal);

    gl.uniformMatrix4fv(sh_prog.iNormalMatrix, false, normal);
    gl.uniformMatrix4fv(sh_prog.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniform4fv(sh_prog.iColor, [1, 1, 0, 1]);

    const dx = document.getElementById('dx').value;
    const dy = document.getElementById('dy').value;
    const dz = document.getElementById('dz').value;
    const px = document.getElementById('px').value;
    const pz = document.getElementById('pz').value;
    gl.uniform3fv(sh_prog.iLDir, [dx, dy, dz]);
    gl.uniform3fv(sh_prog.iLPos, [px, 3 * Math.sin(Date.now() * 0.001), pz]);
    gl.uniform1f(sh_prog.iLimit, parseFloat(document.getElementById('lim').value));
    gl.uniform1f(sh_prog.iEasing, parseFloat(document.getElementById('ease').value));
    gl.uniform2fv(sh_prog.iTT, parameters);

    geometry.Draw();
    gl.uniform1f(sh_prog.iLimit, -100.0);

    const newModelViewProjection = m4.multiply(modelViewProjection, m4.translation(...getVert((parameters[0] - 0.5) * Math.PI * 2, parameters[1] * Math.PI * 2)));
    gl.uniformMatrix4fv(sh_prog.iModelViewProjectionMatrix, false, newModelViewProjection);
    lightSource1.Draw();
}


function drawe() {
    draw();
    window.requestAnimationFrame(drawe);
}

function createSurfaceData() {
    let vertexList = [];
    let normalList = [];
    let textureList = [];
    let step = 0.03;
    let derivStep = 0.0001;
    let a = 1;
    let r = 1;
    let theta = 0;

    let getVert = (u, v) => {
        let x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v);
        let y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v);
        let z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta)
        return [x, y, z]
    }

    let getAvgNorm = (u, v) => {
        let v0 = getVert(u, v);
        let v1 = getVert(u + step, v);
        let v2 = getVert(u, v + step);
        let v3 = getVert(u - step, v + step);
        let v4 = getVert(u - step, v);
        let v5 = getVert(u - step, v - step);
        let v6 = getVert(u, v - step);
        let v01 = m4.subtractVectors(v1, v0)
        let v02 = m4.subtractVectors(v2, v0)
        let v03 = m4.subtractVectors(v3, v0)
        let v04 = m4.subtractVectors(v4, v0)
        let v05 = m4.subtractVectors(v5, v0)
        let v06 = m4.subtractVectors(v6, v0)
        let n1 = m4.normalize(m4.cross(v01, v02))
        let n2 = m4.normalize(m4.cross(v02, v03))
        let n3 = m4.normalize(m4.cross(v03, v04))
        let n4 = m4.normalize(m4.cross(v04, v05))
        let n5 = m4.normalize(m4.cross(v05, v06))
        let n6 = m4.normalize(m4.cross(v06, v01))
        let n = [(n1[0] + n2[0] + n3[0] + n4[0] + n5[0] + n6[0]) / 6.0,
        (n1[1] + n2[1] + n3[1] + n4[1] + n5[1] + n6[1]) / 6.0,
        (n1[2] + n2[2] + n3[2] + n4[2] + n5[2] + n6[2]) / 6.0]
        n = m4.normalize(n);
        return n;
    }


    for (let u = -Math.PI; u <= Math.PI; u += step) {
        for (let v = 0; v <= 2 * Math.PI; v += step) {
            let x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v);
            let y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v);
            let z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta)
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u, v))
            textureList.push((u + Math.PI) / (2 * Math.PI), v / (2 * Math.PI))
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta)
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u + step, v))
            textureList.push(((u + step) + Math.PI) / (2 * Math.PI), v / (2 * Math.PI))
            x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v + step);
            y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v + step);
            z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta)
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u, v + step))
            textureList.push((u + Math.PI) / (2 * Math.PI), (v + step) / (2 * Math.PI))
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u, v + step))
            textureList.push((u + Math.PI) / (2 * Math.PI), (v + step) / (2 * Math.PI))
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta)
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u + step, v))
            textureList.push(((u + step) + Math.PI) / (2 * Math.PI), v / (2 * Math.PI))
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v + step);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v + step);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta)
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u + step, v + step))
            textureList.push(((u + step) + Math.PI) / (2 * Math.PI), (v + step) / (2 * Math.PI))
        }
    }
    return [vertexList, normalList, textureList];
}

function createSphereData() {
    let vertexList = [];
    let normalList = [];

    let u = 0,
        t = 0;
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
    return [vertexList, normalList]
}
const r = 0.05;
function getSphereVertex(long, lat) {
    return {
        x: r * Math.cos(long) * Math.sin(lat),
        y: r * Math.sin(long) * Math.sin(lat),
        z: r * Math.cos(lat)
    }
}



function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    sh_prog = new ShaderProgram('Basic', prog);
    sh_prog.Use();

    sh_prog.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    sh_prog.iAttribNormal = gl.getAttribLocation(prog, "normal");
    sh_prog.iAttribTexture = gl.getAttribLocation(prog, "texture");
    sh_prog.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    sh_prog.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    sh_prog.iColor = gl.getUniformLocation(prog, "color");
    sh_prog.iLDir = gl.getUniformLocation(prog, "lDir");
    sh_prog.iLPos = gl.getUniformLocation(prog, "lPos");
    sh_prog.iLimit = gl.getUniformLocation(prog, "lim");
    sh_prog.iEasing = gl.getUniformLocation(prog, "eas");
    sh_prog.iTT = gl.getUniformLocation(prog, "tt");

    geometry = new Grap_Model('Surface');
    geometry.BufferData(createSurfaceData()[0], createSurfaceData()[1], createSurfaceData()[2]);
    lightSource1 = new Grap_Model();
    lightSource1.BufferData(createSphereData()[0], createSphereData()[1], createSphereData()[1]);

    gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
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
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    LoadTexture();
    drawe();
}

window.onkeydown = (e) => {
    if (e.keyCode == 87) {
        
        parameters[0] = Math.min(parameters[0] + 0.02, 1);
    } else if (e.keyCode == 65) {
       
        parameters[1] = Math.max(parameters[1] - 0.02, 0);
    } else if (e.keyCode == 83) {
        
        parameters[0] = Math.max(parameters[0] - 0.02, 0);
    } else if (e.keyCode == 68) {
       
        parameters[1] = Math.min(parameters[1] + 0.02, 1);
    }
    console.log(parameters);
};

function LoadTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';
    image.src = "https://raw.githubusercontent.com/DovmontPark/VGG/CGW/texture.jpg";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        console.log("Loaded")
        draw()
    }
}
