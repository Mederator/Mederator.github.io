import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as threeToAmmo from "three-to-ammo"
import { TYPE } from "three-to-ammo";

// import {THREE} from './THREE.AmmoDebugDrawer.js'; // Import your custom class
// import {AmmoDebugDrawer, AmmoDebugConstants, DefaultBufferSize} from "ammo-debug-drawer"

const FLAGS = { CF_KINEMATIC_OBJECT: 2 }
const STATE = { DISABLE_DEACTIVATION : 4 }

let sizes, canvas, camera, scene, light1, light2, renderer, controls, loader,
    maze, ground, glass, ball, finishLine, fovReducer, gravityChanger, fireworkScene, tmpTrans,
    dynamicsWorld, timerInterval;

const clock = new THREE.Clock();
let tmpPos = new THREE.Vector3(), tmpQuat = new THREE.Quaternion();
let rotateDirection = { x: 0, y: 0, z: 0 };
let rigidBodies = [];
let fovReducers = [];
let gravityChangers = [];

let keyDownListener = null;
let keyUpListener = null;
let animationFrameId = null;
let ammoTmpPos = null;
let ammoTmpQuat = null;
let fireworkIsOn = false;
let lightReduced = false;
let gravityChanged = false;
let elapsedTime = 0;
let unstuckCounter = 0;

let debugDrawer;

const fireworkAudio = new Audio("../assets/firework.mp3");

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

// function initDebug() {
//     debugDrawer = new THREEx.AmmoDebugDrawer(scene, dynamicsWorld, {});
//     debugDrawer.enable()
// }

function init() {
    sizes = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    // Canvas
    canvas = document.querySelector('.webgl');

    // Camera
    camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(0, 1.5, 2);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas
    })
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio), 2);
    renderer.shadowMap.enabled = true;
    renderer.gammaOutput = true;
    document.body.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();

    // Light
    light1 = new THREE.SpotLight(0xffffff, 0.75)
    light1.angle = Math.PI / 2; // Very wide angle (90 degrees)
    light1.position.set(1, 10, 3);
    scene.add(light1);
    light2 = new THREE.SpotLight(0xffffff, 0.75)
    light2.angle = Math.PI / 2; // Very wide angle (90 degrees)
    light2.position.set(1, 10, -3);
    scene.add(light2);

    // Loader
    loader = new GLTFLoader();

    // Control
    controls = new OrbitControls(camera, renderer.domElement);

    // Separate renderer for the fireworks
    const fireworkCanvas = document.getElementById('fireworkCanvas');
    const fireworkRenderer = new THREE.WebGLRenderer({
        canvas: fireworkCanvas,
        alpha: true,
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
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    update();

    if (debugDrawer) {
        debugDrawer.update();
    }

    renderer.render(scene, camera);
    animationFrameId = requestAnimationFrame(render);
}

function addObjects() {
    createStars();
    createGround();
    createMaze();

    createFinishLine({ width: 1, height: 0.6, depth: 0.5 });
    // createFovReducer({ width: 0.6, height: 0.6, depth: 0.6 });
    // createGravityChanger({ width: 0.6, height: 0.6, depth: 0.6 });
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

function createGround() {
    loader.load('../models/ground.glb', function (glb) {
        let pos = { x: 0, y: 0, z: 0 };
        let scale = { x: 1, y: 1, z: 1 };
        let quat = { x: 0, y: 0, z: 0, w: 1 };
        let mass = 0;
        ground = glb.scene
        ground.scale.set(scale.x, scale.y, scale.z)
        ground.position.set(pos.x, pos.y, pos.z)
        ground.rotateOnAxis(new THREE.Vector3(0, 0, 0), Math.PI)
        scene.add(ground)

        // Ammojs Section
        let transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
        let motionState = new Ammo.btDefaultMotionState(transform);
        const shapeComponent = {
            el: { object3D: ground },
            data: {
                offset: new THREE.Vector3(0, -0.85, 0),
                // Collision shape type
                type: TYPE.HULL,
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
    },
    // function (xhr) {
    //     console.log((xhr.loaded/xhr.total * 100) + "% loaded");
    // },
    function (error) {
        console.log("An error occured" + error);
    })
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

        // Create the Glass and Ball after the maze has loaded
        createGlass();
        createBall();
        createBuffs();
        },
    // function (xhr) {
    //     console.log((xhr.loaded/xhr.total * 100) + "% loaded");
    // },
    function (error) {
        console.log("An error occured" + error);
    })
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
    }, 800);
}

