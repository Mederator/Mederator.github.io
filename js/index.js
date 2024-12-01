import { OrbitControls } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js'
import * as threeToAmmo from "three-to-ammo"
import { TYPE } from "three-to-ammo";
// import {THREE} from './THREE.AmmoDebugDrawer.js'; // Import your custom class
// import {AmmoDebugDrawer, AmmoDebugConstants, DefaultBufferSize} from "ammo-debug-drawer"

const FLAGS = { CF_KINEMATIC_OBJECT: 2 }
const STATE = { DISABLE_DEACTIVATION : 4 }

var sizes, canvas, camera, scene, light1, light2, renderer, controls, loader, maze, ground, glass, ball, finishLine, fireworkScene, world, tmpTrans

var clock = new THREE.Clock();
var keyboard = new THREEx.KeyboardState()
var dynamicsWorld;
let rigidBodies = []
var debugDrawer;
let tmpPos = new THREE.Vector3(), tmpQuat = new THREE.Quaternion();
let rotateDirection = { x: 0, y: 0, z: 0 };

let ammoTmpPos = null, ammoTmpQuat = null;

let timerInterval;
let elapsedTime = 0;

let fireworkIsOn = false;

Ammo().then(setupPhysics)


function setupPhysics() {

    tmpTrans = new Ammo.btTransform();
    ammoTmpPos = new Ammo.btVector3();
    ammoTmpQuat = new Ammo.btQuaternion();

    var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    dynamicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));
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
    light1 = new THREE.DirectionalLight(0xffffff, 0.75)
    light1.position.set(1, 10, 3)
    scene.add(light1)
    light2 = new THREE.DirectionalLight(0xffffff, 0.75)
    light2.position.set(1, 10, -3)
    scene.add(light2)

    // Loader
    loader = new GLTFLoader()

    // Control
    controls = new OrbitControls(camera, renderer.domElement)

    // test
    // Create a separate renderer for the fireworks
    const fireworkCanvas = document.getElementById('fireworkCanvas');
    const fireworkRenderer = new THREE.WebGLRenderer({
        canvas: fireworkCanvas,
        alpha: true, // Allow transparency
    });
    fireworkRenderer.setSize(window.innerWidth, window.innerHeight);
    fireworkRenderer.setPixelRatio(window.devicePixelRatio);

    // Firework scene and camera
    fireworkScene = new THREE.Scene();
    const fireworkCamera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    fireworkCamera.position.z = 20;

    // Update firework rendering in the animation loop
    function animateFireworks() {
        fireworkRenderer.render(fireworkScene, fireworkCamera);
        requestAnimationFrame(animateFireworks);
    }
    animateFireworks();
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

function createStars() {
    var stars = new Array(0);
    for ( var i = 0; i < 15000; i ++ ) {
        let x = 10 + THREE.Math.randFloatSpread( 500 );
        let y = 10 + THREE.Math.randFloatSpread( 500 );
        let z = 10 + THREE.Math.randFloatSpread( 500 );
        stars.push(x, y, z);
    }
    var starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute(
        "position", new THREE.Float32BufferAttribute(stars, 3)
    );
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.7,
        sizeAttenuation: true,
        map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/circle.png'),
        alphaTest: 0.5,
        transparent: true
    });
    var starField = new THREE.Points( starsGeometry, starsMaterial );
    scene.add( starField );
}

function createMaze() {
    // Show loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.style.display = 'flex';

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
                offset: new THREE.Vector3(0, -0.5, 0),
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

        loadingScreen.style.display = 'none';

        // Create the ball after the maze has loaded
        createGlass();
        createBall();
    }, function (xhr) {
        // console.log((xhr.loaded/xhr.total * 100) + "% loaded")
    }, function (error) {
        console.log("An error occured" + error)
    })
}

function addObjects() {
    createStars();

    // Maze
    createGround();
    createMaze();

    createFinishLine({ x: 0, y: -0.45, z: 10 }, { width: 1, height: 1, depth: 0.5 });
}

function createBall() {

    setTimeout(() => {
        const radius = 0.2;
        let pos = { x: 0, y: -0.5, z: 0 };
        let quat = { x: 0, y: 0, z: 0, w: 1 };
        let mass = 1;

        ball = new THREE.Mesh(new THREE.SphereBufferGeometry(radius), new THREE.MeshPhongMaterial({ color: 0x1118d6 }));
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
    }, 500);

}

