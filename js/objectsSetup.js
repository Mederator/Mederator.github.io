/*
  TiltQuest
  Authors: Gabriel Meder and Kristián Zsigó
  Date: 2024-2025
  Version: 1.1
  Description: TiltQuest game, where the player navigates a ball through a maze by tilting it.
*/

import * as threeToAmmo from "three-to-ammo";
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {setupAmmoObject, setupObjectPhysics} from "./utilities.js";
import {createFovReducer, createGravityChanger} from "./buffsLogic.js";

let loader = new GLTFLoader();

export function createModel(path, shapeComponentType) {
    return new Promise((resolve, reject) => {
        loader.load(
            path,
            function (glb) {
                let pos = {x: 0, y: 0, z: 0};
                let scale = {x: 1, y: 1, z: 1};
                let quat = {x: 0, y: 0, z: 0, w: 1};
                let mass = 0;

                const model = glb.scene;
                model.scale.set(scale.x, scale.y, scale.z);
                model.position.set(pos.x, pos.y, pos.z);
                model.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                scene.add(model);

                // Ammo.js Section

                let motionState = setupAmmoObject(pos, quat);

                const shapeComponent = {
                    el: {object3D: model},
                    data: {
                        offset: new THREE.Vector3(0, -0.85, 0),
                        type: shapeComponentType, // Pass the type dynamically
                    },
                };

                let colShapes = _createCollisionShape(shapeComponent);
                let compoundShape = new Ammo.btCompoundShape();

                // Combine all collision shapes
                colShapes.forEach((shape) => {
                    compoundShape.addChildShape(shape.localTransform, shape);
                });

                let localInertia = new Ammo.btVector3(0, 0, 0);
                compoundShape.calculateLocalInertia(mass, localInertia);

                let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, compoundShape, localInertia);
                let body = new Ammo.btRigidBody(rbInfo);

                body.setActivationState(STATE.DISABLE_DEACTIVATION);
                body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT);
                dynamicsWorld.addRigidBody(body);

                model.userData.physicsBody = body;
                rigidBodies.push(model);

                // Resolve the promise with the loaded model
                resolve(model);
            },
            undefined,
            function (error) {
                console.error("An error occurred:", error);
                reject(error);
            }
        );
    });
}

export function createFinishLine(size) {
    // Default parameters for size and position
    const defaultPosition = {x: 0, y: 0.1, z: 10};
    let quat = {x: 0, y: 0, z: 0, w: 1};

    const defaultSize = {width: 2, height: 0.2, depth: 0.1};

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
    finishLine.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
            child.visible = false;
        }
    })
    scene.add(finishLine);


    // Ammo.js collision shape
    const mass = 0;

    let motionState = setupAmmoObject(defaultPosition, quat)

    // Create the collision shape for the finish line
    const colShape = new Ammo.btBoxShape(
        new Ammo.btVector3(size.width / 2, size.height / 2, size.depth / 2)
    );
    colShape.setMargin(0.01);

    let body = setupObjectPhysics(colShape, mass, motionState);

    finishLine.userData.physicsBody = body;
    rigidBodies.push(finishLine);

    return finishLine;
}



export function createBall() {
    const radius = 0.2;
    let pos = {x: 0, y: -0.5, z: 0};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 1;

    let ball = new THREE.Mesh(new THREE.SphereBufferGeometry(radius, 20, 10), new THREE.MeshPhongMaterial({
        color: 0x1118d6,
        receiveShadow: true,
        castShadow: true
    }));
    ball.position.set(pos.x, pos.y, pos.z);
    ball.castShadow = true;
    ball.receiveShadow = true;

    scene.add(ball);

    //Ammojs Section
    let motionState = setupAmmoObject(pos, quat);

    let colShape = new Ammo.btSphereShape(radius);
    colShape.setMargin(0.01);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);
    body.setDamping(0.5, 0.5);

    dynamicsWorld.addRigidBody(body);

    ball.userData.physicsBody = body;
    rigidBodies.push(ball);
    return ball
}

