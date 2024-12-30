import {setupAmmoObject, setupObjectPhysics} from "./utilities.js";

export function createFovReducer(size, position) {
    let quat = {x: 0, y: 0, z: 0, w: 1};
    const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const texture = new THREE.ImageUtils.loadTexture('../texture/fovReducerBox.jpg');
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.3,
        roughness: 0.5,
        color: 0x7dffa0,
        side: THREE.DoubleSide,
    });

    const fovReducer = new THREE.Mesh(geometry, material);
    fovReducer.receiveShadow = true
    fovReducer.castShadow = true
    fovReducer.position.set(position.x, position.y, position.z);
    scene.add(fovReducer);

    // Set original offset relative to the maze
    fovReducer.userData.originalOffset = new THREE.Vector3().copy(fovReducer.position).sub(maze.position);

    // Ammo.js collision shape setup
    const mass = 0;

    let motionState = setupAmmoObject(position, quat)

    // Create the collision shape for the finish line
    const colShape = new Ammo.btBoxShape(
        new Ammo.btVector3(size.width / 2, size.height / 2, size.depth / 2)
    );
    colShape.setMargin(0.01);

    let body = setupObjectPhysics(colShape, mass, motionState);

    fovReducer.userData.physicsBody = body;
    fovReducer.userData.active = true; // Add active state
    rigidBodies.push(fovReducer);

    return fovReducer;
}

export function createGravityChanger(size, position) {
    let quat = {x: 0, y: 0, z: 0, w: 1};
    const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const texture = new THREE.ImageUtils.loadTexture('../texture/gravityChangerBox.jpg');
    const material = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.3,
        roughness: 0.5,
        color: 0x7d95ff,
        side: THREE.DoubleSide,
    });

    const gravityChanger = new THREE.Mesh(geometry, material);
    gravityChanger.position.set(position.x, position.y, position.z);
    gravityChanger.receiveShadow = true
    gravityChanger.castShadow = true
    scene.add(gravityChanger);

    // Set original offset relative to the maze
    gravityChanger.userData.originalOffset = new THREE.Vector3().copy(gravityChanger.position).sub(maze.position);

    // Ammo.js collision shape setup
    const mass = 0;
    let motionState = setupAmmoObject(position, quat)

    // Create the collision shape for the finish line
    const colShape = new Ammo.btBoxShape(
        new Ammo.btVector3(size.width / 2, size.height / 2, size.depth / 2)
    );
    colShape.setMargin(0.01);

    let body = setupObjectPhysics(colShape, mass, motionState);

    gravityChanger.userData.physicsBody = body;
    gravityChanger.userData.active = true; // Add active state
    rigidBodies.push(gravityChanger);

    return gravityChanger;
}

// Helper functions to handle collisions

export function handleBuffCollision(objects, handler, body0, body1, manifold) {
    objects.forEach((object) => {
        if (
            object.userData.active &&
            ((body0 === object.userData.physicsBody && body1 === ball.userData.physicsBody) ||
                (body1 === object.userData.physicsBody && body0 === ball.userData.physicsBody))
        ) {
            let numContacts = manifold.getNumContacts();
            for (let j = 0; j < numContacts; j++) {
                let pt = manifold.getContactPoint(j);
                if (pt.getDistance() <= 0.1) {
                    handler(object);
                    break;
                }
            }
        }
    });
}

export function handleFovReducerCollision(fovReducer) {
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

    lightReduced = true;
    light1.angle = Math.PI / 12;
    light1.target = ball;
    light1.penumbra = 0.8;
    light1.intensity = 0.9;

    setTimeout(() => {
        if (lightReduced && !fireworkIsOn) {
            audio.play();
            if (lightReduced) {
                light1.angle = originalLight1Angle;
                light1.penumbra = originalLight1Penumbra;
                light1.intensity = originalLight1Intensity;
                light1.target = originalLight1Target;
            }
            lightReduced = false;
        }
    }, 8000);
}

export function handleGravityChangerCollision(gravityChanger) {
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
