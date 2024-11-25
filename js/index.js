import { OrbitControls } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js'
import * as threeToAmmo from "three-to-ammo"
import { TYPE } from "three-to-ammo";
// import {THREE} from './THREE.AmmoDebugDrawer.js'; // Import your custom class
// import {AmmoDebugDrawer, AmmoDebugConstants, DefaultBufferSize} from "ammo-debug-drawer"

const FLAGS = { CF_KINEMATIC_OBJECT: 2 }
const STATE = { DISABLE_DEACTIVATION : 4 }

var sizes, canvas, camera, scene, light1, light2, renderer, controls, loader, maze, ground, world, tmpTrans

var clock = new THREE.Clock();
var keyboard = new THREEx.KeyboardState()
var dynamicsWorld;
let rigidBodies = []
var debugDrawer;
let tmpPos = new THREE.Vector3(), tmpQuat = new THREE.Quaternion();
let rotateDirection = { x: 0, y: 0, z: 0 };

let ammoTmpPos = null, ammoTmpQuat = null;


Ammo().then(setupPhysics)


function setupPhysics() {

    tmpTrans = new Ammo.btTransform();
    ammoTmpPos = new Ammo.btVector3();
    ammoTmpQuat = new Ammo.btQuaternion();
3
    var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    dynamicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));
    init()
    initDebug()
    addObjects()
    setupEventHandlers()
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
        let pos = { x: 0, y: 0, z: 0 };
        let scale = { x: 1, y: 1, z: 1 };
        let quat = { x: 0, y: 0, z: 0, w: 1 };
        let mass = 0;
        ground = glb.scene
        ground.scale.set(scale.x, scale.y, scale.z)
        ground.position.set(pos.x, pos.y, pos.z)
        ground.rotateOnAxis(new THREE.Vector3(0, 0, 0), Math.PI)
        scene.add(ground)

        //Ammojs Section
        let transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        let motionState = new Ammo.btDefaultMotionState(transform);
        const shapeComponent = {
            el: { object3D: ground },
            data: {
                offset: new THREE.Vector3(0, -0.85, 0),
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


        body.setActivationState( STATE.DISABLE_DEACTIVATION );
        body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT);
        dynamicsWorld.addRigidBody(body);
        ground.userData.physicsBody = body;
        rigidBodies.push(ground);

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
        let pos = { x: 0, y: 0, z: 0 };
        let scale = { x: 1, y: 1, z: 1 };
        let quat = { x: 0, y: 0, z: 0, w: 1 };
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
            el: { object3D: maze },
            data: {
                offset: new THREE.Vector3(0, 0, 0),
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

        body.setActivationState(STATE.DISABLE_DEACTIVATION);
        body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT);

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
        const radius = 0.2;
        let pos = { x: 0, y: 10, z: 0 };
        let quat = { x: 0, y: 0, z: 0, w: 1 };
        let mass = 1;

        let ball = new THREE.Mesh(new THREE.SphereBufferGeometry(radius), new THREE.MeshPhongMaterial({ color: 0x1118d6 }));
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
    console.log("data: ", data)
    return threeToAmmo.createCollisionShapes(vertices, matrices, indexes, matrixWorld.elements, data);

}


function handleKeyDown(event) {

    let keyCode = event.keyCode;

    switch(keyCode) {
        case 87: // W: TILT UP (Rotate around X-axis positively)
            rotateDirection.x = 1;
            break;
        case 83: // S: TILT DOWN (Rotate around X-axis negatively)
            rotateDirection.x = -1;
            break;
        case 65: // A: ROLL LEFT (Rotate around Z-axis positively)
            rotateDirection.z = 1;
            break;
        case 68: // D: ROLL RIGHT (Rotate around Z-axis negatively)
            rotateDirection.z = -1;
            break;
        case 81: // Q:  ROTATE LEFT (Rotate around Y-axis positively)
            rotateDirection.y = 1;
            break;
        case 69: // E:  ROTATE RIGHT (Rotate around Y-axis negatively)
            rotateDirection.y = -1;
            break;
    }
}

function handleKeyUp(event){
    let keyCode = event.keyCode;

    switch(keyCode) {
        case 87: // W: TILT UP (Rotate around X-axis positively)
            rotateDirection.x = 0;
            break;
        case 83: // S: TILT DOWN (Rotate around X-axis negatively)
            rotateDirection.x = 0;
            break;
        case 65: // A: ROTATE LEFT (Rotate around Y-axis positively)
            rotateDirection.z = 0;
            break;
        case 68: // D: ROTATE RIGHT (Rotate around Y-axis negatively)
            rotateDirection.z = 0;
            break;
        case 81: // Q: ROLL LEFT (Rotate around Z-axis positively)
            rotateDirection.y = 0;
            break;
        case 69: // E: ROLL RIGHT (Rotate around Z-axis negatively)
            rotateDirection.y = 0;
            break;
    }

}

function rotateKinematic() {
    let rotationFactor = 0.05; // Adjust for desired speed

    // Compute rotation values
    let rotateX = rotateDirection.x * rotationFactor;
    let rotateY = rotateDirection.y * rotationFactor;
    let rotateZ = rotateDirection.z * rotationFactor;

    // Rotate the visual object
    ground.rotateOnAxis(new THREE.Vector3(1, 0, 0), rotateX);
    ground.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotateY);
    ground.rotateOnAxis(new THREE.Vector3(0, 0, 1), rotateZ);
    maze.rotateOnAxis(new THREE.Vector3(1, 0, 0), rotateX);
    maze.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotateY);
    maze.rotateOnAxis(new THREE.Vector3(0, 0, 1), rotateZ);

    // Sync with Ammo.js
    ground.getWorldPosition(tmpPos);
    ground.getWorldQuaternion(tmpQuat);


    let physicsBodyG = ground.userData.physicsBody;
    let physicsBodyM = maze.userData.physicsBody;

    let msG = physicsBodyG.getMotionState();
    let msM = physicsBodyM.getMotionState();
    if (msM && msG) {
        ammoTmpPos.setValue(tmpPos.x, tmpPos.y, tmpPos.z);
        ammoTmpQuat.setValue(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w);

        tmpTrans.setIdentity();
        tmpTrans.setOrigin(ammoTmpPos);
        tmpTrans.setRotation(ammoTmpQuat);

        msM.setWorldTransform(tmpTrans);
        msG.setWorldTransform(tmpTrans);
    }
}

function setupEventHandlers(){

    window.addEventListener( 'keydown', handleKeyDown, false);
    window.addEventListener( 'keyup', handleKeyUp, false);

}

function update() {
    var delta = clock.getDelta()
    if (maze && ground)
        rotateKinematic()
    // var rotateAngle = Math.PI / 2 * delta

    // Rotate maze
    // if (keyboard.pressed("Q")) maze.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotateAngle);
    // if (keyboard.pressed("E")) maze.rotateOnAxis(new THREE.Vector3(0, 1, 0), -rotateAngle);
    //
    // // Tilt maze
    // if (keyboard.pressed("W")) maze.rotateOnAxis(new THREE.Vector3(1, 0, 0), rotateAngle);
    // if (keyboard.pressed("S")) maze.rotateOnAxis(new THREE.Vector3(1, 0, 0), -rotateAngle);
    // if (keyboard.pressed("D")) maze.rotateOnAxis(new THREE.Vector3(0, 0, 1), rotateAngle);
    // if (keyboard.pressed("A")) maze.rotateOnAxis(new THREE.Vector3(0, 0, 1), -rotateAngle);


    // Update physics world
    updatePhysics(delta);


    // Update Three.js ball mesh position based on Cannon.js body position


    controls.update()
}
