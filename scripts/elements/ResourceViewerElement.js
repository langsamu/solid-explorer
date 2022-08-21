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

        await this.#view(resourceResponse)
    }

    async #view(response) {
        const mime = new ContentType(response.headers.get(HttpHeader.ContentType)).mime

        const nativelyViewableMimes = [Mime.Html, Mime.Text, Mime.Pdf, Mime.Svg, Mime.Jpeg, Mime.Png, Mime.Xml, Mime.Ico, Mime.Gif, Mime.Webp, Mime.Bmp, Mime.Json]
        const rdfMimes = [Mime.JsonLd, Mime.Ntriples]
        const isText = mime.type === "text"
        const isChrome = !!window.chrome
        const userAgentSupportsTextViewing = isChrome
        const isNativelyViewable = nativelyViewableMimes.includes(mime.toString())
        const isRdf = rdfMimes.includes(mime.toString());

        // All browsers render some MIME types.
        // Some browsers also render text/*.
        if (isNativelyViewable || isText && userAgentSupportsTextViewing) {
            return await this.#viewNatively(response)
        }

        // For browsers that don't render text/*, we convert them to text/plain.
        // We also convert RDF.
        if (isText || isRdf) {
            return await this.#viewAsText(response)
        }

        // For everything else, show a failure message in preview
        this.#cantView(response)
    }

    async #viewNatively(response) {
        const blob = await response.blob()

        this.#viewBlob(blob)
    }

    async #viewAsText(response) {
        const blob = await response.blob()
        const textBlob = new Blob([blob], {type: Mime.Text})

        this.#viewBlob(textBlob)
    }

    #cantView(response) {
        const mime = new ContentType(response.headers.get(HttpHeader.ContentType)).mime

        const html = `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="min-height: 100vh; display: flex; justify-content: center; align-items: center; text-align: center">This resource type (${mime}) can not be previewed.</body>
</html>`
        const htmlBlob = new Blob([html], {type: Mime.Html})

        this.#viewBlob(htmlBlob)
    }

    #viewBlob(blob) {
        const url = URL.createObjectURL(blob)
        this.addEventListener("load", () => URL.revokeObjectURL(url), {once: true})

        this.contentWindow.location.replace(url)
    }
}

customElements.define("solid-resource-viewer", ResourceViewerElement, {extends: "iframe"})

class ContentType {
    original

    constructor(original) {
        this.original = original
    }

    get mime() {
        return new MimeType(this.original.split(";")[0])
    }
}

class MimeType {
    original

    constructor(original) {
        this.original = original
    }

    get type() {
        return this.original.split("/")[0]
    }

    get subType() {
        return this.original.split("/")[1]
    }

    toString() {
        return this.original
    }
}
