import {ResourceSelectedEvent} from "../ResourceSelectedEvent.js"

export class CrumbTrailElement extends HTMLUListElement {
    #abortController

    connectedCallback() {
        this.#abortController = new AbortController()
        const {signal} = this.#abortController

        this.ownerDocument.addEventListener(ResourceSelectedEvent.TYPE, this.#onResourceSelected.bind(this), {capture: true, signal})
    }

    disconnectedCallback() {
        this.#abortController?.abort()
    }

    #onCrumbClick(e) {
        this.dispatchEvent(new ResourceSelectedEvent(e.target.xx))
    }

    /**
     * @param {ResourceSelectedEvent} e
     */
    #onResourceSelected(e) {
        while (this.firstElementChild) {
            this.removeChild(this.firstElementChild)
        }

        const li = document.createElement("li")
        const span = document.createElement("span")
        span.innerText = e.resourceUri.isRoot ? "root" : e.resourceUri.name
        li.appendChild(span)
        this.prepend(li)


        let parent = e.resourceUri.parent
        while (parent) {
            const li = document.createElement("li")
            const button = document.createElement("button")
            button.innerText = parent.isRoot ? "root" : parent.name
            button.xx = parent

            button.addEventListener("click", this.#onCrumbClick.bind(this))

            li.appendChild(button)
            this.prepend(li)

            parent = parent.parent
        }
    }
}

customElements.define("solid-crumb-trail", CrumbTrailElement, {extends: "ul"})
