import {HttpHeader, Ldp, Mime} from "../../packages/common/Vocabulary.js"
import {Compartment, EditorState} from "@codemirror/state"
import {EditorView, keymap, lineNumbers} from "@codemirror/view"
import {defaultHighlightStyle, StreamLanguage, syntaxHighlighting} from "@codemirror/language"
import {defaultKeymap, history, historyKeymap} from "@codemirror/commands"
import {javascript} from "@codemirror/lang-javascript"
import {json} from "@codemirror/lang-json"
import {xml} from "@codemirror/lang-xml"
import {turtle} from "@codemirror/legacy-modes/mode/turtle"
import {ContentType} from "../../packages/common/ContentType.js"

export class ResourceEditorElement extends HTMLDivElement {
    static #turtle = StreamLanguage.define(turtle)

    #editorView
    #readOnly = new Compartment()
    #resourceUri
    #contentType
    #isRdf
    #saveButton

    constructor() {
        super()

        this.#editorView = new EditorView({parent: this})

        this.#saveButton = this.appendChild(this.ownerDocument.createElement("button"))
        this.#saveButton.disabled = true
        this.#saveButton.style.display = "none"
        this.#saveButton.addEventListener("click", this.#onSave.bind(this))

        this.addEventListener("gotResource", this.#onGotResource.bind(this))
    }

    async #onGotResource(e) {
        const mime = new ContentType(e.detail.response.headers.get(HttpHeader.ContentType)).mime
        this.#contentType = mime.toString()

        this.#resourceUri = e.detail.resourceUri
        this.#isRdf = e.detail.response.headers.get(HttpHeader.Link).includes(Ldp.RdfSource)

        this.#editorView.setState(EditorState.create({
            doc: await e.detail.response.text(),
            extensions: [
                lineNumbers(),
                EditorView.lineWrapping,
                history(),
                keymap.of([...defaultKeymap, ...historyKeymap]),
                syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
                ResourceEditorElement.#language(ResourceEditorElement.#convert(this.#contentType)),
                this.#readOnly.of([]),
                EditorView.updateListener.of(update => update.docChanged && this.#onChange())
            ]
        }))
    }

    #setReadOnly(readOnly) {
        this.#editorView.dispatch({
            effects: this.#readOnly.reconfigure(readOnly ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : [])
        })
    }

    async #onSave() {
        this.#saveButton.disabled = true
        this.#saveButton.innerText = "Saving"
        this.#setReadOnly(true)

        const response = await new Promise(resolve => {
            this.dispatchEvent(new CustomEvent("resourceChanged", {
                bubbles: true,
                detail: {
                    resourceUri: this.#resourceUri,
                    contentType: this.#contentType,
                    body: this.#editorView.state.doc.toString(),
                    resourceType: this.#isRdf ? Ldp.RdfSource : Ldp.NonRdfSource,
                    resolve
                }
            }))
        })

        if (response.ok) {
            this.#saveButton.innerText = "Saved"
            setTimeout(() => {
                this.#saveButton.style.display = "none"
                this.#setReadOnly(false)
                this.#editorView.focus()
            }, 2000)
        } else {
            this.#saveButton.innerText = "Could not save"
            setTimeout(() => {
                this.#saveButton.innerText = "Save"
                this.#saveButton.disabled = false
                this.#setReadOnly(false)
                this.#editorView.focus()
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

    static #language(mime) {
        switch (mime) {
            case Mime.Turtle:
                return ResourceEditorElement.#turtle
            case Mime.Json:
            case Mime.JsonLd:
                return json()
            case "text/javascript":
            case "application/javascript":
                return javascript()
            case Mime.Xml:
            case "application/xml":
                return xml()
            default:
                if (mime.endsWith("+json")) {
                    return json()
                }
                if (mime.endsWith("+xml")) {
                    return xml()
                }
                return []
        }
    }
}

customElements.define("solid-editor", ResourceEditorElement, {extends: "div"})
