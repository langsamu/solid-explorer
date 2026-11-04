import {ResourceSelectedEvent} from "../ResourceSelectedEvent.js"
import {ResourceUriString} from "../ResourceUriStringEvent.js"

class AddressBarElement extends HTMLFormElement {
    /** @type {ResourceUri} */
    #resourceUri

    #abortController

    constructor() {
        super()

        this.addEventListener("submit", this.#onSubmit.bind(this))
        this.addEventListener("focus", this.#onFocus.bind(this))
        this.addEventListener("input", this.#onInput.bind(this))
    }

    connectedCallback() {
        this.#abortController = new AbortController()
        const {signal} = this.#abortController

        this.ownerDocument.addEventListener(ResourceSelectedEvent.TYPE, this.#onResourceSelected.bind(this), {capture: true, signal})
    }

    disconnectedCallback() {
        this.#abortController?.abort()
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
                this.dispatchEvent(new ResourceSelectedEvent(this.resourceUri))

                break;
            case "go":
                this.dispatchEvent(new ResourceUriString(this.#input.value))

                break;
        }
    }

    /**
     * @param {ResourceSelectedEvent} e
     */
    #onResourceSelected(e) {
        if (e.target === this) {
            return
        }

        this.resourceUri = e.resourceUri
    }

    #onFocus() {
        this.#input.focus()
    }

    #onInput() {
        this.#goButton.disabled = this.#resourceUri.toString() === this.#input.value
    }
}

customElements.define("solid-address-bar", AddressBarElement, {extends: "form"})
