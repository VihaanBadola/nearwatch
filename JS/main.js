import * as THREE from "three"
import { FlyControls } from "three/examples/jsm/controls/FlyControls.js"

// Core scene/camera/renderer setup
const scene = new THREE.Scene()

// Starfield backdrop. Equirect mapping wraps it around the scene for the
// perspective 3D camera; a plain flat copy is used for 2D's orthographic
// camera, since equirect sampling needs perspective divergence to look right
const backgroundLoader = new THREE.TextureLoader()
const starfieldTexture = backgroundLoader.load("Textures/stars_milky_way.jpg")
starfieldTexture.mapping = THREE.EquirectangularReflectionMapping

const starfieldTextureFlat = backgroundLoader.load("Textures/stars_milky_way.jpg")

scene.background = starfieldTexture

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

// FlyControls handles WASD/R/F movement; look direction is driven manually below
const controls = new FlyControls(camera, renderer.domElement)
controls.movementSpeed = 20
controls.rollSpeed = Math.PI / 6
controls.dragToLook = true

const clock = new THREE.Clock()

// Tracked separately from the camera's quaternion so we can force this orientation every frame, overriding FlyControls' own mouse-hover rotation
let yaw = 0
let pitch = 0
const PITCH_LIMIT = Math.PI / 2 - 0.01
const LOOK_SENSITIVITY = 0.0025

renderer.domElement.addEventListener("contextmenu", (event) => {
    event.preventDefault()
})

// Right-click locks the pointer for 3D mouse-look; left-click starts a 2D drag-pan
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

// Mouse-look only applies while the pointer is actually locked
document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== renderer.domElement) return
    yaw -= event.movementX * LOOK_SENSITIVITY
    pitch -= event.movementY * LOOK_SENSITIVITY
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch))
})

let mode = "3D"

// 2D mode: locked top-down orthographic camera looking down -Y, now that the orbital plane is remapped onto Three.js's horizontal X-Z plane
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
camera2D.position.set(0, 100, 0)
camera2D.up.set(0, 0, -1)
camera2D.lookAt(0, 0, 0)

let isDragging2D = false
const lastPointer2D = { x: 0, y: 0 }

// Drag-to-pan: content follows the cursor, scaled by current zoom level
window.addEventListener("mousemove", (event) => {
    if (!isDragging2D) return
    const dx = event.clientX - lastPointer2D.x
    const dy = event.clientY - lastPointer2D.y
    lastPointer2D.x = event.clientX
    lastPointer2D.y = event.clientY
    const unitsPerPixel = (orthoHalfHeight * 2) / window.innerHeight / camera2D.zoom
    camera2D.position.x -= dx * unitsPerPixel
    camera2D.position.z -= dy * unitsPerPixel
})

// Scroll-to-zoom, using Three.js's built-in orthographic zoom factor
renderer.domElement.addEventListener("wheel", (event) => {
    if (mode !== "2D") return
    event.preventDefault()
    const zoomFactor = Math.pow(1.001, -event.deltaY)
    camera2D.zoom = Math.min(20, Math.max(0.1, camera2D.zoom * zoomFactor))
    camera2D.updateProjectionMatrix()
}, { passive: false })

function resetCamera2D() {
    camera2D.position.set(0, 100, 0)
    camera2D.zoom = 1
    camera2D.updateProjectionMatrix()
}

// Toggle button switches between free-flight 3D and the top-down 2D map
const modeToggleButton = document.getElementById("mode-toggle-button")
modeToggleButton.addEventListener("click", () => {
    mode = mode === "3D" ? "2D" : "3D"
    modeToggleButton.textContent = mode === "3D" ? "Switch to 2D" : "Switch to 3D"
    gizmoRenderer.domElement.style.display = mode === "3D" ? "block" : "none"
    // Equirect mapping only renders correctly under a perspective camera, so
    // 2D's orthographic top-down view uses a plain flat copy of the same image
    scene.background = mode === "3D" ? starfieldTexture : starfieldTextureFlat
    if (mode === "2D") {
        if (document.pointerLockElement === renderer.domElement) {
            document.exitPointerLock()
        }
        resetCamera2D()
    }
})