function createGlass() {
    // Create the cylinder geometry
    const radiusTop = 10.3;
    const radiusBottom = 10.3;
    const height = 0.1;
    const radialSegments = 100;

    const cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);

    // Create a material that simulates glass
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        // color: 0x88ccee,
        color: 0xb5e0f5,
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.5,
        clearcoat: 1,
        clearcoatRoughness: 0,
        metalness: 0,
        reflectivity: 0,
        opacity: 1,
        side: THREE.DoubleSide,
    });

    // Create the cylinder mesh
    glass = new THREE.Mesh(cylinderGeometry, glassMaterial);

    // Position the cylinder
    glass.position.set(0, -0.13, 0); // Adjust position as needed

    // Add the cylinder to the scene
    scene.add(glass);

    // Ammo.js Section
    const pos = { x: 0, y: -0.13, z: 0 }; // Position for Ammo.js
    const quat = { x: 0, y: 0, z: 0, w: 1 }; // Quaternion for Ammo.js
    const mass = 0; // Glass should typically be static, so mass is 0

    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    let motionState = new Ammo.btDefaultMotionState(transform);

    // Create a cylinder collision shape
    const colShape = new Ammo.btCylinderShape(new Ammo.btVector3(radiusTop, height / 2, radiusBottom));
    colShape.setLocalScaling(new Ammo.btVector3(1, 1, 1));
    // colShape.setMargin(0.01);

    let localInertia = new Ammo.btVector3(0, 0, 0); // Static object doesn't need inertia
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    body.setActivationState(STATE.DISABLE_DEACTIVATION); // Ensure the body stays active
    body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT); // Mark as kinematic

    // Add the body to the physics world
    dynamicsWorld.addRigidBody(body);

    // Link the physics body to the Three.js object
    glass.userData.physicsBody = body;
    rigidBodies.push(glass);
}

