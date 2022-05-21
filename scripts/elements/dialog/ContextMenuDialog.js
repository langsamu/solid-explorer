import {NewDialogElement} from "./NewDialogElement.js"

export class ContextMenuDialog extends NewDialogElement {
    #options = new Map

    constructor() {
        super()

        this.classList.add("context-menu")
    }

    connectedCallback() {
        super.connectedCallback()

        if (this.#options.size > 0) {
            for (const [value, title] of this.#options) {
                const button = document.createElement("button")
                button.value = value
                button.innerText = title

                this.contents.appendChild(button)
            }
        }
    }

    addItem(value, title) {
        this.#options.set(value, title)
    }
}
