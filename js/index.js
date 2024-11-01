import * as THREE from 'https://cdn.skypack.dev/three@0.129.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js'
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.min.js'

var sizes, canvas, camera, scene, light1, light2, renderer, controls, loader, maze, ballBody, world

var clock = new THREE.Clock();
var keyboard = new THREEx.KeyboardState()

init()
render()

function init() {
    sizes = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    // Canvas
    canvas = document.querySelector('.webgl')

    // Camera
    camera = new THREE.PerspectiveCamera(75, sizes.width/sizes.height, 0.1, 100)
    camera.position.set(0, 1.5, 2)

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio), 2)
    renderer.shadowMap.enabled = true
    renderer.gammaOutput = true
    document.body.appendChild( renderer.domElement );

    // Scene
    scene = new THREE.Scene()

    // Light
    light1 = new THREE.DirectionalLight(0xffffff, 1)
    light1.position.set(1, 10, 3)
    scene.add(light1)
    light2 = new THREE.DirectionalLight(0xffffff, 1)
    light2.position.set(1, 10, -3)
    scene.add(light2)

    // Loader
    loader = new GLTFLoader()

    // Control
    controls = new OrbitControls(camera, renderer.domElement)

    // Cannon.js physics world
    world = new CANNON.World();
    // Gravity along the Y-axis
    world.gravity.set(0, -9.82, 0);

    // Objects
    addObjects()
}

function render() {
    requestAnimationFrame( render )

    renderer.render(scene, camera)

    update()
}

function addObjects() {
    // Maze
    loader.load('../models/maze-circular.glb', function (glb){
        // console.log(glb)
        maze = glb.scene
        maze.scale.set(0.1, 0.1, 0.1)
        maze.position.set(0, 0, 0)
        maze.rotateOnAxis( new THREE.Vector3(0, 1, 0), Math.PI)
        scene.add(maze)

        // Create the ball after the maze has loaded
        createBall();
    }, function (xhr){
        // console.log((xhr.loaded/xhr.total * 100) + "% loaded")
    }, function (error){
        console.log("An error occured" + error)
    })
}

function createBall() {
    setTimeout(() => {
        const radius = 0.05;
        const ballShape = new CANNON.Sphere(radius);
        ballBody = new CANNON.Body({
            mass: 0.1,
            shape: ballShape,
            position: new CANNON.Vec3(0, radius, 0)
        });
        world.addBody(ballBody);

        const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const ballGeometry = new THREE.SphereGeometry(radius, 32, 32);
        const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
        ballMesh.castShadow = true;
        ballBody.threeMesh = ballMesh;
        scene.add(ballMesh);

        console.log("Ball delay");
    }, 500);
}

function update() {
    var delta = clock.getDelta()
    var rotateAngle = Math.PI / 2 * delta

    // Rotate maze
    if (keyboard.pressed("Q")) maze.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotateAngle);
    if (keyboard.pressed("E")) maze.rotateOnAxis(new THREE.Vector3(0, 1, 0), -rotateAngle);

    // Tilt maze
    if (keyboard.pressed("W")) maze.rotateOnAxis(new THREE.Vector3(1, 0, 0), rotateAngle);
    if (keyboard.pressed("S")) maze.rotateOnAxis(new THREE.Vector3(1, 0, 0), -rotateAngle);
    if (keyboard.pressed("D")) maze.rotateOnAxis(new THREE.Vector3(0, 0, 1), rotateAngle);
    if (keyboard.pressed("A")) maze.rotateOnAxis(new THREE.Vector3(0, 0, 1), -rotateAngle);

    // Update physics world
    world.step(delta);

    // Update Three.js ball mesh position based on Cannon.js body position
    ballBody.threeMesh.position.copy(ballBody.position);
    ballBody.threeMesh.quaternion.copy(ballBody.quaternion);

    controls.update()
}
