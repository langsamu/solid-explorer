import "../dialog/InputDialog.js"
import "../dialog/SelectDialog.js"
import "../dialog/OkDialog.js"
import "./AuthenticationDialog.js"

import {WebIdClient} from "../../scripts/WebIdClient.js"

class SolidOidcUi extends HTMLElement {
    #idpUriDialog
    #webIdUriDialog
    #idpSelectDialog
    #authenticationDialog
    #storageSelectDialog
    #storageNotFoundInWebIdDialog

    connectedCallback() {
        this.#idpUriDialog = this.ownerDocument.createElement("dialog", {is: "solid-input-dialog"})
        this.#idpUriDialog.id = "idpUriDialog"
        this.#idpUriDialog.dataset.title = "Provide IDP URI"
        this.#idpUriDialog.dataset.label = "IDP URI"
        this.#idpUriDialog.dataset.required = true
        this.#idpUriDialog.dataset.type = "url"
        this.#idpUriDialog.dataset.pattern = "https?://.*"
        this.#idpUriDialog.dataset.placeholder = "https://openid.example.com/username"
        this.#idpUriDialog.addOption("https://login.inrupt.com/")
        this.#idpUriDialog.addOption("https://openid.dev-next.inrupt.com/")
        this.#idpUriDialog.addOption("https://broker.inrupt.com/")
        const idpDescriptionDiv = this.ownerDocument.createElement("aside")
        idpDescriptionDiv.innerHTML = `
The operation you attempted requires proof that you are who you say you are.<br>
Please provide the address of an identity provider that can vouch for you.<br>
The provider will open in a new window where you'll likely login/register.<br>
The window will then close and the operation will continue.<br>
💡 You can also <button type="button">get the IDP URI from your WebID</button>. You might need to provide your WebID if you haven't yet.`
        const getIdpFromWebIdButton = idpDescriptionDiv.querySelector("button")
        getIdpFromWebIdButton.addEventListener("click", this.#getIdpFromWebId.bind(this))
        this.#idpUriDialog.contents.appendChild(idpDescriptionDiv)
        this.appendChild(this.#idpUriDialog)

        this.#webIdUriDialog = this.ownerDocument.createElement("dialog", {is: "solid-input-dialog"})
        this.#webIdUriDialog.id = "webIdUriDialog"
        this.#webIdUriDialog.dataset.title = "Provide WebID URI"
        this.#webIdUriDialog.dataset.label = "WebID URI"
        this.#webIdUriDialog.dataset.required = true
        this.#webIdUriDialog.dataset.type = "url"
        this.#webIdUriDialog.dataset.pattern = "https?://.*"
        this.#webIdUriDialog.dataset.placeholder = "https://id.example.com/username"
        this.#webIdUriDialog.addOption("https://id.inrupt.com/")
        this.#webIdUriDialog.addOption("https://id.dev-next.inrupt.com/")
        this.#webIdUriDialog.addOption("https://pod.inrupt.com/")
        this.appendChild(this.#webIdUriDialog)

        this.#idpSelectDialog = this.ownerDocument.createElement("dialog", {is: "solid-select-dialog"})
        this.#idpSelectDialog.dataset.title = "Choose IDP"
        this.#idpSelectDialog.dataset.label = "IDPs"
        this.appendChild(this.#idpSelectDialog)

        this.#storageSelectDialog = this.ownerDocument.createElement("dialog", {is: "solid-select-dialog"})
        this.#storageSelectDialog.dataset.title = "Select storage URI"
        this.#storageSelectDialog.dataset.label = "Storage URIs"
        this.appendChild(this.#storageSelectDialog)

        this.#authenticationDialog = this.ownerDocument.createElement("dialog", {is: "solid-authentication-dialog"})
        this.appendChild(this.#authenticationDialog)

        this.#storageNotFoundInWebIdDialog = this.ownerDocument.createElement("dialog", {is: "solid-ok-dialog"})
        this.#storageNotFoundInWebIdDialog.dataset.title = "Storage missing from WebID"
        const storageNotFoundInWebIdDiv = this.ownerDocument.createElement("div")
        storageNotFoundInWebIdDiv.innerText = "A storage URI was not found in the WebID profile."
        this.#storageNotFoundInWebIdDialog.contents.appendChild(storageNotFoundInWebIdDiv)
        this.appendChild(this.#storageNotFoundInWebIdDialog)
    }

    async getIdpUri() {
        if (!localStorage.getItem("idpUri")) {
            const value = await this.#idpUriDialog.getModalValue()
            if (!value) {
                return
            }

            localStorage.setItem("idpUri", value)
        }

        return localStorage.getItem("idpUri")
    }

    async getStorageFromWebId() {
        const profile = await this.#getWebIdProfile()
        if (!profile) {
            return
        }

        if (profile.agent.storage.size === 0) {
            this.#storageNotFoundInWebIdDialog.showModal()
            return
        }

        if (profile.agent.storage.size === 1) {
            const [storage] = profile.agent.storage
            return storage
        }

        const storage = await this.#storageSelectDialog.getModalValue(profile.agent.storage)
        if (!storage) {
            return
        }

        return storage
    }

    needInteraction(authenticationUrl) {
        this.#authenticationDialog.showModal(authenticationUrl)
    }

    gotInteraction() {
        this.#authenticationDialog.close()
    }

    /**
     * @return {Promise<Profile>}
     */
    async #getWebIdProfile() {
        const webIdUri = await this.#getWebIdUri()
        if (!webIdUri) {
            return
        }

        return WebIdClient.dereference(webIdUri)
    }

    async #getIdpFromWebId() {
        const profile = await this.#getWebIdProfile()
        if (!profile) {
            return
        }

        if (profile.agent.issuer.size === 1) {
            [this.#idpUriDialog.value] = profile.agent.issuer
        } else {
            this.#idpUriDialog.value = await this.#idpSelectDialog.getModalValue(profile.agent.issuer)
        }
    }

    async #getWebIdUri() {
        if (!localStorage.getItem("webIdUri")) {
            localStorage.setItem("webIdUri", await this.#webIdUriDialog.getModalValue())
        }

        return localStorage.getItem("webIdUri")
    }
}

customElements.define("solid-oidc-ui", SolidOidcUi)