// Earth and Sun placeholder meshes; Earth's real position comes from the fetch below
const textureLoader = new THREE.TextureLoader()

// lit: true reacts to scene lighting (planets); false stays self-illuminated (light sources)
function createBody({ radius, texturePath, lit }) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32)
    const material = lit
        ? new THREE.MeshStandardMaterial({ map: textureLoader.load(texturePath) })
        : new THREE.MeshBasicMaterial({ map: textureLoader.load(texturePath) })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(0, 0, 0)
    scene.add(mesh)
    return mesh
}

const earthMesh = createBody({ radius: 1, texturePath: "Textures/earth_daymap.jpg", lit: true })
const sunMesh = createBody({ radius: 3, texturePath: "Textures/8k_sun.jpg", lit: false })

// No /mars endpoint yet, so this fakes a circular orbit (not real physics)
// on the horizontal plane at roughly Mars' real ~1.52 AU distance, scaled
const marsMesh = createBody({ radius: 0.5, texturePath: "Textures/8k_mars.jpg", lit: true })
const MARS_ORBIT_RADIUS = 22
const MARS_ORBIT_SPEED = 0.2
let marsOrbitAngle = 0

// MeshStandardMaterial needs an actual light source, unlike MeshBasicMaterial
const sunLight = new THREE.PointLight(0xffffff, 2, 0, 0)
sunLight.position.set(0, 0, 0)
scene.add(sunLight)

// Dim ambient fill so Earth's night side isn't pure black
const ambientLight = new THREE.AmbientLight(0xffffff, 0.15)
scene.add(ambientLight)

function animate() {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()

    marsOrbitAngle += MARS_ORBIT_SPEED * delta
    marsMesh.position.set(
        Math.cos(marsOrbitAngle) * MARS_ORBIT_RADIUS,
        0,
        Math.sin(marsOrbitAngle) * MARS_ORBIT_RADIUS
    )

    let activeCamera
    if (mode === "3D") {
        controls.update(delta)
        // Force our own tracked look direction every frame, since FlyControls would otherwise keep nudging rotation based on cursor position
        camera.rotation.set(pitch, yaw, 0, "YXZ")

        renderer.render(scene, camera)
        activeCamera = camera
    } else {
        renderer.render(scene, camera2D)
        activeCamera = camera2D
    }

    // Skip the mirror update if the camera is right at the origin, since normalizing a near-zero vector produces NaN and would freeze the gizmo
    if (activeCamera.position.length() > 0.001) {
        gizmoCamera.position.copy(activeCamera.position).normalize().multiplyScalar(5)
        gizmoCamera.up.copy(activeCamera.up)
        gizmoCamera.lookAt(0, 0, 0)
    }
    gizmoRenderer.render(gizmoScene, gizmoCamera)
}

const SCALE = 10_000_000

// Real km values from the backend need to be scaled down to usable Three.js units
fetch("http://127.0.0.1:8080/earth")
    .then((response) => response.json())
    .then((data) => {
        console.log(data)
        // JPL's Y/Z are swapped here: the real orbital plane sits in JPL's X-Y,
        // but Three.js is Y-up, so that plane needs to land on X-Z (horizontal)
        // instead of X-Y (vertical) -- otherwise Earth sits "above" the Sun
        // along the vertical axis and gets lit from below, on the wrong pole
        earthMesh.position.set(
            data.position[0] / SCALE,
            data.position[2] / SCALE,
            data.position[1] / SCALE
        )
    })

const VIEW_DISTANCE = 100

const snapHelper = new THREE.Object3D()

// Snaps the 3D camera to a preset position facing the origin, updating th tracked yaw/pitch too (otherwise animate()'s override would undo the snap)
function snapToView(position) {
    camera.position.set(position.x, position.y, position.z)

    snapHelper.position.copy(camera.position)
    // Straight up/down views need a different up vector, since the default (0,1,0) is parallel to the view direction there and breaks lookAt
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

// Draws a labeled face texture for one side of the gizmo cube
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

// Small secondary viewport (top-right) showing a CAD-style ViewCube gizmo
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

// Small corner markers give quick access to isometric-style diagonal views
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

// Clicking a face or corner snaps the main 3D camera to that view
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
