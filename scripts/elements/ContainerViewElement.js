export class ContainerViewElement extends HTMLDivElement {
    /** @type {ResourceUri} */
    #resourceUri

    constructor() {
        super()

        this.addEventListener("gotResourceUri", this.refresh.bind(this))
        this.addEventListener("contextmenu", this.#onContextMenu.bind(this))
    }

    /** @return {ResourceUri} */
    get resourceUri() {
        return this.#resourceUri
    }

    set resourceUri(value) {
        if (!value.isContainer) {
            throw `Value is not a container: ${value}`
        }

        this.#resourceUri = value
        this.dispatchEvent(new CustomEvent("gotResourceUri"))
    }

    async refresh() {
        while (this.firstChild) {
            this.removeChild(this.lastChild);
        }

        const children = await new Promise(resolve =>
            this.dispatchEvent(new CustomEvent("needChildren", {
                bubbles: true,
                detail: {resourceUri: this.resourceUri, resolve}
            })))

        for (const child of children) {
            const childElement = document.createElement("div", {is: "solid-container-view-item"})
            childElement.tabIndex = 0
            childElement.resourceUri = child

            this.appendChild(childElement)
        }
    }

    async #onContextMenu(e) {
        e.preventDefault()

        this.dispatchEvent(new CustomEvent("resourceContextMenu", {
            bubbles: true,
            detail: {resourceUri: this.resourceUri}
        }))
    }
}