function createFinishLine(position, size) {
    // Default parameters for size and position
    const defaultPosition = { x: 0, y: 0.1, z: 10 };
    const defaultSize = { width: 2, height: 0.2, depth: 0.1 };

    // Use provided position and size, or defaults
    position = position || defaultPosition;
    size = size || defaultSize;

    // Create geometry and material for the finish line
    const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const material = new THREE.MeshStandardMaterial({
        color: 0x00ff00, // Green finish line
        emissive: 0x004400,
        metalness: 0.5,
        roughness: 0.3,
        side: THREE.DoubleSide,
    });

    // Create the mesh
    finishLine = new THREE.Mesh(geometry, material);

    // Position the finish line
    finishLine.position.set(position.x, position.y, position.z);

    // Add it to the scene
    scene.add(finishLine);

    // Ammo.js collision shape (optional)
    const mass = 0; // Static object
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
    transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1)); // No rotation

    let motionState = new Ammo.btDefaultMotionState(transform);

    // Create the collision shape for the finish line
    const colShape = new Ammo.btBoxShape(
        new Ammo.btVector3(size.width / 2, size.height / 2, size.depth / 2)
    );
    colShape.setMargin(0.01);

    let localInertia = new Ammo.btVector3(0, 0, 0); // No inertia for static objects
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    body.setActivationState(STATE.DISABLE_DEACTIVATION); // Ensure the body stays active
    body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT); // Kinematic object
    dynamicsWorld.addRigidBody(body);

    finishLine.userData.physicsBody = body;
    rigidBodies.push(finishLine);

    return finishLine;
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

    // Detect collision between ball and finish line
    let numManifolds = dynamicsWorld.getDispatcher().getNumManifolds();
    for (let i = 0; i < numManifolds; i++) {
        let manifold = dynamicsWorld.getDispatcher().getManifoldByIndexInternal(i);
        let body0 = Ammo.castObject(manifold.getBody0(), Ammo.btRigidBody);
        let body1 = Ammo.castObject(manifold.getBody1(), Ammo.btRigidBody);

        // Check if one of the bodies is the ball and the other is the finish line
        if (
            (body0 === finishLine.userData.physicsBody && body1 === ball.userData.physicsBody) ||
            (body1 === finishLine.userData.physicsBody && body0 === ball.userData.physicsBody)
        ) {
            // Get the closest contact point
            let numContacts = manifold.getNumContacts();
            for (let j = 0; j < numContacts; j++) {
                let pt = manifold.getContactPoint(j);

                // Check if the distance is within a small threshold
                if (pt.getDistance() <= 0.1) {
                    console.log("Ball touched the finish line!");
                    showEndScreen();
                    return; // Avoid multiple triggers in the same frame
                }
            }
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
            rotateDirection.x = -1;
            break;
        case 83: // S: TILT DOWN (Rotate around X-axis negatively)
            rotateDirection.x = 1;
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
    let rotationFactor = 0.01; // Adjust for desired speed
    let maxTiltAngle = Math.PI / 9; // Maximum tilt angle (30 degrees)

    // Compute rotation values
    let rotateX = rotateDirection.x * rotationFactor;
    let rotateY = rotateDirection.y * rotationFactor;
    let rotateZ = rotateDirection.z * rotationFactor;

    // Get current rotation as Euler angles for checking limits
    let currentRotation = new THREE.Euler().setFromQuaternion(maze.quaternion);

    // Get camera's local axes relative to the maze
    let cameraMatrix = new THREE.Matrix4();
    cameraMatrix.extractRotation(camera.matrixWorld);

    let cameraRight = new THREE.Vector3();
    let cameraUp = new THREE.Vector3();
    let cameraForward = new THREE.Vector3();

    cameraRight.setFromMatrixColumn(cameraMatrix, 0); // X axis
    cameraUp.setFromMatrixColumn(cameraMatrix, 1);   // Y axis
    cameraForward.setFromMatrixColumn(cameraMatrix, 2); // Z axis

    // Check and limit X-axis rotation
    if (currentRotation.x + rotateX > maxTiltAngle) {
        rotateX = maxTiltAngle - currentRotation.x;
    } else if (currentRotation.x + rotateX < -maxTiltAngle) {
        rotateX = -maxTiltAngle - currentRotation.x;
    }

    // Check and limit Z-axis rotation
    if (currentRotation.z + rotateZ > maxTiltAngle) {
        rotateZ = maxTiltAngle - currentRotation.z;
    } else if (currentRotation.z + rotateZ < -maxTiltAngle) {
        rotateZ = -maxTiltAngle - currentRotation.z;
    }

    // Create rotation quaternions based on camera orientation
    // let rotQuaternionX, rotQuaternionY, rotQuaternionZ;

    // // Adjust rotations based on camera orientation
    // if (rotateDirection.x !== 0) {
    //     // Tilt forwards/backwards relative to camera view
    //     rotQuaternionX = new THREE.Quaternion().setFromAxisAngle(cameraRight, rotateX);
    // } else {
    //     rotQuaternionX = new THREE.Quaternion();
    // }
    //
    // if (rotateDirection.y !== 0) {
    //     // Rotate around camera up axis
    //     rotQuaternionY = new THREE.Quaternion().setFromAxisAngle(cameraUp, rotateY);
    // } else {
    //     rotQuaternionY = new THREE.Quaternion();
    // }
    //
    // if (rotateDirection.z !== 0) {
    //     // Roll relative to camera forward axis
    //     rotQuaternionZ = new THREE.Quaternion().setFromAxisAngle(cameraForward, rotateZ);
    // } else {
    //     rotQuaternionZ = new THREE.Quaternion();
    // }

    // // Get current rotation as Euler angles for checking limits
    // let currentRotation = new THREE.Euler().setFromQuaternion(maze.quaternion);

    // Create quaternions for constrained rotations
    let rotQuaternionX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotateX);
    let rotQuaternionY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotateY);
    let rotQuaternionZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotateZ);

    // Combine the rotations
    let combinedRotation = new THREE.Quaternion().multiplyQuaternions(
        rotQuaternionZ,
        new THREE.Quaternion().multiplyQuaternions(rotQuaternionY, rotQuaternionX)
    );

    // // Apply rotation limits
    // let maxAngle = Math.PI / 9; // 20-degree limit
    // let rotationEuler = new THREE.Euler().setFromQuaternion(combinedRotation);

    // rotationEuler.x = Math.max(-maxAngle, Math.min(maxAngle, rotationEuler.x));
    // rotationEuler.z = Math.max(-maxAngle, Math.min(maxAngle, rotationEuler.z));

    // // Recreate quaternion with limited rotation
    // combinedRotation.setFromEuler(rotationEuler);

    // Apply the combined rotation to both maze and ground
    maze.quaternion.multiply(combinedRotation);
    ground.quaternion.copy(maze.quaternion);
    glass.quaternion.copy(maze.quaternion);
    finishLine.quaternion.copy(maze.quaternion);

    glass.position.y = -0.13;

    // Sync finish line rotation but preserve its position relative to the maze
    let finishLineOffset = new THREE.Vector3(0, -0.45, 4); // TEST FINISH (5)
    // let finishLineOffset = new THREE.Vector3(0.5, -0.45, -10.5); // REAL FINISH
    finishLineOffset.applyQuaternion(maze.quaternion); // Rotate the offset
    finishLine.position.copy(maze.position).add(finishLineOffset);
    finishLine.quaternion.copy(maze.quaternion);

    // Sync with Ammo.js
    maze.getWorldPosition(tmpPos);
    maze.getWorldQuaternion(tmpQuat);

    let physicsBodyGr = ground.userData.physicsBody;
    let physicsBodyM = maze.userData.physicsBody;
    let physicsBodyGlass = glass.userData.physicsBody;
    let physicsFinishLine = finishLine.userData.physicsBody;

    let msGr = physicsBodyGr.getMotionState();
    let msM = physicsBodyM.getMotionState();
    let msGlass = physicsBodyGlass.getMotionState();
    let msFinishLine = physicsFinishLine.getMotionState();
    if (msM && msGr && msGlass && msFinishLine) {
        ammoTmpPos.setValue(tmpPos.x, tmpPos.y, tmpPos.z);
        ammoTmpQuat.setValue(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w);

        tmpTrans.setIdentity();
        tmpTrans.setOrigin(ammoTmpPos);
        tmpTrans.setRotation(ammoTmpQuat);

        msM.setWorldTransform(tmpTrans);
        msGr.setWorldTransform(tmpTrans);
        msGlass.setWorldTransform(tmpTrans);
        msFinishLine.setWorldTransform(tmpTrans);

        // Additional position correction for glass
        let glassOrigin = tmpTrans.getOrigin();
        glassOrigin.setY(glassOrigin.y() - 0.13);
        tmpTrans.setOrigin(glassOrigin);
        msGlass.setWorldTransform(tmpTrans);

        // Update finish line transform with specific offset
        let finishLineTransform = new Ammo.btTransform();
        finishLineTransform.setIdentity();
        finishLineTransform.setOrigin(new Ammo.btVector3(
            finishLine.position.x,
            finishLine.position.y,
            finishLine.position.z
        ));
        finishLineTransform.setRotation(new Ammo.btQuaternion(
            tmpQuat.x,
            tmpQuat.y,
            tmpQuat.z,
            tmpQuat.w
        ));
        msFinishLine.setWorldTransform(finishLineTransform);
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

    updateCameraZoomLimits();
    controls.update()
}

