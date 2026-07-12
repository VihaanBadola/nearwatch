import * as THREE from "three"
import { FlyControls } from "three/examples/jsm/controls/FlyControls.js"

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
)
camera.position.z = 100

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new FlyControls(camera, renderer.domElement)
controls.movementSpeed = 20
controls.rollSpeed = Math.PI / 6
controls.dragToLook = true

const clock = new THREE.Clock()

let yaw = 0
let pitch = 0
const PITCH_LIMIT = Math.PI / 2 - 0.01
const LOOK_SENSITIVITY = 0.0025

renderer.domElement.addEventListener("contextmenu", (event) => {
    event.preventDefault()
})

renderer.domElement.addEventListener("mousedown", (event) => {
    if (event.button === 2 && mode === "3D") {
        renderer.domElement.requestPointerLock()
    }
    if (event.button === 0 && mode === "2D") {
        isDragging2D = true
        lastPointer2D.x = event.clientX
        lastPointer2D.y = event.clientY
    }
})

window.addEventListener("mouseup", () => {
    isDragging2D = false
})

document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== renderer.domElement) return
    yaw -= event.movementX * LOOK_SENSITIVITY
    pitch -= event.movementY * LOOK_SENSITIVITY
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch))
})

let mode = "3D"

const orthoHalfHeight = 100
const orthoAspect = window.innerWidth / window.innerHeight
const camera2D = new THREE.OrthographicCamera(
    -orthoHalfHeight * orthoAspect,
    orthoHalfHeight * orthoAspect,
    orthoHalfHeight,
    -orthoHalfHeight,
    0.1,
    1000
)
camera2D.position.set(0, 0, 100)
camera2D.up.set(0, 1, 0)
camera2D.lookAt(0, 0, 0)

let isDragging2D = false
const lastPointer2D = { x: 0, y: 0 }

window.addEventListener("mousemove", (event) => {
    if (!isDragging2D) return
    const dx = event.clientX - lastPointer2D.x
    const dy = event.clientY - lastPointer2D.y
    lastPointer2D.x = event.clientX
    lastPointer2D.y = event.clientY
    const unitsPerPixel = (orthoHalfHeight * 2) / window.innerHeight / camera2D.zoom
    camera2D.position.x -= dx * unitsPerPixel
    camera2D.position.y += dy * unitsPerPixel
})

renderer.domElement.addEventListener("wheel", (event) => {
    if (mode !== "2D") return
    event.preventDefault()
    const zoomFactor = Math.pow(1.001, -event.deltaY)
    camera2D.zoom = Math.min(20, Math.max(0.1, camera2D.zoom * zoomFactor))
    camera2D.updateProjectionMatrix()
}, { passive: false })

function resetCamera2D() {
    camera2D.position.set(0, 0, 100)
    camera2D.zoom = 1
    camera2D.updateProjectionMatrix()
}

const modeToggleButton = document.getElementById("mode-toggle-button")
modeToggleButton.addEventListener("click", () => {
    mode = mode === "3D" ? "2D" : "3D"
    modeToggleButton.textContent = mode === "3D" ? "Switch to 2D" : "Switch to 3D"
    gizmoRenderer.domElement.style.display = mode === "3D" ? "block" : "none"
    if (mode === "2D") {
        if (document.pointerLockElement === renderer.domElement) {
            document.exitPointerLock()
        }
        resetCamera2D()
    }
})

const earthGeometry = new THREE.SphereGeometry(1, 32, 32)
const earthMaterial = new THREE.MeshBasicMaterial({ color: 0x2266ff })
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
earthMesh.position.set(0, 0, 0)
scene.add(earthMesh)

const sunGeometry = new THREE.SphereGeometry(3, 32, 32)
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 })
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial)
sunMesh.position.set(0, 0, 0)
scene.add(sunMesh)

function animate() {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()

    let activeCamera
    if (mode === "3D") {
        controls.update(delta)
        camera.rotation.set(pitch, yaw, 0, "YXZ")

        renderer.render(scene, camera)
        activeCamera = camera
    } else {
        renderer.render(scene, camera2D)
        activeCamera = camera2D
    }

    if (activeCamera.position.length() > 0.001) {
        gizmoCamera.position.copy(activeCamera.position).normalize().multiplyScalar(5)
        gizmoCamera.up.copy(activeCamera.up)
        gizmoCamera.lookAt(0, 0, 0)
    }
    gizmoRenderer.render(gizmoScene, gizmoCamera)
}

