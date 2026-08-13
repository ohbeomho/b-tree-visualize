const nodes = []

function insertKey() {
    const key = keyInput.valueAsNumber
    if (isNaN(key)) return

    let result = tree.insert(key)
    if (!result) {
        alert("Key already exists")
        return
    }

    drawTree()
    updateNodes()

    keyInput.value = ""
}

let offsetX = 0,
    offsetY = 0

const NODE_SIZE = 40
const NODE_SPACING = 40

const canvas = document.querySelector("canvas")
const ctx = canvas.getContext("2d")

function resizeCanvas() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    drawTree()
}

function getTextSize(text) {
    const textWidth = document.getElementById("textWidth")
    textWidth.textContent = text

    return {
        width: textWidth.offsetWidth,
        height: textWidth.offsetHeight,
    }
}

function getNodeWidth(node) {
    if (node.leaf) {
        return node.keys.length * 40
    }

    let totalWidth = 0
    for (let i = 0; i < node.children.length; i++) {
        totalWidth += getNodeWidth(node.children[i])
        if (i < node.children.length - 1) {
            totalWidth += NODE_SPACING // Add spacing between children
        }
    }

    return totalWidth
}

function drawNode(node, x, y) {
    const nodeWidth = node.keys.length * 40
    const startX = x - nodeWidth / 2

    // Draw keys
    for (let i = 0; i < node.keys.length; i++) {
        ctx.strokeRect(startX + i * NODE_SIZE, y, NODE_SIZE, NODE_SIZE)

        node.x = startX
        node.y = y

        ctx.font = "16px monospace"
        const textSize = getTextSize(node.keys[i])
        ctx.fillText(
            node.keys[i],
            startX + i * NODE_SIZE + NODE_SIZE / 2 - textSize.width / 2,
            y + NODE_SIZE / 2 + textSize.height / 2 - 5,
        )
    }

    if (!node.leaf) {
        // Calculate child positions based on subtree widths
        let currentX = x - getNodeWidth(node) / 2
        const childY = y + 100

        for (let i = 0; i < node.children.length; i++) {
            const childWidth = getNodeWidth(node.children[i])
            const childX = currentX + childWidth / 2

            // Draw line from parent to child
            ctx.beginPath()
            ctx.moveTo(startX + i * NODE_SIZE, y + NODE_SIZE)
            ctx.lineTo(childX, childY)
            ctx.stroke()

            drawNode(node.children[i], childX, childY)

            currentX += childWidth + NODE_SPACING
        }
    }
}

function drawLeafLinks() {
    for (const node of nodes) {
        if (node.leaf && node.next) {
            ctx.beginPath()
            ctx.moveTo(
                node.x + node.keys.length * NODE_SIZE,
                node.y + NODE_SIZE / 2,
            )
            ctx.lineTo(node.next.x, node.next.y + NODE_SIZE / 2)
            ctx.stroke()
        }
    }
}

// Update nodes array
function updateNodes() {
    nodes.splice(0, nodes.length)

    const update = (node) => {
        nodes.push(node)

        if (!node.leaf) {
            for (const child of node.children) update(child)
        }
    }

    update(tree.root)
}

function drawTree() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    drawNode(tree.root, canvas.width / 2 + offsetX, 50 + offsetY)
    if (tree instanceof BPlusTree) {
        drawLeafLinks()
    }
}

function highlightKey(key) {
    drawTree()
    if (key === null) return

    ctx.strokeStyle = "red"
    ctx.lineWidth = 3
    ctx.strokeRect(key.x, key.y, NODE_SIZE, NODE_SIZE)
    ctx.strokeStyle = "black"
    ctx.lineWidth = 1
}

window.addEventListener("resize", resizeCanvas)
window.addEventListener("DOMContentLoaded", () => {
    resizeCanvas()
    drawTree()
    updateNodes()
})

let mouseX = null,
    mouseY = null
let hoveringKey = null
let mousedown = false
canvas.addEventListener("contextmenu", (e) => e.preventDefault())
canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) mousedown = true
    else if (e.button === 2 && hoveringKey !== null) {
        tree.remove(hoveringKey.key)
        drawTree()
        updateNodes()
    }
})
canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
        mousedown = false
        updateNodes()
    }
})
canvas.addEventListener("mousemove", (e) => {
    const currX = e.clientX,
        currY = e.clientY

    hoveringKey = null

    for (let node of nodes) {
        const x = node.x
        const y = node.y

        for (let i = 0; i < node.keys.length; i++) {
            if (
                currX >= x + i * NODE_SIZE &&
                currX < x + (i + 1) * NODE_SIZE &&
                currY >= y &&
                currY < y + NODE_SIZE
            ) {
                hoveringKey = { x: x + i * NODE_SIZE, y: y, key: node.keys[i] }
                break
            }
        }
    }

    highlightKey(hoveringKey)

    if (!mousedown) {
        mouseX = null
        mouseY = null
        return
    }

    if (mouseX !== null) {
        const diffX = currX - mouseX
        const diffY = currY - mouseY
        offsetX += diffX
        offsetY += diffY
        drawTree()
    }

    mouseX = currX
    mouseY = currY
})

const insertButton = document.getElementById("insertButton")
const keyInput = document.getElementById("keyInput")

insertButton.addEventListener("click", insertKey)
keyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") insertKey()
})
