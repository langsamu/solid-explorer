const SLASH = "/"

export class ResourceUri extends URL {
    /** @type {ResourceUri} */
    #root

    /**
     * @param {String | URL} url
     * @param {String | URL} base
     * @param {String | URL} rootContainer
     */
    constructor(url, base, rootContainer) {
        super(url, base)

        if (rootContainer) {
            if (rootContainer instanceof ResourceUri) {
                if (!rootContainer.isContainer) {
                    throw "Root container must be container"
                }

                this.#root = rootContainer
            } else {
                this.#root = new ResourceUri(rootContainer)
            }
        }
    }

    /** @return {ResourceUri} */
    get root() {
        return this.#root
    }

    /** @return {Boolean} */
    get isContainer() {
        return this.pathname.endsWith(SLASH)
    }

    /** @return {Boolean} */
    get isRoot() {
        return this.root === undefined || this.toString() === this.root.toString()
    }

    /** @return {ResourceUri} */
    get parent() {
        if (this.isRoot) {
            return null
        }

        return new ResourceUri(this.isContainer ? ".." : ".", this, this.root)
    }

    /** @return {String} */
    get name() {
        return last(this.pathname.split(SLASH).filter(pathComponent => pathComponent !== ""))
    }

    isAncestorOf(other) {
        if (!other instanceof ResourceUri) {
            return false
        }

        for (let parent = other.parent; parent; parent = parent.parent) {
            if (parent.toString() === this.toString()) {
                return true
            }
        }
    }
}

function last(array) {
    return array[array.length - 1]
}
