/**
 * A B-tree with a configurable minimum degree.
 *
 * `t` is the minimum degree: every non-root node contains between
 * `t - 1` and `2t - 1` keys.  Duplicate keys are ignored.
 */
class Node {
    constructor(leaf = true) {
        this.leaf = leaf
        this.keys = []
        // Kept parallel to keys, including in internal nodes.
        this.values = []
        this.children = []
        this.x = this.y = 0
    }
}

class BTree {
    constructor(t = 2) {
        if (!Number.isInteger(t) || t < 2) {
            throw new RangeError(
                "B-tree minimum degree t must be an integer of at least 2.",
            )
        }

        this.t = t
        this.root = new Node(true)
    }

    /** Returns [node, keyIndex] when found, or null otherwise. */
    search(key, node = this.root) {
        if (!node) return null

        let index = 0
        while (index < node.keys.length && key > node.keys[index]) index++

        if (index < node.keys.length && key === node.keys[index]) {
            return [node, index]
        }

        return node.leaf ? null : this.search(key, node.children[index])
    }

    /** Returns the value associated with key, or undefined when absent. */
    get(key) {
        const found = this.search(key)
        return found ? found[0].values[found[1]] : undefined
    }

    /**
     * This b-tree is for visualization so value is optional.
     * But this project is for learning so I implemented it with values.
     */
    insert(key, value = undefined) {
        if (this.search(key)) return false

        if (this.root.keys.length === this.maxKeys) {
            const newRoot = new Node(false)
            newRoot.children.push(this.root)
            this.splitChild(newRoot, 0)
            this.root = newRoot
        }

        this.insertNonFull(this.root, key, value)
        return true
    }

    remove(key) {
        if (!this.root || !this.search(key)) return false

        this.removeFromNode(this.root, key)
        if (!this.root.leaf && this.root.keys.length === 0) {
            this.root = this.root.children[0]
        }
        return true
    }

    get maxKeys() {
        return 2 * this.t - 1
    }

    splitChild(parent, childIndex) {
        const child = parent.children[childIndex]
        const right = new Node(child.leaf)
        const middle = child.keys[this.t - 1]
        const middleValue = child.values[this.t - 1]

        right.keys = child.keys.splice(this.t)
        right.values = child.values.splice(this.t)
        child.keys.splice(this.t - 1)
        child.values.splice(this.t - 1)

        if (!child.leaf) right.children = child.children.splice(this.t)

        parent.keys.splice(childIndex, 0, middle)
        parent.values.splice(childIndex, 0, middleValue)
        parent.children.splice(childIndex + 1, 0, right)
    }

    insertNonFull(node, key, value) {
        let index = node.keys.length - 1

        if (node.leaf) {
            while (index >= 0 && key < node.keys[index]) index--
            node.keys.splice(index + 1, 0, key)
            node.values.splice(index + 1, 0, value)
            return
        }

        while (index >= 0 && key < node.keys[index]) index--
        index++

        if (node.children[index].keys.length === this.maxKeys) {
            this.splitChild(node, index)
            if (key > node.keys[index]) index++
        }

        this.insertNonFull(node.children[index], key, value)
    }

    removeFromNode(node, key) {
        let index = 0
        while (index < node.keys.length && key > node.keys[index]) index++

        if (index < node.keys.length && node.keys[index] === key) {
            if (node.leaf) {
                node.keys.splice(index, 1)
                node.values.splice(index, 1)
            } else {
                this.removeFromInternalNode(node, index)
            }
            return
        }

        // The key exists (checked by remove), so this cannot be a leaf.
        if (node.children[index].keys.length === this.t - 1) {
            index = this.ensureChildHasRoom(node, index)
        }
        this.removeFromNode(node.children[index], key)
    }

    removeFromInternalNode(node, index) {
        const key = node.keys[index]
        const left = node.children[index]
        const right = node.children[index + 1]

        if (left.keys.length >= this.t) {
            const predecessor = this.rightmostEntry(left)
            node.keys[index] = predecessor.key
            node.values[index] = predecessor.value
            this.removeFromNode(left, predecessor.key)
        } else if (right.keys.length >= this.t) {
            const successor = this.leftmostEntry(right)
            node.keys[index] = successor.key
            node.values[index] = successor.value
            this.removeFromNode(right, successor.key)
        } else {
            this.mergeChildren(node, index)
            this.removeFromNode(left, key)
        }
    }

    ensureChildHasRoom(parent, index) {
        if (index > 0 && parent.children[index - 1].keys.length >= this.t) {
            this.borrowFromPrevious(parent, index)
            return index
        }

        if (
            index < parent.children.length - 1 &&
            parent.children[index + 1].keys.length >= this.t
        ) {
            this.borrowFromNext(parent, index)
            return index
        }

        if (index < parent.children.length - 1) {
            this.mergeChildren(parent, index)
            return index
        }

        this.mergeChildren(parent, index - 1)
        return index - 1
    }

    borrowFromPrevious(parent, index) {
        const child = parent.children[index]
        const sibling = parent.children[index - 1]

        child.keys.unshift(parent.keys[index - 1])
        child.values.unshift(parent.values[index - 1])
        parent.keys[index - 1] = sibling.keys.pop()
        parent.values[index - 1] = sibling.values.pop()
        if (!child.leaf) child.children.unshift(sibling.children.pop())
    }

    borrowFromNext(parent, index) {
        const child = parent.children[index]
        const sibling = parent.children[index + 1]

        child.keys.push(parent.keys[index])
        child.values.push(parent.values[index])
        parent.keys[index] = sibling.keys.shift()
        parent.values[index] = sibling.values.shift()
        if (!child.leaf) child.children.push(sibling.children.shift())
    }

    mergeChildren(parent, index) {
        const left = parent.children[index]
        const right = parent.children[index + 1]

        left.keys.push(parent.keys[index], ...right.keys)
        left.values.push(parent.values[index], ...right.values)
        if (!left.leaf) left.children.push(...right.children)
        parent.keys.splice(index, 1)
        parent.values.splice(index, 1)
        parent.children.splice(index + 1, 1)
    }

    leftmostEntry(node) {
        while (!node.leaf) node = node.children[0]
        return { key: node.keys[0], value: node.values[0] }
    }

    rightmostEntry(node) {
        while (!node.leaf) node = node.children[node.children.length - 1]
        const index = node.keys.length - 1
        return { key: node.keys[index], value: node.values[index] }
    }
}
