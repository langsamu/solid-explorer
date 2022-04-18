export class DialogElement extends HTMLDialogElement {
    async connectedCallback() {
        this.#form.addEventListener("submit", this.#onSubmit.bind(this))
        this.#input?.addEventListener("input", this.#onInput.bind(this))
        this.#cancelButton?.addEventListener("click", this.#onClickCancel.bind(this))
        this.addEventListener("click", this.#onClick.bind(this))
    }

    /**
     * @return {Promise<String>}
     */
    async getModalValue() {
        this.returnValue = ""

        if (this.#input) {
            this.#input.value = ""
        }

        if (this.#output) {
            this.#output.value = ""
        }

        return await new Promise(resolve => {
            this.addEventListener("close", e => resolve(e.target.returnValue), {once: true})
            this.showModal()
        })
    }

    /** @type HTMLFormElement */
    get #form() {
        return this.querySelector("form")
    }

    /** @type HTMLInputElement */
    get #input() {
        return this.querySelector("input")
    }

    /** @type HTMLOutputElement */
    get #output() {
        return this.querySelector("output")
    }

    /** @type HTMLButtonElement */
    get #cancelButton() {
        return this.querySelector("button[data-type = 'cancel']")
    }

    set value(value) {
        this.#input.value = value
    }

    #onInput() {
        this.#output.value = this.#input.validationMessage
    }

    #onSubmit(e) {
        if (this.#input) {
            if (e.submitter) {
                e.submitter.value = this.#input.value
            }
            this.returnValue = this.#input?.value
        }
    }

    #onClickCancel() {
        this.close()
    }

    #onClick(e) {
        if (e.target !== this) {
            return
        }

        if (e.offsetX < 0 || e.offsetY < 0 || e.offsetX > this.offsetWidth || e.offsetY > this.offsetHeight) {
            this.close()
        }
    }
}