export function createStars() {
    var stars = new Array(0);
    for (var i = 0; i < 15000; i++) {
        let x = 10 + THREE.Math.randFloatSpread(500);
        let y = 10 + THREE.Math.randFloatSpread(500);
        let z = 10 + THREE.Math.randFloatSpread(500);
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
    var starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
}

export function createBuffs() {
    const size = {width: 0.6, height: 0.6, depth: 0.6};

    // Create FOV Reducers
    const fovPositions = [
        {x: -2, y: -0.55, z: 3},
        {x: 3, y: -0.55, z: 2},
        {x: -1, y: -0.55, z: -4},
        {x: -5.5, y: -0.55, z: 4},
        {x: 6.5, y: -0.55, z: 2},
        {x: -6, y: -0.55, z: -2}
    ];

    fovPositions.forEach(position => {
        const reducer = createFovReducer(size, position);
        fovReducers.push(reducer);
    });

    // Create Gravity Changers
    const gravityPositions = [
        {x: 0, y: -0.55, z: 1},
        {x: 2, y: -0.55, z: -3},
        {x: -3, y: -0.55, z: -2},
        {x: 7, y: -0.55, z: 6.5},
        {x: -6, y: -0.55, z: -5.5},
        {x: 1, y: -0.55, z: -8.5}
    ];

    gravityPositions.forEach(position => {
        const changer = createGravityChanger(size, position);
        gravityChangers.push(changer);
    });
}

export function createOrbits(planetObjects) {
    const orbitColors = [0xff1100, 0x2600ff, 0x04ff00];

    for (let i = 4.5; i <= 6.5; i++) {
        const radius = i * 3.5;
        const curve = new THREE.EllipseCurve(
            0, 0,              // Center of the ellipse
            radius, radius,    // X and Y radii
            0, 2 * Math.PI,    // Start and end angles
            false              // Clockwise
        );
        const points = curve.getPoints(100);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({color: orbitColors[i - 4.5]});
        const orbitLine = new THREE.Line(geometry, material);

        // Rotate orbit to horizontal plane
        orbitLine.rotation.x = Math.PI / 2;
        scene.add(orbitLine);

        // orbits.push(curve);
        // orbitLines.push(orbitLine);


        const planet = generateRandomPlanet()

        planet.userData.curve = curve; // Assign curve to planet
        planet.userData.offset = Math.random(); // Start at a random position on the orbit
        scene.add(planet);
        planetObjects.push(planet);
    }
}

export function createArrow() {
    return new Promise((resolve, reject) => {
        loader.load('../models/arrow.glb', function (glb) {
                let pos = {x: 0, y: 0, z: 0};
                let scale = {x: 1, y: 1, z: 1};
                arrow = glb.scene
                arrow.scale.set(scale.x, scale.y, scale.z)
                arrow.position.set(pos.x, pos.y, pos.z)
                arrow.rotateOnAxis(new THREE.Vector3(0, 0, 0), Math.PI)
                arrow.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                })
                scene.add(arrow)
                if (glb.animations && glb.animations.length > 0) {
                    console.log("animating")
                    // Create an AnimationMixer
                    const mixer = new THREE.AnimationMixer(arrow);

                    // Get the first animation clip and play it
                    const clip = glb.animations[0]; // Or select another animation if needed
                    const action = mixer.clipAction(clip);

                    // Enable looping
                    action.setLoop(THREE.LoopPingPong);
                    action.play();

                    // Store the mixer to update it later in your animation loop
                    arrow.userData.mixer = mixer;
                }
                resolve(arrow);
            },
            undefined,
            function (error) {
                console.log("An error occured" + error);
            })
    });
}

function generateRandomPlanet() {
    // Randomize planet radius
    const radius = Math.random() * 1.4 + 0.4; // Random radius between 1 and 3
    const shaderScale = Math.random() * 1 + 0.1; // Random noise scale (1 to 4)
    // const shaderScale = 4.01 // Random noise scale (1 to 4)
    const baseColor = new THREE.Color(Math.random(), Math.random(), Math.random()); // Random base color

    const material = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vPos;
            
            void main() {
                vPos = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vPos;
            ${noise} // Simplex noise function

            void main() {
                float noise = cnoise(normalize(vPos) * vec3(1, 5., 1.) * ${shaderScale}); // Apply fixed scale
                float r = max(0.0, noise);
                float b = max(0.0, -noise);

                vec3 randomColor = vec3(${baseColor.r}, ${baseColor.g}, ${baseColor.b});
                vec4 diffuseColor = vec4(mix(randomColor, vec3(r, 0, b), 0.5), 1.0); // Blend noise and color

                gl_FragColor = diffuseColor;
            }
        `
    });


    // Create the planet mesh
    return new THREE.Mesh(
        new THREE.IcosahedronGeometry(radius, 10), // Randomized radius
        material // Unique material for each planet
    );

}

export function createGlass(scene, dynamicsWorld, rigidBodies) {
    // Create the cylinder geometry
    const radiusTop = 10.3;
    const radiusBottom = 10.3;
    const height = 0.1;
    const radialSegments = 100;
    const cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);

    // Create a material
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        metalness: .9,
        roughness: .05,
        envMapIntensity: 0.9,
        clearcoat: 1,
        transparent: true,
        opacity: .5,
        reflectivity: 0.2,
        refractionRatio: 0.985,
        ior: 0.9,
        side: THREE.DoubleSide,

    });
    // Create the cylinder mesh
    let glass = new THREE.Mesh(cylinderGeometry, glassMaterial);

    // Position the cylinder
    glass.position.set(0, -0.13, 0);
    scene.add(glass);

    // Ammo.js Section
    const pos = {x: 0, y: -0.13, z: 0};
    const quat = {x: 0, y: 0, z: 0, w: 1};
    const mass = 0;


    let motionState = setupAmmoObject(pos, quat);

    // Create a cylinder collision shape
    const colShape = new Ammo.btCylinderShape(new Ammo.btVector3(radiusTop, height / 2, radiusBottom));
    colShape.setLocalScaling(new Ammo.btVector3(1, 1, 1));

    let body = setupObjectPhysics(colShape, mass, motionState)

    // Link the physics body to the Three.js object
    glass.userData.physicsBody = body;
    rigidBodies.push(glass);
    return glass
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
