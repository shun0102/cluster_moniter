var renderer, scene, camera, controls, projector, container, hash, conn;
var paused = false;
var mouse = { x: 0, y: 0 };
var current_stats = {};
var host = "tsukuba000.intrigger.omni.hpcc.jp";
var port = 50070;
var barHash = {};
var barGraph;
var windowWidth, windowHeight;
var marginWidth = 8;
var marginHeight = 155;
var fov = 45;
var max_params = { cpu:100,
                   disk:100,
                   net:100}

THREE.LeftAlign = 1;
THREE.CenterAlign = 0;
THREE.RightAlign = -1;
THREE.TopAlign = -1;
THREE.BottomAlign = 1;
var textBoard;
function addText(text, x, y, z) {
    var title = alignPlane(createText2D(text), 0, 0);
    title.scale.set(0.25, 0.25, 0.25);
    title.position.x = x;
    title.position.z = z;
    title.position.y = y;
    title.rotation.x = -Math.PI/2;

    textBoard.add(title);
    scene.add(textBoard);
}

function createTextCanvas(text, color, font, size) {
    size = size || 24;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var fontStr = (size + 'px ') + (font || 'Arial');
    ctx.font = fontStr;
    var w = ctx.measureText(text).width;
    var h = Math.ceil(size*1.25);
    canvas.width = w;
    canvas.height = h;
    ctx.font = fontStr;
    ctx.fillStyle = color || 'black';
    ctx.fillText(text, 0, size);
    return canvas;
}

function createText2D(text, color, font, size, segW, segH) {
    var canvas = createTextCanvas(text, color, font, size);
    var plane = new THREE.PlaneGeometry(canvas.width, canvas.height, segW, segH);
    var tex = new THREE.Texture(canvas);
    tex.needsUpdate = true;
    var planeMat = new THREE.MeshBasicMaterial({
        map: tex, color: 0xffffff, transparent: true
    });
    var mesh = new THREE.Mesh(plane, planeMat);
    mesh.doubleSided = true;
    return mesh;
}

function alignPlane(plane, horizontalAlign, verticalAlign) {
    var obj = new THREE.Object3D();
    var u = plane.geometry.vertices[0].position;
    var v = plane.geometry.vertices[plane.geometry.vertices.length-1].position;
    var width = Math.abs(u.x - v.x);
    var height = Math.abs(u.y - v.y);
    plane.position.x = (width/2) * horizontalAlign;
    plane.position.y = (height/2) * verticalAlign;
    obj.add(plane);
    return obj;
}

function addLights(){
    var light = new THREE.SpotLight();
    light.castShadow = true;
    light.position.set( -170, 300, 100 );
    scene.add(light);

    var ambientLight = new THREE.PointLight(0x442255);
    ambientLight.position.set(20, 150, -120);
    scene.add(ambientLight);
}

function addControls(){
    controls = new THREE.TrackballControls( camera, renderer.domElement );
    controls.rotateSpeed = 2.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 1.0;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.5;
    controls.keys = [65, 83, 68];
    controls.minDistance = 1.1;
    controls.maxDistance = 1000;
}

function addCamera(){
    camera = new THREE.PerspectiveCamera( fov, windowWidth/windowHeight, 1, 10000 );
    camera.position.x = 0;
    camera.position.y = 200;
    camera.position.z = 200;
}

function init() {
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(windowWidth, windowHeight);

    container = document.createElement( 'div' );
    document.body.appendChild( container );
    container.appendChild(renderer.domElement);

    renderer.setClearColorHex(0xEEEEEE, 1.0);
    renderer.shadowMapEnabled = true;
    renderer.shadowMapWidth = 1024;
    renderer.shadowMapHeight = 1024;
    renderer.shadowCameraFov = 35;

    scene = new THREE.Scene();
    projector = new THREE.Projector();

    addCamera();
    addLights();
    addControls();

    var plane = new THREE.Mesh(
        new THREE.CubeGeometry(10000, 1, 10000),
        new THREE.MeshLambertMaterial({color: 0xFFFFFF}));
    plane.position.y = -1;
    plane.receiveShadow = true;
    plane.doubleSided = true;
    scene.add(plane);
    container.onmousemove = onDocumentMouseMove;
    container.onmousewheel = onDocumentMouseWheel;
    render();
    var last = new Date().getTime();
}

function render() {
    controls.update();
    renderer.render(scene, camera);
}

function animate(t) {
    if (!paused) {
        last = t;
        renderer.clear();

        var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
        projector.unprojectVector( vector, camera );
        var ray = new THREE.Ray( camera.position, vector.subSelf( camera.position ).normalize() );
        var c = THREE.Collisions.rayCastNearest( ray );

        for(var i in barHash) {
            for(var j in barHash[i]) {
                var h = 0.125 - (Math.min(barHash[i][j].scale.y, 1) / 8);
                barHash[i][j].materials[ 0 ].color.setHSV( h, 1, 1);
            }
        }
        if ( c ) {
            c.mesh.materials[ 0 ].color.setHex( 0xbb0000 );
            stat( c.mesh.name, c.mesh.key );
        } else {
            clearStat();
        }
        render();
    }
    window.requestAnimationFrame(animate, renderer.domElement);
};

