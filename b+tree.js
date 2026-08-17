/**
 * A B+ tree with a configurable minimum degree.
 *
 * Values are stored only in leaf nodes; internal keys are separators.  Leaves
 * are linked through `next`, which makes ordered range scans inexpensive.
 */
class BPlusTreeNode {
    constructor(leaf = true) {
        this.leaf = leaf
        this.keys = []
        // Values exist only on leaves and stay aligned with leaf keys.
        this.values = []
        this.children = []
        this.next = null
    }
}

class BPlusTree {
    constructor(t = 2) {
        if (!Number.isInteger(t) || t < 2) {
            throw new RangeError(
                "B+ tree minimum degree t must be an integer of at least 2.",
            )
        }

        this.t = t
        this.root = new BPlusTreeNode(true)
    }

    get maxKeys() {
        return 2 * this.t - 1
    }

    /** Returns [leafNode, keyIndex] when found, or null otherwise. */
    search(key) {
        const [leaf, path] = this.findLeaf(key)
        const index = this.lowerBound(leaf.keys, key)
        return leaf.keys[index] === key ? [leaf, index, path] : null
    }

    has(key) {
        return this.search(key) !== null
    }

    /** Returns the value associated with key, or undefined when absent. */
    get(key) {
        const found = this.search(key)
        return found ? found[0].values[found[1]] : undefined
    }

    insert(key, value = undefined) {
        if (this.has(key)) return false

        const path = []
        let node = this.root
        while (!node.leaf) {
            const index = this.childIndex(node, key)
            path.push([node, index])
            node = node.children[index]
        }

        const index = this.lowerBound(node.keys, key)
        node.keys.splice(index, 0, key)
        node.values.splice(index, 0, value)
        if (node.keys.length > this.maxKeys) this.splitLeaf(node, path)
        return true
    }

    /**
     * Returns keys in ascending order, optionally restricted to [from, to].
     * Either bound may be omitted.
     */
    range(from = undefined, to = undefined) {
        if (from !== undefined && to !== undefined && from > to) return []

        const result = []
        let [leaf, path] =
            from === undefined ? this.firstLeaf() : this.findLeaf(from)
        let index = from === undefined ? 0 : this.lowerBound(leaf.keys, from)

        while (leaf) {
            for (; index < leaf.keys.length; index++) {
                const key = leaf.keys[index]
                if (to !== undefined && key > to) return result
                result.push(key)
            }

            path.push(leaf)
            leaf = leaf.next
            index = 0
        }

        return [result, path]
    }

    /** Returns [key, value] pairs in ascending key order. */
    entries(from = undefined, to = undefined) {
        if (from !== undefined && to !== undefined && from > to) return []

        const result = []
        let leaf =
            from === undefined ? this.firstLeaf()[0] : this.findLeaf(from)[0]
        let index = from === undefined ? 0 : this.lowerBound(leaf.keys, from)
        while (leaf) {
            for (; index < leaf.keys.length; index++) {
                const key = leaf.keys[index]
                if (to !== undefined && key > to) return result
                result.push([key, leaf.values[index]])
            }
            leaf = leaf.next
            index = 0
        }
        return result
    }

    /** Removes a key. Duplicate keys are not supported. */
    remove(key) {
        if (!this.has(key)) return false

        // Rebuilding keeps all B+ tree occupancy and separator invariants correct,
        // while preserving the public behavior and leaf-link guarantees.
        const entries = this.entries()
        this.root = new BPlusTreeNode(true)
        for (const [existingKey, value] of entries) {
            if (existingKey !== key) this.insert(existingKey, value)
        }
        return true
    }

    findLeaf(key) {
        let node = this.root
        const path = []
        while (!node.leaf) {
            path.push(node)
            node = node.children[this.childIndex(node, key)]
        }
        return [node, path]
    }

    firstLeaf() {
        let node = this.root
        const path = []
        while (!node.leaf) {
            path.push(node)
            node = node.children[0]
        }
        return [node, path]
    }

    childIndex(node, key) {
        let index = 0
        // A separator is the first key contained by its right child.
        while (index < node.keys.length && key >= node.keys[index]) index++
        return index
    }

    lowerBound(keys, key) {
        let low = 0
        let high = keys.length
        while (low < high) {
            const middle = low + Math.floor((high - low) / 2)
            if (keys[middle] < key) low = middle + 1
            else high = middle
        }
        return low
    }

    splitLeaf(leaf, path) {
        const right = new BPlusTreeNode(true)
        right.keys = leaf.keys.splice(this.t)
        right.values = leaf.values.splice(this.t)
        right.next = leaf.next
        leaf.next = right
        this.insertIntoParent(leaf, right.keys[0], right, path)
    }

    insertIntoParent(left, separator, right, path) {
        if (path.length === 0) {
            const root = new BPlusTreeNode(false)
            root.keys = [separator]
            root.children = [left, right]
            this.root = root
            return
        }

        const [parent, index] = path.pop()
        parent.keys.splice(index, 0, separator)
        parent.children.splice(index + 1, 0, right)
        if (parent.keys.length > this.maxKeys) this.splitInternal(parent, path)
    }

    splitInternal(node, path) {
        const right = new BPlusTreeNode(false)
        const separator = node.keys[this.t]

        right.keys = node.keys.splice(this.t + 1)
        node.keys.splice(this.t)
        right.children = node.children.splice(this.t + 1)

        this.insertIntoParent(node, separator, right, path)
    }
}
