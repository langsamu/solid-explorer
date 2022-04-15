export class SelectDialogElement extends HTMLDialogElement {
    async connectedCallback() {
        this.#form.addEventListener("submit", this.#onSubmit.bind(this))
        this.#cancelButton?.addEventListener("click", this.#onClickCancel.bind(this))
        this.addEventListener("click", this.#onClick.bind(this))
    }

    /**
     * @param {Iterable<String>} items
     * @return {Promise<String>}
     */
    async getModalValue(items) {
        this.returnValue = ""

        while (this.#select.length) {
            this.#select.remove(0);
        }

        for (const item of items) {
            const option = document.createElement("option")

            option.text = item

            this.#select.add(option)
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

    /** @type HTMLSelectElement */
    get #select() {
        return this.querySelector("select")
    }

    /** @type HTMLButtonElement */
    get #cancelButton() {
        return this.querySelector("button[data-type = 'cancel']")
    }

    #onSubmit() {
        this.returnValue = this.#select?.value
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