function createGlass() {
    // Create the cylinder geometry
    const radiusTop = 10.3;
    const radiusBottom = 10.3;
    const height = 0.1;
    const radialSegments = 100;
    const cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);

    // Create a material
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xb5e0f5,
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.5,
        clearcoat: 1,
        clearcoatRoughness: 0,
        metalness: 0,
        reflectivity: 0,
        side: THREE.DoubleSide,
    });

    // Create the cylinder mesh
    glass = new THREE.Mesh(cylinderGeometry, glassMaterial);

    // Position the cylinder
    glass.position.set(0, -0.13, 0);
    scene.add(glass);

    // Ammo.js Section
    const pos = { x: 0, y: -0.13, z: 0 };
    const quat = { x: 0, y: 0, z: 0, w: 1 };
    const mass = 0;

    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    let motionState = new Ammo.btDefaultMotionState(transform);

    // Create a cylinder collision shape
    const colShape = new Ammo.btCylinderShape(new Ammo.btVector3(radiusTop, height / 2, radiusBottom));
    colShape.setLocalScaling(new Ammo.btVector3(1, 1, 1));

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    // Ensure the body stays active
    body.setActivationState(STATE.DISABLE_DEACTIVATION);
    body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT);

    // Add the body to the physics world
    dynamicsWorld.addRigidBody(body);

    // Link the physics body to the Three.js object
    glass.userData.physicsBody = body;
    rigidBodies.push(glass);
}

function createFinishLine(size) {
    // Default parameters for size and position
    const defaultPosition = { x: 0, y: 0.1, z: 10 };
    const defaultSize = { width: 2, height: 0.2, depth: 0.1 };

    // Use provided position and size, or defaults
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
    finishLine.position.set(defaultPosition.x, defaultPosition.y, defaultPosition.z);
    scene.add(finishLine);

    // Ammo.js collision shape
    const mass = 0;
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(defaultPosition.x, defaultPosition.y, defaultPosition.z));
    transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));

    let motionState = new Ammo.btDefaultMotionState(transform);

    // Create the collision shape for the finish line
    const colShape = new Ammo.btBoxShape(
        new Ammo.btVector3(size.width / 2, size.height / 2, size.depth / 2)
    );
    colShape.setMargin(0.01);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    // Ensure the body stays active
    body.setActivationState(STATE.DISABLE_DEACTIVATION);
    body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT);
    dynamicsWorld.addRigidBody(body);

    finishLine.userData.physicsBody = body;
    rigidBodies.push(finishLine);

    return finishLine;
}

// Function to create multiple indices
function createBuffs() {
    const size = { width: 0.6, height: 0.6, depth: 0.6 };

    // Create FOV Reducers
    const fovPositions = [
        { x: -2, y: -0.55, z: 3 },
        { x: 3, y: -0.55, z: 2 },
        { x: -1, y: -0.55, z: -4 }
    ];

    fovPositions.forEach(position => {
        const reducer = createFovReducer(size, position);
        fovReducers.push(reducer);
    });

    // Create Gravity Changers
    const gravityPositions = [
        { x: 0, y: -0.55, z: 1 },
        { x: 2, y: -0.55, z: -3 },
        { x: -3, y: -0.55, z: -2 }
    ];

    gravityPositions.forEach(position => {
        const changer = createGravityChanger(size, position);
        gravityChangers.push(changer);
    });
}

function createFovReducer(size, position) {
    const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const texture = new THREE.ImageUtils.loadTexture('../texture/fovReducerBox.jpg');
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.3,
        roughness: 0.5,
        side: THREE.DoubleSide,
    });

    const fovReducer = new THREE.Mesh(geometry, material);
    fovReducer.position.set(position.x, position.y, position.z);
    scene.add(fovReducer);

    // Set original offset relative to the maze
    fovReducer.userData.originalOffset = new THREE.Vector3().copy(fovReducer.position).sub(maze.position);

    // Ammo.js collision shape setup
    const mass = 0;
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
    transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));

    let motionState = new Ammo.btDefaultMotionState(transform);
    const colShape = new Ammo.btBoxShape(
        new Ammo.btVector3(size.width / 2, size.height / 2, size.depth / 2)
    );
    colShape.setMargin(0.01);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    body.setActivationState(STATE.DISABLE_DEACTIVATION);
    body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT | FLAGS.CF_NO_CONTACT_RESPONSE);
    dynamicsWorld.addRigidBody(body);

    fovReducer.userData.physicsBody = body;
    fovReducer.userData.active = true; // Add active state
    rigidBodies.push(fovReducer);

    return fovReducer;
}

