import { BTree } from "./b-tree.js"

const tree = new BTree(3)
for (let i = 0; i < 50; i++) {
    tree.insert(Math.floor(Math.random() * 100))
}

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
            totalWidth += 40 // Add spacing between children
        }
    }
    return totalWidth
}

function drawNode(node, x, y) {
    const nodeWidth = node.keys.length * 40
    const startX = x - nodeWidth / 2

    // Draw keys
    for (let i = 0; i < node.keys.length; i++) {
        ctx.strokeRect(startX + i * 40, y - 20, 40, 40)
        ctx.font = "16px monospace"
        const textSize = getTextSize(node.keys[i])
        ctx.fillText(
            node.keys[i],
            startX + i * 40 + 20 - textSize.width / 2,
            y + textSize.height / 2 - 5,
        )
    }

    if (!node.leaf) {
        // Calculate child positions based on subtree widths
        let currentX = x - getNodeWidth(node) / 2
        const childY = y + 70

        for (let i = 0; i < node.children.length; i++) {
            const childWidth = getNodeWidth(node.children[i])
            const childX = currentX + childWidth / 2

            // Draw line from parent to child
            ctx.beginPath()
            ctx.moveTo(startX + i * 40, y + 20)
            ctx.lineTo(childX, childY - 20)
            ctx.stroke()

            drawNode(node.children[i], childX, childY)

            currentX += childWidth + 40 // Add spacing between children
        }
    }
}

function drawTree() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    drawNode(tree.root, canvas.width / 2, 50)
}

window.addEventListener("resize", resizeCanvas)
window.addEventListener("DOMContentLoaded", () => {
    resizeCanvas()
    drawTree()
})
