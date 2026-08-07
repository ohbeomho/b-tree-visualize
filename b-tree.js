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
    this.children = []
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

  insert(key) {
    if (this.search(key)) return false

    if (this.root.keys.length === this.maxKeys) {
      const newRoot = new Node(false)
      newRoot.children.push(this.root)
      this.splitChild(newRoot, 0)
      this.root = newRoot
    }

    this.insertNonFull(this.root, key)
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

    right.keys = child.keys.splice(this.t)
    child.keys.splice(this.t - 1)

    if (!child.leaf) right.children = child.children.splice(this.t)

    parent.keys.splice(childIndex, 0, middle)
    parent.children.splice(childIndex + 1, 0, right)
  }

  insertNonFull(node, key) {
    let index = node.keys.length - 1

    if (node.leaf) {
      while (index >= 0 && key < node.keys[index]) index--
      node.keys.splice(index + 1, 0, key)
      return
    }

    while (index >= 0 && key < node.keys[index]) index--
    index++

    if (node.children[index].keys.length === this.maxKeys) {
      this.splitChild(node, index)
      if (key > node.keys[index]) index++
    }

    this.insertNonFull(node.children[index], key)
  }

  removeFromNode(node, key) {
    let index = 0
    while (index < node.keys.length && key > node.keys[index]) index++

    if (index < node.keys.length && node.keys[index] === key) {
      if (node.leaf) {
        node.keys.splice(index, 1)
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
      const predecessor = this.rightmostKey(left)
      node.keys[index] = predecessor
      this.removeFromNode(left, predecessor)
    } else if (right.keys.length >= this.t) {
      const successor = this.leftmostKey(right)
      node.keys[index] = successor
      this.removeFromNode(right, successor)
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
    parent.keys[index - 1] = sibling.keys.pop()
    if (!child.leaf) child.children.unshift(sibling.children.pop())
  }

  borrowFromNext(parent, index) {
    const child = parent.children[index]
    const sibling = parent.children[index + 1]

    child.keys.push(parent.keys[index])
    parent.keys[index] = sibling.keys.shift()
    if (!child.leaf) child.children.push(sibling.children.shift())
  }

  mergeChildren(parent, index) {
    const left = parent.children[index]
    const right = parent.children[index + 1]

    left.keys.push(parent.keys[index], ...right.keys)
    if (!left.leaf) left.children.push(...right.children)
    parent.keys.splice(index, 1)
    parent.children.splice(index + 1, 1)
  }

  leftmostKey(node) {
    while (!node.leaf) node = node.children[0]
    return node.keys[0]
  }

  rightmostKey(node) {
    while (!node.leaf) node = node.children[node.children.length - 1]
    return node.keys[node.keys.length - 1]
  }
}

export { BTree, Node }
