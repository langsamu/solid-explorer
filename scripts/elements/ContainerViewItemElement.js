export class ContainerViewItemElement extends HTMLDivElement {
    /** @type {ResourceUri} */
    #resourceUri

    constructor() {
        super()

        this.addEventListener("click", this.#onClick.bind(this))
        this.addEventListener("dblclick", this.#onDoubleClick.bind(this))
        this.addEventListener("keydown", this.#onKeyPress.bind(this))
        this.addEventListener("contextmenu", this.#onContextMenu.bind(this))
    }

    /** @return {ResourceUri} */
    get resourceUri() {
        return this.#resourceUri
    }

    /** @param {ResourceUri} value */
    set resourceUri(value) {
        this.#resourceUri = value

        this.innerText = this.resourceUri.name
    }

    async #onClick(e) {
        if (!this.resourceUri) {
            return
        }

        this.dispatchEvent(new CustomEvent("resourceClick", {
            bubbles: true,
            detail: {resourceUri: this.resourceUri}
        }))
    }

    async #onDoubleClick(e) {
        if (!this.resourceUri) {
            return
        }

        this.dispatchEvent(new CustomEvent("resourceDoubleClick", {
            bubbles: true,
            detail: {resourceUri: this.resourceUri}
        }))
    }

    async #onKeyPress(e) {
        if (e.code === "Delete") {
            await new Promise(resolve => {
                this.dispatchEvent(new CustomEvent("deleteResource", {
                    bubbles: true,
                    detail: {resourceUri: this.resourceUri, resolve}
                }))
            })
        }
    }

    async #onContextMenu(e) {
        e.preventDefault()
        e.stopPropagation()

        this.dispatchEvent(new CustomEvent("resourceContextMenu", {
            bubbles: true,
            detail: {resourceUri: this.resourceUri}
        }))
    }
}
