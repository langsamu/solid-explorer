import "./ContainerViewItemElement.js"

export class ContainerViewElement extends HTMLDivElement {
    /** @type {ResourceUri} */
    #resourceUri

    constructor() {
        super()

        this.addEventListener("gotResourceUri", this.refresh.bind(this))
        this.addEventListener("contextmenu", this.#onContextMenu.bind(this))
        this.addEventListener("click", this.#onClick.bind(this))
        this.addEventListener("resourceClick", this.#onResourceClick.bind(this))
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

    #onClick(e) {
        if (e.target !== this) {
            return
        }

        this.#deselect()

        this.dispatchEvent(new CustomEvent("resourceClick", {
            bubbles: true,
            detail: {resourceUri: this.resourceUri}
        }))
    }

    #onResourceClick(e) {
        if (e.target === this) {
            return
        }

        this.#deselect()

        e.target.classList.add("selected")
    }

    #deselect() {
        for (const child of this.querySelectorAll("div.selected")) {
            child.classList.toggle("selected")
        }
    }
}

customElements.define("solid-container-view", ContainerViewElement, {extends: "div"})