function stat(hostname, key) {
    if (current_stats[hostname]) {
        var data = current_stats[hostname][key];
        $('#hostname_area').html( hostname );
        $('#name_area').html( key );
        var text = "";
        for( var i in data) {
            text += i + ":" + data[i];
        };
        $('#stats_info_area').html(text);
    }
}

function clearStat() {
    $('#hostname_area').html("");
    $('#name_area').html("");
    $('#stats_info_area').html("");
}

function log(data){
    document.getElementById("log").innerHTML = data + "\n" + document.getElementById("log").innerHTML;
}

var connect = function() {
    if (window["WebSocket"]) {
        conn = new WebSocket("ws://"+host+":"+port+"/test");

        conn.onmessage = function(evt) {
            var param = $('#property').val();
            updateGraph(evt.data, param);
        };

        conn.onerror = function() {
            log("error", arguments);
        };

        conn.onclose = function() {
            log("closed");
        };
        conn.onopen = function() {
            log("opened");
        };
    }
};

function addBar(hostname, key, x, y, z) {
    var mat = new THREE.MeshLambertMaterial({color: 0xFFAA55});
    var barHeight = 100;
    var geo = new THREE.CubeGeometry(8, barHeight, 8);
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = x - 80;
    mesh.position.y = y;
    mesh.position.z = z + 40;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = hostname;
    mesh.key = key;
    barGraph.add(mesh);
    barHash[hostname][key] = mesh;
    var mc = THREE.CollisionUtils.MeshColliderWBox(mesh);
    THREE.Collisions.colliders.push( mc );
};

function alertStats() {
    current_stats;
}

function initGraph(param) {
    if (barGraph) {
        scene.remove(barGraph);
        scene.remove(textBoard);
    }
    barGraph = new THREE.Object3D();
    textBoard = new THREE.Object3D();
    scene.add(barGraph);
    var xLength = 0;
    for (var i in current_stats) {
        xLength += 1;
    }

    var hostlist = [];
    var host_namelist = {};

    for (var i in current_stats) {
        hostlist.push(i);
        var namelist = [];
        for (var j in current_stats[i]) {
            if (j != "cpu") {
                namelist.push(j);
            }
        }
        host_namelist[i] = namelist.sort();
    }
    hostlist = hostlist.sort();

    var zIndex = 0;
    for (var i = 0; i < hostlist.length; i++) {
        var xIndex = 0;
        hostname = hostlist[i];
        barHash[hostname] = {};
        var y=0,
        z = zIndex*(-16);
        addText(hostname, -100, 1, z + 40);

        for (var j = 0; j < host_namelist[hostname].length; j++) {
            var x = xIndex*10;
            addBar(hostname, host_namelist[hostname][j], x, y, z);
            xIndex += 1;
        }
        zIndex += 1;
    }
}

var global_type;

function updateGraph(data, param) {
    try{
        var jsonArray = JSON.parse(data.toString());
    } catch (e) {
        return;
    }
    var params = param.split(".");

    //current_statsの更新
    if(global_type != params[0]) {
        current_stats = {};
        barHash = {};
    }

    var newHost = false
    for (var i = 0, length = jsonArray.length; i < length; i++) {
        if (current_stats[jsonArray[i].hostname]) {
            newHost = true;
        }
        current_stats[jsonArray[i].hostname] = jsonArray[i].stats[params[0]];
    }

    //新規ホスト数orパラメータの変更があったか確認
    if( global_type == params[0] && newHost) {
        //グラフの一部更新
        log("not change");
    } else {
        //グラフ全体書き
        initGraph(params[1])
        log("changed");
    }

    for (var i in barHash) {
        for (var j in barHash[i]) {
            if (!current_stats[i][j] || current_stats[i][j][params[1]] == 0) {
                barHash[i][j].scale.y = 1 / max_params[params[0]];
            } else {
                barHash[i][j].scale.y = current_stats[i][j][params[1]] / max_params[params[0]];
            }
        }
    }

    global_type = params[0]
    render();
}

function onDocumentMouseMove( event ) {
    event.preventDefault();
    mouse.x = (( event.clientX - container.offsetLeft + document.body.scrollLeft ) / windowWidth ) * 2 - 1;
    mouse.y = - (( event.clientY - container.offsetTop + document.body.scrollTop ) / windowHeight ) * 2 + 1;
};

function onDocumentMouseWheel( event ) {
    fov -= event.wheelDeltaY * 0.05;
    camera.projectionMatrix = THREE.Matrix4.makePerspective( fov, windowWidth / windowHeight, 1, 1100 );
}

window.onload = function() {
    windowWidth = window.innerWidth - marginWidth;
    windowHeight = window.innerHeight - marginHeight;
    init();

    animate(new Date().getTime());
    connect();

    onmessage = function(ev) {
        paused = (ev.data == 'pause');
    };

    onresize = function(ev) {
        windowWidth = window.innerWidth - marginWidth;
        windowHeight = window.innerHeight - marginHeight;
        renderer.setSize( windowWidth, windowHeight );
        camera.aspect = windowWidth / windowHeight;
        camera.updateProjectionMatrix();

        controls.screen.width = windowWidth;
        controls.screen.height = windowHeight;
        camera.radius = ( windowWidth + windowHeight ) / 4;
    }

    $("#property").change(function(){
        var parameter = $(this).val();
        conn.send(parameter);
    });
}

