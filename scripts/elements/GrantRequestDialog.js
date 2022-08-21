import {OkCancelDialog} from "../../packages/dialog/OkCancelDialog.js"

export class GrantRequestDialog extends OkCancelDialog {
    #webid
    #ul

    constructor() {
        super()

        this.#webid = this.#buildInputRow("WebID", {required: true, type: "url", pattern: /https?:\/\/.*/.source})

        this.#addModes()
    }

    async getModalValue() {
        this.form.reset()

        return await new Promise(resolve => {
            this.addEventListener("close", () =>
                resolve({
                    webid: this.#webid.value,
                    modes: [...this.#getModes()],
                }), {once: true})
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

    #addModes() {
        const div = this.contents.appendChild(document.createElement("div"))
        const fieldset = div.appendChild(document.createElement("fieldset"))
        const legend = fieldset.appendChild(document.createElement("legend"))
        legend.innerText = "Modes"
        this.#ul = fieldset.appendChild(document.createElement("ul"))

        for (const mode of ["Read", "Write", "Append", "Control"]) {
            const li = this.#ul.appendChild(document.createElement("li"))
            const label = li.appendChild(document.createElement("label"))
            const span = label.appendChild(document.createElement("span"))
            span.innerText = mode
            const input = label.appendChild(document.createElement("input"))
            input.value = mode
            input.type = "checkbox"
        }
    }

    * #getModes() {
        for (const checkbox of this.#ul.querySelectorAll("input:checked")) {
            yield checkbox.value
        }
    }
}

customElements.define("solid-grant-request-dialog", GrantRequestDialog, {extends: "dialog"})