function clearScene() {
    // Clear physics bodies
    // clearPhysicsWorld();

    if (scene != null) {
        scene.traverse((object) => {
            if (object.isMesh) {
                object.geometry.dispose(); // Dispose of geometry
                if (object.material.isMaterial) {
                    cleanMaterial(object.material);
                }
            }
        });
    }

    // Remove all children from the scene
    while (scene !=null && scene.children != null && scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }

    // Clear rigidBodies array
    rigidBodies = [];
}

function clearPhysicsWorld() {
    for (let i = 0; i < rigidBodies.length; i++) {
        let body = rigidBodies[i].userData.physicsBody;
        dynamicsWorld.removeRigidBody(body); // Remove from physics world
    }
}

function resetVariables() {
    maze = null;
    ground = null;

    if (dynamicsWorld != null) {
        // Remove all rigid bodies from the physics world
        for (let i = 0; i < rigidBodies.length; i++) {
            let body = rigidBodies[i].userData.physicsBody;
            if (body) {
                dynamicsWorld.removeRigidBody(body);
            }
        }

        // Clear the rigidBodies array
        rigidBodies = [];
    }
}

function updateCameraZoomLimits() {
    let maxZoomOut = 30; // Maximum distance
    let minZoomIn = 2; // Minimum distance
    let center = new THREE.Vector3(0, 0, 0); // Scene's center point

    let distance = camera.position.distanceTo(center); // Distance from camera to center

    // Clamp the camera distance
    if (distance > maxZoomOut) {
        camera.position.setLength(maxZoomOut); // Set max distance
    } else if (distance < minZoomIn) {
        camera.position.setLength(minZoomIn); // Set min distance
    }
}

// Event listener to hide the menu and start the game
document.getElementById('startButton').addEventListener('click', function () {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('menuButton').style.display = 'block';
    const timerDiv = document.getElementById('timer');
    if (timerDiv) {
        timerDiv.style.display = 'flex';
        timerDiv.style.backgroundColor = '#ffffff';
        timerDiv.style.color = '#000000';
    }

    clearScene(); // Clear the scene
    resetVariables(); // Reset variables

    // Call your existing initialization functions
    init()
    // initDebug()
    addObjects()
    setupEventHandlers()
    render()

    startTimer();
});

