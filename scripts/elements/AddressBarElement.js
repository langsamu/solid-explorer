class AddressBarElement extends HTMLFormElement {
    /** @type {ResourceUri} */
    #resourceUri

    constructor() {
        super()

        this.addEventListener("submit", this.#onSubmit.bind(this))
        this.addEventListener("resourceUriSet", this.#onResourceUriSet.bind(this))
        this.addEventListener("focus", this.#onFocus.bind(this))
        this.addEventListener("input", this.#onInput.bind(this))
    }

    get #input() {
        return this.querySelector("input")
    }

    get #upButton() {
        return this.querySelector("button[value=up]")
    }

    get #goButton() {
        return this.querySelector("button[value=go]")
    }

    /** @return {ResourceUri} */
    get resourceUri() {
        return this.#resourceUri
    }

    /** @param {ResourceUri} value */
    set resourceUri(value) {
        this.#resourceUri = value

        this.#input.value = this.#resourceUri.toString()
        this.#upButton.disabled = this.#resourceUri.isRoot

        this.#onInput()
    }

    #onSubmit(e) {
        e.preventDefault()

        switch (e.submitter.value) {
            case "up":
                this.resourceUri = this.resourceUri.parent

                this.dispatchEvent(new CustomEvent("resourceUriEntered", {
                    bubbles: true,
                    detail: {resourceUri: this.resourceUri}
                }))

                break;
            case "go":
                this.dispatchEvent(new CustomEvent("resourceUriEntered", {
                    bubbles: true,
                    detail: {resourceUri: this.#input.value}
                }))

                break;
        }
    }

    async #onResourceUriSet() {
        this.#input.value = this.#resourceUri.toString()
        this.#upButton.disabled = this.#resourceUri.isRoot
    }

    async #onFocus() {
        this.#input.focus()
    }

    #onInput() {
        this.#goButton.disabled = this.#resourceUri.toString() === this.#input.value
    }
}

customElements.define("solid-address-bar", AddressBarElement, {extends: "form"})
