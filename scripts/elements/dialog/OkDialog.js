import {NewDialogElement} from "./NewDialogElement.js"

export class OkDialog extends NewDialogElement {
    #okButton = document.createElement("button")

    constructor() {
        super()

        this.#okButton.classList.add("ok")
        this.buttons.appendChild(this.#okButton)
    }

    connectedCallback() {
        super.connectedCallback()

        if (this.dataset.okTitle) {
            this.#okButton.innerText = this.dataset.okTitle
        } else {
            this.#okButton.innerText = "OK"
        }

        if (this.dataset.okValue) {
            this.#okButton.value = this.dataset.okValue
        }
    }
}