// Similar modification for createGravityChanger
function createGravityChanger(size, position) {
    const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const texture = new THREE.ImageUtils.loadTexture('../texture/gravityChangerBox.jpg');
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.3,
        roughness: 0.5,
        side: THREE.DoubleSide,
    });

    const gravityChanger = new THREE.Mesh(geometry, material);
    gravityChanger.position.set(position.x, position.y, position.z);
    scene.add(gravityChanger);

    // Set original offset relative to the maze
    gravityChanger.userData.originalOffset = new THREE.Vector3().copy(gravityChanger.position).sub(maze.position);

    // Ammo.js collision shape setup
    const mass = 0;
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
    transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1));

    let motionState = new Ammo.btDefaultMotionState(transform);
    const colShape = new Ammo.btBoxShape(
        new Ammo.btVector3(size.width / 2, size.height / 2, size.depth / 2)
    );
    colShape.setMargin(0.01);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    body.setActivationState(STATE.DISABLE_DEACTIVATION);
    body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT | FLAGS.CF_NO_CONTACT_RESPONSE);
    dynamicsWorld.addRigidBody(body);

    gravityChanger.userData.physicsBody = body;
    gravityChanger.userData.active = true; // Add active state
    rigidBodies.push(gravityChanger);

    return gravityChanger;
}

function createFirework() {
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
    // console.log("data: ", data);
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
            rotateDirection.z = -1;
            break;
        case 68: // D: ROLL RIGHT (Rotate around Z-axis negatively)
            rotateDirection.z = 1;
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
    }
}

