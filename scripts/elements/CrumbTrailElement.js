import {ResourceSelectedEvent} from "../ResourceSelectedEvent.js"

export class CrumbTrailElement extends HTMLUListElement {
    constructor() {
        super()

        this.ownerDocument.addEventListener(ResourceSelectedEvent.TYPE, this.#onResourceSelected.bind(this), true)
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

            button.addEventListener("click", e => this.dispatchEvent(new ResourceSelectedEvent(e.target.xx)))

            li.appendChild(button)
            this.prepend(li)

            parent = parent.parent
        }
    }
}

customElements.define("solid-crumb-trail", CrumbTrailElement, {extends: "ul"})
