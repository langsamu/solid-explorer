import {OkCancelDialog} from "../../packages/dialog/OkCancelDialog.js"
import {Ldp, Mime} from "../../packages/common/Vocabulary.js"

export class UploadDialog extends OkCancelDialog {
    #name
    #rdf
    #mime
    #file

    constructor() {
        super()

        this.#name = this.#buildInputRow("Name", {required: true})
        this.#rdf = this.#buildInputRow("RDF", {type: "checkbox"})
        this.#mime = this.#buildInputRow("Content type", {required: true, pattern: /\w+\/[\w\.+-]+/.source})
        this.#file = this.#buildInputRow("File", {required: true, type: "file"})

        this.#addMimeList()
    }

    async getModalValue() {
        this.form.reset()

        return await new Promise(resolve => {
            this.addEventListener("close", () => {
                resolve({
                    name: this.#name.value,
                    source: this.#rdf.checked ? Ldp.RdfSource : Ldp.NonRdfSource,
                    mime: this.#mime.value,
                    file: this.#file.files[0]
                })
            }, {once: true})
            this.showModal()
        })
    }

    #buildInputRow(name, properties) {
        const div = this.contents.appendChild(document.createElement("div"))
        const label = div.appendChild(document.createElement("label"))
        const span = label.appendChild(document.createElement("span"))
        const input = label.appendChild(document.createElement("input"))

        span.innerText = name

        for (const [property, value] of Object.entries(properties)) {
            input[property] = value
        }

        return input
    }

    #addMimeList() {
        const datalist = this.contents.appendChild(document.createElement("datalist"))
        this.#mime.setAttribute("list", datalist.id = Math.random().toString(36))

        for (const [name, value] of UploadDialog.#mimes()) {
            const option = datalist.appendChild(document.createElement("option"))
            option.value = value
            option.innerText = name
        }
    }

    static* #mimes() {
        yield ["Turtle", Mime.Turtle]
        yield ["JSON-LD", Mime.JsonLd]
        yield ["RDF/XML", Mime.RdfXml]
        yield ["Plain text", Mime.Text]
        yield ["Binary", Mime.OctetStream]
    }
}

customElements.define("solid-upload-dialog", UploadDialog, {extends: "dialog"})