function rotateKinematic() {
    let rotationFactor = 0.01;

    // Compute rotation values
    let rotateX = rotateDirection.x * rotationFactor;
    let rotateY = rotateDirection.y * rotationFactor;
    let rotateZ = rotateDirection.z * rotationFactor;

    // Get current rotation as Euler angles for checking limits
    let currentRotation = new THREE.Euler().setFromQuaternion(maze.quaternion);

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    // Get the camera's right and up directions
    const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const cameraRight = new THREE.Vector3().crossVectors(cameraUp, cameraDirection).normalize();

    // Create quaternions for constrained rotations
    const rotQuaternionX = new THREE.Quaternion().setFromAxisAngle(cameraRight, rotateX); // Tilt (X-axis)
    const rotQuaternionZ = new THREE.Quaternion().setFromAxisAngle(cameraDirection, rotateZ); // Roll (Z-axis)

    let rotQuaternionY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotateY);

    // Combine the rotations
    let combinedRotation = new THREE.Quaternion().multiplyQuaternions(
        rotQuaternionZ,
        new THREE.Quaternion().multiplyQuaternions(rotQuaternionY, rotQuaternionX)
    );

    if (Math.abs(currentRotation.x + combinedRotation.x) >= 0.5 ||
        Math.abs(currentRotation.z + combinedRotation.z) >= 0.5)
    {
     if(combinedRotation.x !== 0 || combinedRotation.z !== 0){
         unstuckCounter++;
     }
     if (unstuckCounter > 200){
         if (currentRotation.x + combinedRotation.x < -0.5) {
             combinedRotation.x = 0.01;
         } else if (currentRotation.x + combinedRotation.x > 0.5) {
             combinedRotation.x = -0.01;
         }

         // Adjust `combinedRotation.z`
         if (currentRotation.z + combinedRotation.z < -0.5) {
             combinedRotation.z = 0.01;
         } else if (currentRotation.z + combinedRotation.z > 0.5) {
             combinedRotation.z = -0.01;
         }
         // console.log("Unstucking maze")
         unstuckCounter = 0
     }else {
         return
     }
    }
    // console.log(`rotation: ${combinedRotation.x}, ${combinedRotation.y}, ${combinedRotation.z}`)

    maze.quaternion.multiply(combinedRotation);
    ground.quaternion.copy(maze.quaternion);
    glass.quaternion.copy(maze.quaternion);
    finishLine.quaternion.copy(maze.quaternion);
    // fovReducer.quaternion.copy(maze.quaternion);

    glass.position.y = -0.13;

    // Sync finish line rotation but preserve its position relative to the maze
    let finishLineOffset = new THREE.Vector3(0, -0.55, 5); // TEST FINISH
    // let finishLineOffset = new THREE.Vector3(0.7, -0.55, -10.5); // REAL FINISH
    finishLineOffset.applyQuaternion(maze.quaternion); // Rotate the offset
    finishLine.position.copy(maze.position).add(finishLineOffset);
    finishLine.quaternion.copy(maze.quaternion);

    // Rotate and position all FOV reducers
    fovReducers.forEach((fovReducer) => {
        if (fovReducer.userData.active) {
            const originalOffset = fovReducer.userData.originalOffset.clone();
            const rotatedOffset = originalOffset.clone().applyQuaternion(maze.quaternion);
            fovReducer.position.copy(maze.position).add(rotatedOffset);
            fovReducer.quaternion.copy(maze.quaternion);
        }
    });

    // Rotate and position all gravity changers
    gravityChangers.forEach((gravityChanger) => {
        if (gravityChanger.userData.active) {
            const originalOffset = gravityChanger.userData.originalOffset.clone();
            const rotatedOffset = originalOffset.clone().applyQuaternion(maze.quaternion);
            gravityChanger.position.copy(maze.position).add(rotatedOffset);
            gravityChanger.quaternion.copy(maze.quaternion);
        }
    });

    // Sync with Ammo.js
    maze.getWorldPosition(tmpPos);
    maze.getWorldQuaternion(tmpQuat);

    let physicsBodyGr = ground.userData.physicsBody;
    let physicsBodyM = maze.userData.physicsBody;
    let physicsBodyGlass = glass.userData.physicsBody;
    let physicsFinishLine = finishLine.userData.physicsBody;
    // let physicsFovReducer = fovReducer.userData.physicsBody;
    // let physicsGravityChanger = gravityChanger.userData.physicsBody;

    let msGr = physicsBodyGr.getMotionState();
    let msM = physicsBodyM.getMotionState();
    let msGlass = physicsBodyGlass.getMotionState();
    let msFinishLine = physicsFinishLine.getMotionState();
    // let msFovReducer = physicsFovReducer.getMotionState();
    // let msGravityChanger = physicsGravityChanger.getMotionState();
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
        // msFovReducer.setWorldTransform(tmpTrans);
        // msGravityChanger.setWorldTransform(tmpTrans);

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

        fovReducers.forEach((fovReducer) => {
            const body = fovReducer.userData.physicsBody;
            if (body) {
                let transform = new Ammo.btTransform();
                transform.setIdentity();
                transform.setOrigin(new Ammo.btVector3(fovReducer.position.x, fovReducer.position.y, fovReducer.position.z));
                transform.setRotation(new Ammo.btQuaternion(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w));
                body.getMotionState().setWorldTransform(transform);
            }
        });

        gravityChangers.forEach((gravityChanger) => {
            const body = gravityChanger.userData.physicsBody;
            if (body) {
                let transform = new Ammo.btTransform();
                transform.setIdentity();
                transform.setOrigin(new Ammo.btVector3(gravityChanger.position.x, gravityChanger.position.y, gravityChanger.position.z));
                transform.setRotation(new Ammo.btQuaternion(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w));
                body.getMotionState().setWorldTransform(transform);
            }
        });
    }
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

        if (finishLine && ball) {
            // Check if one of the bodies is the ball and the other the finish line
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
                        // console.log("Ball touched the finish line!");
                        showEndScreen();
                        return;
                    }
                }
            }

            // Check if one of the bodies is the ball and the other the FOV Reducer
            for (let fovReducer of fovReducers) {
                if (fovReducer.userData.active &&
                    ((body0 === fovReducer.userData.physicsBody && body1 === ball.userData.physicsBody) ||
                     (body1 === fovReducer.userData.physicsBody && body0 === ball.userData.physicsBody))) {

                    let numContacts = manifold.getNumContacts();
                    for (let j = 0; j < numContacts; j++) {
                        let pt = manifold.getContactPoint(j);
                        if (pt.getDistance() <= 0.1) {
                            handleFovReducerCollision(fovReducer);
                            break;
                        }
                    }
                }
            }

            for (let gravityChanger of gravityChangers) {
                if (gravityChanger.userData.active &&
                    ((body0 === gravityChanger.userData.physicsBody && body1 === ball.userData.physicsBody) ||
                     (body1 === gravityChanger.userData.physicsBody && body0 === ball.userData.physicsBody))) {

                    let numContacts = manifold.getNumContacts();
                    for (let j = 0; j < numContacts; j++) {
                        let pt = manifold.getContactPoint(j);
                        if (pt.getDistance() <= 0.1) {
                            handleGravityChangerCollision(gravityChanger);
                            break;
                        }
                    }
                }
            }
        }
    }
}

