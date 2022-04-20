import {HttpHeader, Mime} from "../Vocabulary.js"

export class ResourceViewerElement extends HTMLIFrameElement {
    /** @type {ResourceUri} */
    #resourceUri
    #abortController = new AbortController()

    constructor() {
        super()

        this.addEventListener("gotResourceUri", this.#onGotResourceUri.bind(this))
    }

    /** @return {ResourceUri} */
    get resourceUri() {
        return this.#resourceUri
    }

    /** @param {ResourceUri} value */
    set resourceUri(value) {
        if (value === this.resourceUri) {
            return
        }

        this.#resourceUri = value

        this.#abortController.abort()
        this.#abortController = new AbortController()

        this.dispatchEvent(new CustomEvent("gotResourceUri"))
    }

    async #onGotResourceUri() {
        const resourceResponse = await new Promise(resolve => {
            this.dispatchEvent(new CustomEvent("needResource", {
                bubbles: true,
                detail: {resourceUri: this.resourceUri, resolve, signal: this.#abortController.signal}
            }))
        })

        const mimes = [Mime.Html, Mime.Text, Mime.Turtle, Mime.Pdf, Mime.Svg, Mime.Jpeg, Mime.Png]
        const mime = resourceResponse.headers.get(HttpHeader.ContentType)
        if (!mimes.some(m => mime.includes(m))) {
            this.src = "about:blank"
            return
        }

        const blob = await resourceResponse.blob()
        const url = URL.createObjectURL(blob)
        this.addEventListener("load", () => URL.revokeObjectURL(url), {once: true})
        this.contentWindow.location.replace(url)
    }
}
