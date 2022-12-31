import {HttpHeader, Mime} from "../../packages/common/Vocabulary.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/turtle/turtle.min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/javascript/javascript.min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/xml/xml.min.js"
import {ContentType} from "../../packages/common/ContentType.js"

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
            const editor = this.ownerDocument.createElement("div", {is: "solid-editor"})
            this.appendChild(editor)

            editor.dispatchEvent(new CustomEvent("gotResource", {
                detail: {
                    response,
                    resourceUri: e.detail.resourceUri
                }
            }))
        }
    }
}

customElements.define("solid-viewer", ResourceViewerElement, {extends: "div"})