// Helper functions to handle collisions
function handleFovReducerCollision(fovReducer) {
    if (!fovReducer.userData.active) return;
    const audio = new Audio("../assets/fovReducer.mp3");
    audio.play();

    fovReducer.userData.active = false;
    scene.remove(fovReducer);
    dynamicsWorld.removeRigidBody(fovReducer.userData.physicsBody);

    // Apply FOV reduction effect
    const originalLight1Angle = light1.angle;
    const originalLight1Penumbra = light1.penumbra;
    const originalLight1Intensity = light1.intensity;
    const originalLight1Target = light1.target;
    const originalLight2Intensity = light2.intensity;

    lightReduced = true;
    light1.angle = Math.PI / 12;
    light1.target = ball;
    light1.penumbra = 0.8;
    light1.intensity = 0.9;
    light2.intensity = 0.0;

    setTimeout(() => {
        if (lightReduced && !fireworkIsOn) {
            audio.play();
            if (lightReduced) {
                light1.angle = originalLight1Angle;
                light1.penumbra = originalLight1Penumbra;
                light1.intensity = originalLight1Intensity;
                light1.target = originalLight1Target;
                light2.intensity = originalLight2Intensity;
            }
            lightReduced = false;
        }
    }, 8000);
}

function handleGravityChangerCollision(gravityChanger) {
    if (!gravityChanger.userData.active) return;
    const audio = new Audio("../assets/gravityChanger.mp3");
    audio.play();

    gravityChanger.userData.active = false;
    scene.remove(gravityChanger);
    dynamicsWorld.removeRigidBody(gravityChanger.userData.physicsBody);

    // Apply gravity change effect
    const originalGravity = dynamicsWorld.getGravity();
    gravityChanged = true;
    dynamicsWorld.setGravity(new Ammo.btVector3(0, 10, 0));

    setTimeout(() => {
        if (gravityChanged && !fireworkIsOn) {
            audio.play();
            if (gravityChanged) {
                dynamicsWorld.setGravity(originalGravity);
            }
            gravityChanged = false;
        }
    }, 8000);
}

function update() {
    var delta = clock.getDelta()
    if (maze && ground)
        rotateKinematic()

    // Update physics world
    updatePhysics(delta);

    // fovReducer.rotation.y += 0.02

    updateCameraZoomLimits();
    controls.update()
}

function clearScene() {
    if (scene) {
        // Traverse and dispose of all objects in the scene
        scene.traverse((object) => {
            if (object.isMesh) {
                // Dispose of geometry
                if (object.geometry) {
                    object.geometry.dispose();
                }
                // Dispose of material
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((mat) => {
                            mat.dispose();
                        });
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });

        // Remove all children from the scene
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }
}

function resetVariables() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Remove event listeners
    if (keyDownListener) {
        window.removeEventListener('keydown', keyDownListener);
        keyDownListener = null;
    }
    if (keyUpListener) {
        window.removeEventListener('keyup', keyUpListener);
        keyUpListener = null;
    }

    maze = null;
    ground = null;
    ball = null;
    finishLine = null;
    fovReducer = null;
    gravityChanger = null;

    if (dynamicsWorld) {
        // Remove all rigid bodies from the Ammo.js physics world
        for (let i = 0; i < rigidBodies.length; i++) {
            const body = rigidBodies[i].userData.physicsBody;
            if (body) {
                // Remove the rigid body from the dynamics world
                dynamicsWorld.removeRigidBody(body);

                // Clean up Ammo.js resources
                if (body.getMotionState()) {
                    Ammo.destroy(body.getMotionState());
                }

                // Get and destroy the collision shape
                const collisionShape = body.getCollisionShape();
                if (collisionShape) {
                    Ammo.destroy(collisionShape);
                }

                // Destroy the rigid body itself
                Ammo.destroy(body);
            }
        }

        // Clean up the dynamics world
        Ammo.destroy(dynamicsWorld);

        // Recreate physics world
        setupPhysics();
    }

    // Clear rigidBodies array
    rigidBodies = [];
    fovReducers = [];
    gravityChangers = [];

    // Reset other global variables
    rotateDirection = { x: 0, y: 0, z: 0 };
    unstuckCounter = 0;
    fireworkIsOn = false;
    lightReduced = false;
    gravityChanged = false;
}

