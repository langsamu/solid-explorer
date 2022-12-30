import {HttpHeader, Mime} from "../../packages/common/Vocabulary.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/turtle/turtle.min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/javascript/javascript.min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/xml/xml.min.js"

export class ResourceViewerElement extends HTMLDivElement {
    constructor() {
        super()

        this.ownerDocument.addEventListener("resourceClick", this.#onResourceClick.bind(this), true)
    }

    async #onResourceClick(e) {
        const response = await new Promise(resolve => {
            this.dispatchEvent(new CustomEvent("needResource", {
                bubbles: true,
                detail: {resourceUri: e.detail.resourceUri, resolve}
            }))
        })

        const nativeMimes = [Mime.Pdf]
        const mime = new ContentType(response.headers.get(HttpHeader.ContentType)).mime

        this.innerHTML = ""

        if (nativeMimes.includes(mime.toString())) {
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const embed = this.ownerDocument.createElement("embed")
            embed.src = url
            embed.addEventListener("load", () => URL.revokeObjectURL(url), {once: true})
            this.appendChild(embed)
        } else if (mime.type === "image") {
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const img = this.ownerDocument.createElement("img")
            img.addEventListener("load", () => URL.revokeObjectURL(url), {once: true})
            img.src = url
            this.appendChild(img)
        } else if (mime.type === "audio") {
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            audio.controls = true
            audio.autoplay = true
            this.appendChild(audio)
        } else if (mime.type === "video") {
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const video = this.ownerDocument.createElement("video")
            video.src = url
            video.controls = true
            video.autoplay = true
            this.appendChild(video)
        } else {
            const codeMirror = new CodeMirror(this, {
                mode: ResourceViewerElement.#convert(mime.toString()),
                lineNumbers: true,
                lineWrapping: true,
                readOnly: "nocursor"
            })

            codeMirror.setValue(await response.text())
        }
    }

    static #convert(mime) {
        switch (mime) {
            case "application/trig":
            case "application/n-triples":
                return Mime.Turtle
            default:
                return mime
        }
    }
}

customElements.define("solid-viewer", ResourceViewerElement, {extends: "div"})

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
