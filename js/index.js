import {OrbitControls} from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js'
import {GLTFLoader} from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js'
import * as threeToAmmo from "three-to-ammo"
import {TYPE} from "three-to-ammo";
// import {THREE} from './THREE.AmmoDebugDrawer.js'; // Import your custom class
// import {AmmoDebugDrawer, AmmoDebugConstants, DefaultBufferSize} from "ammo-debug-drawer"


var sizes, canvas, camera, scene, light1, light2, renderer, controls, loader, maze, ballBody, world, tmpTrans

var clock = new THREE.Clock();
var keyboard = new THREEx.KeyboardState()
var dynamicsWorld;
let rigidBodies = []
var debugDrawer;

Ammo().then(setupPhysics)


function setupPhysics() {

    tmpTrans = new Ammo.btTransform();

    var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    dynamicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));
    init()
    initDebug()
    addObjects()
    render()
}

function initDebug() {


    debugDrawer = new THREEx.AmmoDebugDrawer(scene, dynamicsWorld, {});
    debugDrawer.enable()
}


function init() {

    sizes = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    // Canvas
    canvas = document.querySelector('.webgl')

    // Camera
    camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
    camera.position.set(0, 1.5, 2)

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio), 2)
    renderer.shadowMap.enabled = true
    renderer.gammaOutput = true
    document.body.appendChild(renderer.domElement);

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

    // Objects
}

function render() {

    update()


    if (debugDrawer) {
        debugDrawer.update()
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);

}

function createGround() {
    loader.load('../models/ground.glb', function (glb) {
        // console.log(glb)
        let pos = {x: 0, y: 0, z: 0};
        let scale = {x: 1, y: 1, z: 1};
        let quat = {x: 0, y: 0, z: 0, w: 1};
        let mass = 0;
        maze = glb.scene
        maze.scale.set(scale.x, scale.y, scale.z)
        maze.position.set(pos.x, pos.y, pos.z)
        maze.rotateOnAxis(new THREE.Vector3(0, 0, 0), Math.PI)
        scene.add(maze)

        //Ammojs Section
        let transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        let motionState = new Ammo.btDefaultMotionState(transform);
        const shapeComponent = {
            el: {object3D: maze},
            data: {
                offset: new THREE.Vector3(0,-0.85,0),
                type: TYPE.HULL, // Collision shape type
            }
        };
        let colShapes = _createCollisionShape(shapeComponent)
        let compoundShape = new Ammo.btCompoundShape();

        // Combine all collision shapes
        colShapes.forEach((shape, index) => {
            compoundShape.addChildShape(shape.localTransform, shape);

        });
        let localInertia = new Ammo.btVector3(0, 0, 0);
        compoundShape.calculateLocalInertia(mass, localInertia);

        let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, compoundShape, localInertia);
        let body = new Ammo.btRigidBody(rbInfo);


        dynamicsWorld.addRigidBody(body);
        maze.userData.physicsBody = body;
        rigidBodies.push(maze);

        // Create the ball after the maze has loaded

    }, function (xhr) {
        // console.log((xhr.loaded/xhr.total * 100) + "% loaded")
    }, function (error) {
        console.log("An error occured" + error)
    })
}



function createMaze() {
    loader.load('../models/maze-circular.glb', function (glb) {
        // console.log(glb)
        let pos = {x: 0, y: 0, z: 0};
        let scale = {x: 1, y: 1, z: 1};
        let quat = {x: 0, y: 0, z: 0, w: 1};
        let mass = 0;
        maze = glb.scene
        maze.scale.set(scale.x, scale.y, scale.z)
        maze.position.set(pos.x, pos.y, pos.z)
        maze.rotateOnAxis(new THREE.Vector3(0, 0, 0), Math.PI)
        scene.add(maze)

        //Ammojs Section
        let transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        let motionState = new Ammo.btDefaultMotionState(transform);
        const shapeComponent = {
            el: {object3D: maze},
            data: {
                offset: new THREE.Vector3(0,0,0),
                type: TYPE.HACD, // Collision shape type
            }
        };
        let colShapes = _createCollisionShape(shapeComponent)
        let compoundShape = new Ammo.btCompoundShape();

        // Combine all collision shapes
        colShapes.forEach((shape, index) => {
            compoundShape.addChildShape(shape.localTransform, shape);

        });
        let localInertia = new Ammo.btVector3(0, 0, 0);
        compoundShape.calculateLocalInertia(mass, localInertia);

        let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, compoundShape, localInertia);
        let body = new Ammo.btRigidBody(rbInfo);


        dynamicsWorld.addRigidBody(body);
        maze.userData.physicsBody = body;
        rigidBodies.push(maze);

        // Create the ball after the maze has loaded

        createBall();
    }, function (xhr) {
        // console.log((xhr.loaded/xhr.total * 100) + "% loaded")
    }, function (error) {
        console.log("An error occured" + error)
    })
}

function addObjects() {
    // Maze
    createGround()
    createMaze()
}

function createBall() {

    setTimeout(() => {
        const radius = 0.5;
        let pos = {x: 0, y: 10, z: 0};
        let quat = {x: 0, y: 0, z: 0, w: 1};
        let mass = 1;

        let ball = new THREE.Mesh(new THREE.SphereBufferGeometry(radius), new THREE.MeshPhongMaterial({color: 0x1118d6}));
        ball.position.set(pos.x, pos.y, pos.z);
        ball.castShadow = true;
        ball.receiveShadow = true;

        scene.add(ball);

        //Ammojs Section
        let transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        let motionState = new Ammo.btDefaultMotionState(transform);

        let colShape = new Ammo.btSphereShape(radius);
        colShape.setMargin(0.01);

        let localInertia = new Ammo.btVector3(0, 0, 0);
        colShape.calculateLocalInertia(mass, localInertia);

        let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
        let body = new Ammo.btRigidBody(rbInfo);


        dynamicsWorld.addRigidBody(body);

        ball.userData.physicsBody = body;
        rigidBodies.push(ball);

        console.log("Ball delay");
    }, 2000);

}

function updatePhysics(deltaTime) {
    dynamicsWorld.stepSimulation(deltaTime, 10);
    // Update rigid bodies
    for (let i = 0; i < rigidBodies.length; i++) {
        let objThree = rigidBodies[i];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if (ms) {

            ms.getWorldTransform(tmpTrans);
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set(p.x(), p.y(), p.z());
            objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());

        }
    }
}

function _createCollisionShape(shapeComponent) {
    const data = shapeComponent.data;
    const vertices = [];
    const matrices = [];
    const indexes = [];
    const root = shapeComponent.el.object3D;
    const matrixWorld = root.matrixWorld;

    threeToAmmo.iterateGeometries(root, data, (vertexArray, matrixArray, indexArray) => {
        vertices.push(vertexArray);
        matrices.push(matrixArray);
        indexes.push(indexArray);
    });
    console.log("data: ",data)
    return threeToAmmo.createCollisionShapes(vertices, matrices, indexes, matrixWorld.elements, data);

}

function updatePhysicsFromThree(threeObject, rigidBody) {
    console.log("physics update")
    const transform = new Ammo.btTransform();
    transform.setIdentity();

    // Set position
    const position = threeObject.position;
    transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));

    // Set rotation
    const quaternion = threeObject.quaternion;
    transform.setRotation(new Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w));

    // Apply transform to the rigid body
    rigidBody.setWorldTransform(transform);

    // Clean up memory
    Ammo.destroy(transform);
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
    updatePhysics(delta);


    // Update Three.js ball mesh position based on Cannon.js body position


    controls.update()
}