const SCALE = 10_000_000

fetch("http://127.0.0.1:8080/earth")
    .then((response) => response.json())
    .then((data) => {
        console.log(data)
        earthMesh.position.set(
            data.position[0] / SCALE,
            data.position[1] / SCALE,
            data.position[2] / SCALE
        )
    })

const VIEW_DISTANCE = 100

const snapHelper = new THREE.Object3D()

function snapToView(position) {
    camera.position.set(position.x, position.y, position.z)

    snapHelper.position.copy(camera.position)
    const isVertical = Math.abs(position.x) < 1e-6 && Math.abs(position.z) < 1e-6
    snapHelper.up.set(0, isVertical ? 0 : 1, isVertical ? -1 : 0)
    snapHelper.lookAt(0, 0, 0)

    const euler = new THREE.Euler().setFromQuaternion(snapHelper.quaternion, "YXZ")
    yaw = euler.y
    pitch = euler.x
    camera.rotation.set(pitch, yaw, 0, "YXZ")
}

function snapToDirection(direction) {
    snapToView(direction.clone().multiplyScalar(VIEW_DISTANCE))
}

function makeFaceMaterial(label) {
    const canvas = document.createElement("canvas")
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#222222"
    ctx.fillRect(0, 0, 128, 128)
    ctx.strokeStyle = "#777777"
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, 124, 124)
    ctx.fillStyle = "#eeeeee"
    ctx.font = "bold 20px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(label, 64, 64)
    return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })
}

// BoxGeometry's default material groups are ordered [+X, -X, +Y, -Y, +Z, -Z]
const GIZMO_FACES = [
    { label: "Right", direction: new THREE.Vector3(1, 0, 0) },
    { label: "Left", direction: new THREE.Vector3(-1, 0, 0) },
    { label: "Top", direction: new THREE.Vector3(0, 1, 0) },
    { label: "Bottom", direction: new THREE.Vector3(0, -1, 0) },
    { label: "Front", direction: new THREE.Vector3(0, 0, 1) },
    { label: "Back", direction: new THREE.Vector3(0, 0, -1) }
]

const gizmoScene = new THREE.Scene()
const gizmoCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)

const gizmoSize = 120
const gizmoRenderer = new THREE.WebGLRenderer({ alpha: true })
gizmoRenderer.setSize(gizmoSize, gizmoSize)
gizmoRenderer.domElement.style.position = "fixed"
gizmoRenderer.domElement.style.top = "10px"
gizmoRenderer.domElement.style.right = "10px"
document.body.appendChild(gizmoRenderer.domElement)

const gizmoCube = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    GIZMO_FACES.map((face) => makeFaceMaterial(face.label))
)
gizmoScene.add(gizmoCube)

const gizmoCorners = []
for (const sx of [1, -1]) {
    for (const sy of [1, -1]) {
        for (const sz of [1, -1]) {
            const direction = new THREE.Vector3(sx, sy, sz).normalize()
            const corner = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x999999 })
            )
            corner.position.copy(direction).multiplyScalar(Math.sqrt(3))
            corner.userData.direction = direction
            gizmoScene.add(corner)
            gizmoCorners.push(corner)
        }
    }
}

const gizmoRaycaster = new THREE.Raycaster()
const gizmoPointer = new THREE.Vector2()

gizmoRenderer.domElement.addEventListener("click", (event) => {
    if (mode !== "3D") return

    const rect = gizmoRenderer.domElement.getBoundingClientRect()
    gizmoPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    gizmoPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    gizmoRaycaster.setFromCamera(gizmoPointer, gizmoCamera)

    const cornerHit = gizmoRaycaster.intersectObjects(gizmoCorners)[0]
    if (cornerHit) {
        snapToDirection(cornerHit.object.userData.direction)
        return
    }

    const faceHit = gizmoRaycaster.intersectObject(gizmoCube)[0]
    if (faceHit) {
        snapToDirection(GIZMO_FACES[faceHit.face.materialIndex].direction)
    }
})

animate()
