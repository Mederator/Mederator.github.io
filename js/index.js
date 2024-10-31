import * as THREE from 'https://cdn.skypack.dev/three@0.129.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js'

var sizes, camera, scene, light1, light2, renderer, controls, loader

const canvas = document.querySelector('.webgl')

init()
render()

function init() {
    sizes = {
        width: window.innerWidth,
        height: window.innerHeight
    }

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

    // Objects
    addObjects()

    // Control
    controls = new OrbitControls(camera, renderer.domElement)
}

function render() {
    requestAnimationFrame( render )

    renderer.render(scene, camera)
}

function addObjects() {
    // Maze
    loader.load('../models/maze-circular.glb', function (glb){
        // console.log(glb)
        const root = glb.scene
        root.scale.set(0.1, 0.1, 0.1)
        root.position.set(0, 0, 0)
        root.rotateOnAxis( new THREE.Vector3(0, 1, 0), Math.PI)
        scene.add(root)
    }, function (xhr){
        // console.log((xhr.loaded/xhr.total * 100) + "% loaded")
    }, function (error){
        console.log("An error occured" + error)
    })
}