// Event listener to show controls
document.getElementById('controlsButton').addEventListener('click', function () {
    const controlsDiv = document.getElementById('controls');
    if (controlsDiv) {
        controlsDiv.style.display = 'flex';
    }
});

// Optionally, add a back button to return to the menu from controls
document.getElementById('backToMenuButton')?.addEventListener('click', function () {
    const controlsDiv = document.getElementById('controls');
    if (controlsDiv) {
        controlsDiv.style.display = 'none';
    }
});

document.getElementById('menuButton').addEventListener('click', function () {
    const menu = document.getElementById('menu');
    const menuButton = document.getElementById('menuButton');
    const timerDiv = document.getElementById('timer');
    if (timerDiv) {
        timerDiv.style.backgroundColor = '#000000';
        timerDiv.style.color = '#ffffff';
    }

    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'flex'; // Show the menu
        menuButton.style.display = 'none'; // Hide the "Menu" button
    }
});

function startTimer() {
    elapsedTime = 0; // Reset the timer
    const timerElement = document.getElementById('timer');

    // Update the timer every second
    timerInterval = setInterval(() => {
        elapsedTime++;
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;

        // Format time as MM:SS
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function showEndScreen() {
    const endScreen = document.getElementById('endScreen');
    const endText = document.getElementById('endText');
    // const winMessage = document.getElementById('winMessage');
    const timerElement = document.getElementById('timer');
    const timeElement = document.getElementById('time');

    // Retrieve the time from the timer and update the win message
    if (timerElement) {
        timeElement.textContent = `Your time: ${timerElement.textContent}`;
    }

    // Hide other UI elements
    document.getElementById('timer').style.display = 'none';
    document.getElementById('menuButton').style.display = 'none';

    // Show the end screen
    endScreen.style.display = 'flex';
    endText.style.display = 'flex';

    // Trigger firework
    if (!fireworkIsOn) {
        triggerFireworks();
    }

    fireworkIsOn = true;

    // Stop the timer
    stopTimer();
}

function createFirework(position) {
    const particleCount = 50;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    const colors = [];
    const color = new THREE.Color(`hsl(${Math.random() * 360}, 100%, 50%)`);
    const spawnAreaSize = 50;

    // Add randomness to the spawn position
    const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * spawnAreaSize,
        (Math.random() - 0.5) * spawnAreaSize,
        (Math.random() - 0.5) * spawnAreaSize
    );

    const spawnPosition = new THREE.Vector3().addVectors(new THREE.Vector3(0, 0, 0), randomOffset);

    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 2;
        const y = (Math.random() - 0.5) * 2;
        const z = (Math.random() - 0.5) * 2;
        const velocity = new THREE.Vector3(x, y, z).normalize().multiplyScalar(Math.random() * 5);

        positions.push(spawnPosition.x, spawnPosition.y, spawnPosition.z);
        velocities.push(velocity);
        colors.push(color.r, color.g, color.b);
    }

    particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions.flat(), 3));
    particlesGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors.flat(), 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.35,
        vertexColors: true,
        transparent: true,
        map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/circle.png'),
        opacity: 1,
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    fireworkScene.add(particles);

    const clock = new THREE.Clock();
    const duration = 2;

    function animateFirework() {
        const elapsedTime = clock.getElapsedTime();
        if (elapsedTime > duration) {
            fireworkScene.remove(particles);
            particlesGeometry.dispose();
            particlesMaterial.dispose();
            return;
        }

        const positionsArray = particlesGeometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            const index = i * 3;
            const velocity = velocities[i];
            positionsArray[index] += velocity.x * 0.1;
            positionsArray[index + 1] += velocity.y * 0.1;
            positionsArray[index + 2] += velocity.z * 0.1;
        }
        particlesGeometry.attributes.position.needsUpdate = true;

        requestAnimationFrame(animateFirework);
    }

    animateFirework();
}

async function triggerFireworks() {
    while (true) {
        const x = (Math.random() - 0.5) * 10; // Random X position
        const y = Math.random() * 3 + 1; // Random Y position
        const z = (Math.random() - 0.5) * 10; // Random Z position
        createFirework(new THREE.Vector3(x, y, z));
        await new Promise(r => setTimeout(r, 30));
    }
}
