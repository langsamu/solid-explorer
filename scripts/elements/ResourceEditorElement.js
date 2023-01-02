import {HttpHeader, Ldp, Mime} from "../../packages/common/Vocabulary.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/turtle/turtle.min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/javascript/javascript.min.js"
import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/xml/xml.min.js"
import {ContentType} from "../../packages/common/ContentType.js"

export class ResourceEditorElement extends HTMLDivElement {
    #codeMirror
    #resourceUri
    #contentType
    #isRdf
    #saveButton

    constructor() {
        super()

        this.#codeMirror = new CodeMirror(this, {
            lineWrapping: true
        })

        this.#saveButton = this.appendChild(this.ownerDocument.createElement("button"))
        this.#saveButton.disabled = true
        this.#saveButton.style.display = "none"
        this.#saveButton.addEventListener("click", this.#onSave.bind(this))

        this.addEventListener("gotResource", this.#onGotResource.bind(this))
    }

    async #onGotResource(e) {
        const mime = new ContentType(e.detail.response.headers.get(HttpHeader.ContentType)).mime
        this.#contentType = mime.toString()
        this.#codeMirror.setOption("mode", ResourceEditorElement.#convert(mime.toString()))

        this.#resourceUri = e.detail.resourceUri
        this.#isRdf = e.detail.response.headers.get(HttpHeader.Link).includes(Ldp.RdfSource)

        this.#codeMirror.setValue(await e.detail.response.text())
        this.#codeMirror.setOption("lineNumbers", "true")

        this.#codeMirror.on("change", this.#onChange.bind(this))
    }

    async #onSave() {
        this.#saveButton.disabled = true
        this.#saveButton.innerText = "Saving"
        this.#codeMirror.setOption("readOnly", "nocursor")

        const response = await new Promise(resolve => {
            this.dispatchEvent(new CustomEvent("resourceChanged", {
                bubbles: true,
                detail: {
                    resourceUri: this.#resourceUri,
                    contentType: this.#contentType,
                    body: this.#codeMirror.getValue(),
                    resourceType: this.#isRdf ? Ldp.RdfSource : Ldp.NonRdfSource,
                    resolve
                }
            }))
        })

        if (response.ok) {
            this.#saveButton.innerText = "Saved"
            setTimeout(() => {
                this.#saveButton.style.display = "none"
                this.#codeMirror.setOption("readOnly", "")
                this.#codeMirror.focus()
            }, 2000)
        } else {
            this.#saveButton.innerText = "Could not save"
            setTimeout(() => {
                this.#saveButton.innerText = "Save"
                this.#saveButton.disabled = false
                this.#codeMirror.setOption("readOnly", "")
                this.#codeMirror.focus()
            }, 2000)
        }
    }

    async #onChange() {
        this.#saveButton.innerText = "Save"
        this.#saveButton.disabled = false
        this.#saveButton.style.display = "initial"
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

customElements.define("solid-editor", ResourceEditorElement, {extends: "div"})
