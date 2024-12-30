const FLAGS = {CF_KINEMATIC_OBJECT: 2}
const STATE = {DISABLE_DEACTIVATION: 4}

export function setupObjectPhysics(colShape, mass, motionState){
    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    // Ensure the body stays active
    body.setActivationState(STATE.DISABLE_DEACTIVATION);
    body.setCollisionFlags(FLAGS.CF_KINEMATIC_OBJECT);
    dynamicsWorld.addRigidBody(body);
    return body
}

export function setupAmmoObject(pos, quat){
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    return  new Ammo.btDefaultMotionState(transform);
}

export function clearScene() {
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