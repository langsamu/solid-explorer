import {WebIdClient} from "../WebIdClient.js"
import {SolidClient} from "../SolidClient.js"
import {Ldp, Mime} from "../Vocabulary.js"
import {ResourceUri} from "../ResourceUri.js"

export class AppElement extends HTMLBodyElement {
    #oidcCredentials
    #gettingOidcCredentials

    connectedCallback() {
        addEventListener("load", async () => {
            document.getElementById("getSolidResourceUriFromWebIdButton").addEventListener("click", this.#getSolidResourceUriFromWebId.bind(this))
            document.getElementById("getIdpFromWebIdButton").addEventListener("click", this.#getIdpFromWebId.bind(this))
            document.getElementById("clearCredentialsButton").addEventListener("click", this.#onClearCredentialsClick.bind(this))

            this.#addressBar.addEventListener("resourceUriEntered", this.#onResourceUriEntered.bind(this))
            this.#tree.addEventListener("resourceClick", this.#onTreeResourceClick.bind(this))
            this.#crumbTrail.addEventListener("resourceClick", this.#onCrumbTrailResourceClick.bind(this))
            this.#container.addEventListener("resourceClick", this.#onContainerResourceClick.bind(this))
            this.#container.addEventListener("resourceDoubleClick", this.#onContainerItemDoubleClick.bind(this))
            this.#container.addEventListener("containerItemContextMenu", this.#onContainerItemContextMenu.bind(this))
            this.#container.addEventListener("containerContextMenu", this.#onContainerContextMenu.bind(this))

            this.addEventListener("needChildren", this.#onNeedChildren.bind(this))
            this.addEventListener("needResource", this.#onNeedResource.bind(this))
            this.addEventListener("needRoot", this.#onNeedRoot.bind(this))
            this.addEventListener("deleteResource", this.#onDeleteResource.bind(this))

            addEventListener("hashchange", this.#onHashChange.bind(this))

            if (location.hash) {
                window.dispatchEvent(new HashChangeEvent("hashchange", {newURL: location.href}))
            }
        })
    }

    get #tree() {
        return document.getElementById("tree")
    }

    get #container() {
        return document.getElementById("container")
    }

    get #preview() {
        return document.getElementById("preview")
    }

    get #addressBar() {
        return document.querySelector("#addressBar form")
    }

    get #crumbTrail() {
        return document.querySelector("ul[is=solid-crumb-trail]")
    }

    get #webIdUriDialog() {
        return document.getElementById("webIdUriDialog")
    }

    get #idpUriDialog() {
        return document.getElementById("idpUriDialog")
    }

    get #idpSelectDialog() {
        return document.getElementById("idpSelectDialog")
    }

