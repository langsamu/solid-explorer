export class CrumbTrailElement extends HTMLUListElement {
    /** @type {ResourceUri} */
    #resourceUri

    constructor() {
        super()

        this.addEventListener("resourceUriSet", this.#onResourceUriSet.bind(this))
    }

    /** @return {ResourceUri} */
    get resourceUri() {
        return this.#resourceUri
    }

    /** @param {ResourceUri} value */
    set resourceUri(value) {
        this.#resourceUri = value

        this.dispatchEvent(new CustomEvent("resourceUriSet"))
    }

    async #onResourceUriSet() {
        while(this.firstElementChild){
            this.removeChild(this.firstElementChild)
        }


        const li = document.createElement("li")
        const span = document.createElement("span")
        span.innerText = this.resourceUri.isRoot ? "root" : this.resourceUri.name
        li.appendChild(span)
        this.prepend(li)


        let a = this.resourceUri.parent
        while (a) {
            const li = document.createElement("li")
            const button = document.createElement("button")
            button.innerText = a.isRoot ? "root" : a.name
            button.xx=a

            button.addEventListener("click", e =>this.dispatchEvent(new CustomEvent("resourceClick", {
                bubbles: true,
                detail: {resourceUri: e.target.xx}
            })))

            li.appendChild(button)
            this.prepend(li)

            a = a.parent
        }
    }
}

customElements.define("solid-crumb-trail", CrumbTrailElement, {extends: "ul"})
