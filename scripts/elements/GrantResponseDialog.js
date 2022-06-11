import {OkDialog} from "./dialog/OkDialog.js"

export class GrantResponseDialog extends OkDialog {
    #link
    #code
    #button

    constructor() {
        super()

        this.#code = this.contents.appendChild(document.createElement("code"))
        this.contents.appendChild(document.createElement("br"))
        this.#link = this.contents.appendChild(document.createElement("a"))
        this.#link.innerText = "Send email"
        this.#button = this.contents.appendChild(document.createElement("button"))
        this.#button.type = "button"
        this.#button.innerText = "Copy"
        this.#button.addEventListener("click", this.#onCopy.bind(this))
    }

    showModal(grantUri) {
        this.#code.innerText = grantUri
        this.#link.href = `mailto:?subject=Access grant&body=${grantUri}`

        super.showModal()
    }

    async #onCopy() {
        await navigator.clipboard.writeText(this.#code.innerText)
    }
}
