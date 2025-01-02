/*
  TiltQuest
  Authors: Gabriel Meder and Kristián Zsigó
  Date: 2024-2025
  Version: 1.1
  Description: TiltQuest game, where the player navigates a ball through a maze by tilting it.
*/

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {TYPE} from "three-to-ammo"
import {setupEventListeners} from "./setupUi.js";
import {
    createGlass,
    createModel,
    createOrbits,
    createStars,
    createBall,
    createBuffs,
    createArrow, createFinishLine
} from "./objectsSetup.js";
import {handleBuffCollision, handleFovReducerCollision, handleGravityChangerCollision} from "./buffsLogic.js";
import {clearScene} from "./utilities.js";

const clock = new THREE.Clock();
let tmpPos = new THREE.Vector3(), tmpQuat = new THREE.Quaternion();
let rotateDirection = {x: 0, y: 0, z: 0};

let keyDownListener = null;
let keyUpListener = null;
let animationFrameId = null;
let ammoTmpPos = null;
let ammoTmpQuat = null;
let elapsedTime = 0;
let unstuckCounter = 0;
const planetObjects = [];

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
    renderer.toneMapping = THREE.NoToneMapping; // Optional if shadow detail needs to be checked
    renderer.autoClear = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.gammaOutput = true;
    document.body.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();

    // Light
    light1 = new THREE.SpotLight(0xffffff, 2)
    light1.angle = Math.PI / 4; // Very wide angle (90 degrees)
    light1.position.set(0, 15, 0);
    light1.castShadow = true;
    light1.shadow.bias = -0.000001; // Adjust this value as needed
    light1.shadow.mapSize.width = 2048;
    light1.shadow.mapSize.height = 2048;
    light1.shadow.camera.near = 0.1;
    light1.shadow.camera.far = 100;
    scene.add(light1);


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
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.style.display = 'flex';
    createStars();
    createModel( '../models/ground.glb', TYPE.HULL)
        .then((model) => {
            ground = model
        })
        .catch((error) => {
            console.error("Error loading model:", error);
        });
    createModel('../models/maze-circular.glb', TYPE.HACD)
        .then((model) => {
            maze = model
            glass = createGlass(scene, dynamicsWorld, rigidBodies);
            console.log(glass)
            setTimeout(() => {
                ball = createBall();
            }, 800);
            createBuffs();
            createOrbits(planetObjects);
            createArrow().then((model) => {
                arrow = model
            })
            loadingScreen.style.display = 'none';
        })
        .catch((error) => {
            console.error("Error loading model:", error);
        });
    createFinishLine({width: 1, height: 0.6, depth: 0.5});
}



function animatePlanets() {
    const time = Date.now() * 0.001;
    planetObjects.forEach((planet, index) => {
        const curve = planet.userData.curve;
        const speed = 0.05 + index * 0.02; // Different speeds for each orbit
        const t = (planet.userData.offset + time * speed) % 1; // Keep within 0-1
        const point = curve.getPointAt(t);

        // Set planet position (account for orbit rotation)
        planet.position.set(point.x, 0, point.y);
    });

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


function handleKeyDown(event) {
    let keyCode = event.keyCode;

    switch (keyCode) {
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

function handleKeyUp(event) {
    let keyCode = event.keyCode;

    switch (keyCode) {
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
    let rotationFactor = 0.005;

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
        Math.abs(currentRotation.z + combinedRotation.z) >= 0.5) {
        if (combinedRotation.x !== 0 || combinedRotation.z !== 0) {
            unstuckCounter++;
        }
        if (unstuckCounter > 200) {
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
        } else {
            return
        }
    }

    const objectsToSync = [ground, glass, finishLine, arrow];
    maze.quaternion.multiply(combinedRotation);
    objectsToSync.forEach(obj => obj.quaternion.copy(maze.quaternion));
    // fovReducer.quaternion.copy(maze.quaternion);

    glass.position.y = -0.13;

    // Sync finish line rotation but preserve its position relative to the maze
    // let finishLineOffset = new THREE.Vector3(0, -0.55, 5); // TEST FINISH
    let finishLineOffset = new THREE.Vector3(0.7, -0.55, -10.5); // REAL FINISH
    finishLineOffset.applyQuaternion(maze.quaternion); // Rotate the offset
    finishLine.position.copy(maze.position).add(finishLineOffset);
    finishLine.quaternion.copy(maze.quaternion);

    updateBuffsRotation(fovReducers, maze);
    updateBuffsRotation(gravityChangers, maze);

    // Sync with Ammo.js
    maze.getWorldPosition(tmpPos);
    maze.getWorldQuaternion(tmpQuat);

    let physicsBodyGr = ground.userData.physicsBody;
    let physicsBodyM = maze.userData.physicsBody;
    let physicsBodyGlass = glass.userData.physicsBody;
    let physicsFinishLine = finishLine.userData.physicsBody;
    // let physicsFovReducer = fovReducer.userData.physicsBody;
    // let physicsGravityChanger = gravityChanger.userData.physicsBody;


    const motionStates = [
        physicsBodyGr.getMotionState(),
        physicsBodyM.getMotionState(),
        physicsBodyGlass.getMotionState(),
        physicsFinishLine.getMotionState(),
    ];


    let msGlass = physicsBodyGlass.getMotionState();
    let msFinishLine = physicsFinishLine.getMotionState();
    // let msFovReducer = physicsFovReducer.getMotionState();
    // let msGravityChanger = physicsGravityChanger.getMotionState();
    if (motionStates.every((ms) => ms)) {
        ammoTmpPos.setValue(tmpPos.x, tmpPos.y, tmpPos.z);
        ammoTmpQuat.setValue(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w);

        tmpTrans.setIdentity();
        tmpTrans.setOrigin(ammoTmpPos);
        tmpTrans.setRotation(ammoTmpQuat);

        motionStates.forEach((ms) => ms.setWorldTransform(tmpTrans));
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


        updateBuffsPhysics(fovReducers)
        updateBuffsPhysics(gravityChangers)

    }
}


function updateBuffsPhysics(objects) {
    objects.forEach((buff) => {
        const body = buff.userData.physicsBody;
        if (body) {
            let transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(buff.position.x, buff.position.y, buff.position.z));
            transform.setRotation(new Ammo.btQuaternion(tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w));
            body.getMotionState().setWorldTransform(transform);
        }
    });

}


function updateBuffsRotation(objects, maze) {
    objects.forEach((obj) => {
        if (obj.userData.active) {
            const originalOffset = obj.userData.originalOffset.clone();
            const rotatedOffset = originalOffset.applyQuaternion(maze.quaternion);
            obj.position.copy(maze.position).add(rotatedOffset);
            obj.quaternion.copy(maze.quaternion);
        }
    });
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
            handleBuffCollision(fovReducers, handleFovReducerCollision, body0, body1, manifold);
            handleBuffCollision(gravityChangers, handleGravityChangerCollision, body0, body1, manifold);
        }
    }
}

function update() {
    var delta = clock.getDelta()
    if (maze && ground)
        rotateKinematic()

    // Update physics world
    updatePhysics(delta);
    animatePlanets();
    if (arrow && arrow.userData.mixer) {
        arrow.userData.mixer.update(delta);
    }


    // fovReducer.rotation.y += 0.02

    updateCameraZoomLimits();
    controls.update()
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
    rotateDirection = {x: 0, y: 0, z: 0};
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

function setupEventHandlers() {
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

setupEventListeners(startNewGame);