    get #confirmDialog() {
        return document.getElementById("confirmDialog")
    }


    async #getSolidResourceUriFromWebId() {
        const resourceUriElement = document.getElementById("resourceUriInput")

        const profile = await this.#getWebIdProfile()
        if (!profile) {
            return
        }

        if (profile.storages.length === 1) {
            resourceUriElement.value = profile.storages[0]
            resourceUriElement.focus()
        } else {
            resourceUriElement.value = await storageSelectDialog.getModalValue(profile.storages)
            resourceUriElement.focus()
        }
    }

    async #getWebIdProfile() {
        const webIdUri = await this.#getWebIdUri()
        if (!webIdUri) {
            return
        }

        return await WebIdClient.dereference(webIdUri)
    }

    async #getWebIdUri() {
        if (!localStorage.getItem("webIdUri")) {
            localStorage.setItem("webIdUri", await this.#webIdUriDialog.getModalValue())
        }

        return localStorage.getItem("webIdUri")
    }

    async #getOidcCredentials() {
        if (this.#gettingOidcCredentials instanceof Promise) {
            console.log("waiting")
            await this.#gettingOidcCredentials
        }

        // See if we have cached credentials
        if (this.#oidcCredentials) {
            // Assuming ID token and access token have same expiry
            const expiry = JSON.parse(atob(this.#oidcCredentials.id_token.split(".")[1])).exp * 1000

            // Make sure there's at least ten seconds to go until token expires
            if (new Date(expiry) - Date.now() > 10000) {
                return this.#oidcCredentials
            }
        }

        let releaseLock
        this.#gettingOidcCredentials = new Promise(resolve => releaseLock = () => resolve(this.#gettingOidcCredentials = null))

        const idp = await this.#getIdpUri()
        if (!idp) {
            return releaseLock()
        }

        // These keys will be used
        // (1) by an authN child window to wrap the symmetric key it uses to encrypt the OIDC response and
        // (2) by this window to unwrap that symmetric key so we can decrypt the OIDC response.
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 4096,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-256",
            },
            true,
            ["wrapKey", "unwrapKey"]
        )

        const key = btoa(JSON.stringify(await crypto.subtle.exportKey("jwk", keyPair.publicKey)))
        const authenticationUrl = `./dynamic_authentication.html?${new URLSearchParams({idp, key})}`;
        const credentials = await AppElement.#getOidcCredentialsFromAuthNWindow(authenticationUrl, keyPair.privateKey)

        return releaseLock() || (this.#oidcCredentials = credentials)
    }

    async #getIdpFromWebId() {
        const profile = await this.#getWebIdProfile()
        if (!profile) {
            return
        }

        if (profile.issuers.length === 1) {
            this.#idpUriDialog.value = profile.issuers[0]
        } else {
            this.#idpUriDialog.value = await this.#idpSelectDialog.getModalValue(profile.issuers)
        }
    }

    async #getIdpUri() {
        if (!localStorage.getItem("idpUri")) {
            const value = await this.#idpUriDialog.getModalValue()
            if (!value){
                return
            }

            localStorage.setItem("idpUri", value)
        }

        return localStorage.getItem("idpUri")
    }


    async #onHashChange(e){
        const resourceUriString = decodeURIComponent(new URL(e.newURL).hash.substring(1))
        const credentials = await this.#getOidcCredentials()
        const rootContainerUri = await SolidClient.getRootContainer(resourceUriString, credentials.id_token)
        const resourceUri = new ResourceUri(resourceUriString, undefined, rootContainerUri)

        this.#tree.resourceUri = resourceUri.root
        this.#container.resourceUri = resourceUri
        this.#addressBar.resourceUri = resourceUri
        this.#crumbTrail.resourceUri = resourceUri
        this.#preview.resourceUri = resourceUri
    }

    async #onClearCredentialsClick() {
        this.#oidcCredentials = null
    }

    async #onTreeResourceClick(e) {
        location.hash = encodeURIComponent(e.detail.resourceUri)
    }

    async #onCrumbTrailResourceClick(e) {
        location.hash = encodeURIComponent(e.detail.resourceUri)
    }

    async #onContainerResourceClick(e) {
        this.#preview.resourceUri = e.detail.resourceUri
    }

    async #onContainerItemDoubleClick(e) {
        if (e.detail.resourceUri.isContainer) {
            location.hash = encodeURIComponent(e.detail.resourceUri)
        } else {
            await this.#open(e.detail.resourceUri)
        }
    }

    async #onResourceUriEntered(e) {
        if (e.detail.resourceUri.isContainer) {
            location.hash = encodeURIComponent(e.detail.resourceUri)
        } else {
            await this.#open(e.detail.resourceUri)
        }
    }

    async #onDeleteResource(e) {
        const credentials = await this.#getOidcCredentials()
        const resource = await SolidClient.deleteResource(e.detail.resourceUri, credentials.id_token)
        e.detail.resolve(resource)
    }

    async #onContainerContextMenu(e) {
        const command = await document.getElementById("containerContextDialog").getModalValue()

        switch (command) {
            case "refresh":
                e.target.dispatchEvent(new CustomEvent("gotResourceUri"))
                break

            case "upload":
                const upload = document.createElement("input")
                upload.type = "file"
                upload.multiple = true

                upload.addEventListener("change", async () => {
                    await this.#uploadMultiple(e.detail.resourceUri, upload.files)
                    this.#container.refresh()
                })
                upload.click()

                break

            case "uploadVerbose":
                const modalResponse = await document.getElementById("uploadDialog").getModalValue()

                if (modalResponse) {
                    const fileName = document.getElementById("uploadFileName").value
                    const sourceType = document.getElementById("uploadSourceType").checked ? Ldp.RdfSource : Ldp.NonRdfSource
                    const contentType = document.getElementById("uploadContentType").value
                    const file = document.getElementById("uploadFile").files[0]
                    const resourceUri = `${e.detail.resourceUri}${fileName}`
                    await this.#upload(resourceUri, sourceType, contentType, file)
                    this.#container.refresh()
                }

                break

            case "newContainer":
                const newContainerName = await document.getElementById("newContainerDialog").getModalValue()

                if (newContainerName) {
                    const clean = encodeURIComponent(newContainerName)
                    const credentials = await this.#getOidcCredentials()
                    await SolidClient.postResource(e.detail.resourceUri, Ldp.BasicContainer, Mime.Turtle, clean, credentials.id_token)
                    this.#container.refresh()
                }

                break
        }
    }

    async #onContainerItemContextMenu(e) {
        const command = await document.getElementById("containerItemContextDialog").getModalValue()

        switch (command) {
            case "download":
                await this.#download(e.detail.resourceUri)
                break

            case "delete":
                await this.#delete(e.detail.resourceUri)
                break

            case "deleteRecursive":
                await this.#deleteRecursive(e.detail.resourceUri)
                break
        }
    }


    async #onNeedChildren(e) {
        const credentials = await this.#getOidcCredentials()
        const children = await SolidClient.getChildren(e.detail.resourceUri, credentials.id_token)
        e.detail.resolve(children)
    }

    async #onNeedResource(e) {
        const credentials = await this.#getOidcCredentials()
        const resource = await SolidClient.getResource(e.detail.resourceUri, credentials.id_token, e.detail.signal)
        e.detail.resolve(resource)
    }

    async #onNeedRoot(e) {
        const credentials = await this.#getOidcCredentials()
        const resource = await SolidClient.getRootContainer(e.detail.resourceUri, credentials.id_token, e.detail.signal)
        e.detail.resolve(resource)
    }


    async #uploadMultiple(containerUri, files) {
        for (const file of files) {
            const extensionToMime = new Map(Object.entries({
                "txt": Mime.Text,
                "ttl": Mime.Turtle,
                "pdf": Mime.Pdf,
                "svg": Mime.Svg,
                "html": Mime.Html
            }))

            const rdfSourceMimes = new Set([Mime.Turtle, Mime.JsonLd, Mime.Trig])

            let contentType = Mime.OctetStream
            let sourceType = Ldp.NonRdfSource

            const extensionMatch = file.name.match(/(?<=\.)\w+$/) // period followed by 1 or more word chars to end of string
            if (extensionMatch) {
                if (extensionToMime.has(extensionMatch[0])) {
                    contentType = extensionToMime.get(extensionMatch[0])

                    if (rdfSourceMimes.has(contentType)) {
                        sourceType = Ldp.RdfSource
                    }
                }
            }

            const resourceUri = `${containerUri}${(encodeURIComponent(file.name))}`

            await this.#upload(resourceUri, sourceType, contentType, file)
        }
    }

    async #upload(resourceUri, sourceType, contentType, file) {
        const credentials = await this.#getOidcCredentials()

        try {
            await SolidClient.putResource(resourceUri, sourceType, contentType, file, credentials.id_token)
        } catch (e) {
        }
    }

    async #delete(resourceUri) {
        if (!await this.#confirmDialog.getModalValue()) {
            return
        }

        await this.#deleteWithoutConfirmation(resourceUri)
        await this.#container.refresh()
    }

    async #deleteWithoutConfirmation(resourceUri) {
        const credentials = await this.#getOidcCredentials()
        await SolidClient.deleteResource(resourceUri, credentials.id_token)
    }

    async #deleteRecursive(resourceUri) {
        if (!await this.#confirmDialog.getModalValue()) {
            return
        }

        const credentials = await this.#getOidcCredentials()
        const resourcesToDelete = await SolidClient.getDescendantsDepthFirst(resourceUri, credentials.id_token)

        for (const resource of resourcesToDelete) {
            await this.#deleteWithoutConfirmation(resource)
        }
        await this.#container.refresh()
    }

    async #open(resourceUri) {
        const credentials = await this.#getOidcCredentials()
        const resourceResponse = await SolidClient.getResource(resourceUri, credentials.id_token)

        if (!resourceResponse.ok) {
            await document.getElementById("notFoundDialog").getModalValue()
            return
        }

        const blob = await resourceResponse.blob()
        const blobUrl = URL.createObjectURL(blob)

        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
        open(blobUrl)
    }

    async #download(resourceUri) {
        const credentials = await this.#getOidcCredentials()
        const resourceResponse = await SolidClient.getResource(resourceUri, credentials.id_token)

        if (!resourceResponse.ok) {
            await document.getElementById("notFoundDialog").getModalValue()
            return
        }

        const blob = await resourceResponse.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = blobUrl
        a.download = decodeURIComponent(resourceUri.name)
        a.click()
    }

    static async #getOidcCredentialsFromAuthNWindow(authenticationUrl, encryptionKey) {
        // Open the authN window and wait for it to post us a message with the encrypted OIDC token response
        return await new Promise(async resolve => {
            addEventListener("message", async e => {
                resolve(await this.#decryptOidcTokenResponse(e.data, encryptionKey));
            }, {once: true})

            const authenticationWindow = open(authenticationUrl)

            // If popup was blocked then show alert dialog so next popup attempt is initiated by user click
            if (!authenticationWindow) {
                await document.getElementById("authenticationDialog").getModalValue()
                open(authenticationUrl)
            }
        })
    }

    static async #decryptOidcTokenResponse(data, decryptionKey) {
        // Get symmetric key from event data and unwrap using our own private key
        const key = await crypto.subtle.unwrapKey(
            "jwk",
            data.key,
            decryptionKey,
            {name: "RSA-OAEP"},
            data.algorithm,
            false,
            ["decrypt"])

        // Decrypt response from event data using the unwrapped key it was encrypted with
        const tokenResponseBytes = await crypto.subtle.decrypt(
            data.algorithm,
            key,
            data.response)

        // Convert back from bytes to OIDC response JSON
        return JSON.parse(new TextDecoder().decode(tokenResponseBytes))
    }
}
