import {ResourceSelectedEvent} from "../ResourceSelectedEvent.js"

export class TreeElement extends HTMLDetailsElement {
    /** @type {ResourceUri} */
    #resourceUri

    constructor() {
        super()

        //addEventListener("resourceClick", this.#onResourceClick.bind(this), true)
        this.ownerDocument.addEventListener(ResourceSelectedEvent.TYPE, this.#onResourceSelected.bind(this), true)
        this.ownerDocument.addEventListener("xxx", this.#onResourceSelected.bind(this), true)
        this.addEventListener("toggle", this.#onToggle.bind(this))
        this.#summarySpan.addEventListener("click", this.#onSummarySpanClick.bind(this))
        this.#summarySpan.addEventListener("dblclick", this.#onSummarySpanDoubleClick.bind(this))
        this.#summarySpan.addEventListener("contextmenu", this.#onContextMenu.bind(this))
    }

    get #summarySpan() {
        const summary = this.querySelector("summary") ?? this.appendChild(document.createElement("summary"))
        const span = summary.querySelector("span") ?? summary.appendChild(document.createElement("span"))

        return span
    }

    get #childrenPopulated() {
        return this.querySelectorAll("details").length !== 0
    }

    /** @return {ResourceUri} */
    get resourceUri() {
        return this.#resourceUri
    }

    /** @param {ResourceUri} value */
    set resourceUri(value) {
        if (!value.isContainer) {
            throw new Error(`Value is not a container: ${value}`)
        }

        this.#resourceUri = value

        this.#summarySpan.innerText = value.isRoot ? "root" : value.name
    }

    async #onToggle() {
        if (!this.open || !this.resourceUri || this.#childrenPopulated) {
            return
        }

        const children = await new Promise(resolve => {
            this.dispatchEvent(new CustomEvent("needChildren", {
                bubbles: true,
                detail: {resourceUri: this.resourceUri, resolve}
            }))
        })

        const childContainers = [...children].filter(child => child.isContainer)

        for (const child of childContainers) {
            const childElement = document.createElement("details", {is: "solid-tree"})
            childElement.resourceUri = child

            this.appendChild(childElement)
        }

        this.dispatchEvent(new CustomEvent("gotChildren"))
    }

    async #onSummarySpanClick(e) {
        if (!this.resourceUri) {
            return
        }

        e.stopPropagation()
        e.preventDefault()

        this.dispatchEvent(new ResourceSelectedEvent(this.resourceUri, {bubbles: true}))
    }

    async #onSummarySpanDoubleClick(e) {
        e.stopPropagation()
        this.open = !this.open
    }

    async #onContextMenu(e) {
        e.preventDefault()
        e.stopPropagation()

        this.dispatchEvent(new CustomEvent("resourceContextMenu", {
            bubbles: true,
            detail: {resourceUri: this.resourceUri}
        }))
    }

    async #onResourceSelected(e) {
        if (e.target === this) {
            return
        }

        if (e.type !== "xxx" && e.target instanceof TreeElement) {
            return
        }

        if (!this.resourceUri) {
            this.resourceUri = e.detail.resourceUri.root
        }

        if (this.resourceUri.isAncestorOf(e.detail.resourceUri)) {
            this.open = true

            // Wait for children to have populated, then dispatch on self so they can capture
            this.addEventListener("gotChildren", () => this.dispatchEvent(new CustomEvent("xxx", {detail: e.detail})), {once: true})
        }
    }
}

customElements.define("solid-tree", TreeElement, {extends: "details"})