function updateCameraZoomLimits() {
    let maxZoomOut = 30;
    let minZoomIn = 2;
    // Scene's center point
    let center = new THREE.Vector3(0, 0, 0);

    // Distance from camera to center
    let distance = camera.position.distanceTo(center);

    // Clamp the camera distance
    if (distance > maxZoomOut) {
        camera.position.setLength(maxZoomOut);
    } else if (distance < minZoomIn) {
        camera.position.setLength(minZoomIn);
    }
}

function startTimer() {
    elapsedTime = 0;
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
        fireworkIsOn = true;

        triggerFireworks();
    }

    // Stop the timer
    stopTimer();
}

async function triggerFireworks() {
    while (fireworkIsOn) {
        if (!fireworkAudio.isPlaying)
            fireworkAudio.play();

        createFirework();
        await new Promise(r => setTimeout(r, 30));
    }
}

function startNewGame() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('menuButton').style.display = 'block';
    const timerDiv = document.getElementById('timer');
    if (timerDiv) {
        timerDiv.style.display = 'flex';
        timerDiv.style.backgroundColor = '#ffffff';
        timerDiv.style.color = '#000000';
    }
    stopTimer();
    const timerElement = document.getElementById('timer');
    timerElement.textContent = `${String(0).padStart(2, '0')}:${String(0).padStart(2, '0')}`;

    fireworkAudio.pause();

    clearScene();
    resetVariables();

    init()
    // initDebug()
    addObjects()
    setupEventHandlers()
    render()

    startTimer();
}

function setupEventHandlers(){
    // Remove existing event listeners if they exist
    if (keyDownListener) {
        window.removeEventListener('keydown', keyDownListener);
    }
    if (keyUpListener) {
        window.removeEventListener('keyup', keyUpListener);
    }

    // Store the new event listeners
    keyDownListener = handleKeyDown;
    keyUpListener = handleKeyUp;

    // Add the new event listeners
    window.addEventListener('keydown', keyDownListener, false);
    window.addEventListener('keyup', keyUpListener, false);
}

document.getElementById('startButton').addEventListener('click', function () {
    startNewGame();
});

// Event listener for the end screen "Start a New Game" button
document.getElementById('endStartButton').addEventListener('click', function () {
    const endScreen = document.getElementById('endScreen');
    const endText = document.getElementById('endText');
    endScreen.style.display = 'none';
    endText.style.display = 'none';

    startNewGame();
});

document.getElementById('continueButton').addEventListener('click', function () {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('menuButton').style.display = 'block';
    const timerDiv = document.getElementById('timer');
    if (timerDiv) {
        timerDiv.style.display = 'flex';
        timerDiv.style.backgroundColor = '#ffffff';
        timerDiv.style.color = '#000000';
    }
});

// Event listener to show controls
document.getElementById('controlsButton').addEventListener('click', function () {
    const controlsDiv = document.getElementById('controls');
    if (controlsDiv) {
        controlsDiv.style.display = 'flex';
    }
});

// Back button to return to the menu from controls
document.getElementById('backToMenuButton')?.addEventListener('click', function () {
    const controlsDiv = document.getElementById('controls');
    if (controlsDiv) {
        controlsDiv.style.display = 'none';
    }
});

document.getElementById('menuButton').addEventListener('click', function () {
    document.getElementById('continueButton').style.display = 'block';
    const menu = document.getElementById('menu');
    const menuButton = document.getElementById('menuButton');
    const timerDiv = document.getElementById('timer');
    if (timerDiv) {
        timerDiv.style.backgroundColor = '#000000';
        timerDiv.style.color = '#ffffff';
    }

    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'flex';
        menuButton.style.display = 'none';
    }
});
