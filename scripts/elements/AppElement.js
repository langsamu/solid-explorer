import "./GrantRequestDialog.js"
import "./GrantResponseDialog.js"
import "../../packages/dialog/ContextMenuDialog.js"

import {SolidClient} from "../SolidClient.js"
import {Ldp, Mime} from "../../packages/common/Vocabulary.js"
import {ResourceUri} from "../ResourceUri.js"
import {OidcCredentialManager} from "../../packages/oidc/OidcCredentialManager.js"
import {ReactiveAuthenticationClient} from "../ReactiveAuthenticationClient.js"
import {UmaTokenProvider} from "../UmaTokenProvider.js"
import {OidcTokenProvider} from "../../packages/oidc/OidcTokenProvider.js"
import {ResourceSelectedEvent} from "../ResourceSelectedEvent.js"
import {ResourceUriString} from "../ResourceUriStringEvent.js"

class AppElement extends HTMLBodyElement {
    #oidc
    #containerContextDialog
    #resourceContextDialog
    #fileContextDialog
    #grantRequestDialog
    #grantResponseDialog
    #solid

    constructor() {
        super()

        this.#oidc = new OidcCredentialManager
        this.#solid = new SolidClient(new ReactiveAuthenticationClient([new UmaTokenProvider(this.#oidc), new OidcTokenProvider(this.#oidc)]))
    }

    connectedCallback() {
        this.#oidc.addUi(this)
        this.#buildUi()
        this.#wireHandlers()
    }

    #buildUi() {
        this.#containerContextDialog = this.ownerDocument.createElement("dialog", {is: "solid-context-dialog"})
        this.#containerContextDialog.dataset.title = "Container operations"
        this.#containerContextDialog.addItem("open", "Open")
        this.#containerContextDialog.addItem("openNew", "Open in new window")
        this.#containerContextDialog.addItem("download", "Download RDF")
        this.#containerContextDialog.addItem("delete", "Delete")
        this.#containerContextDialog.addItem("deleteRecursive", "Delete recursive")
        this.#containerContextDialog.addItem("newContainer", "New container")
        this.#containerContextDialog.addItem("upload", "Upload")
        this.#containerContextDialog.addItem("uploadVerbose", "Upload…")
        this.#containerContextDialog.addItem("grantAccess", "Grant access")
        this.appendChild(this.#containerContextDialog)

        this.#resourceContextDialog = this.ownerDocument.createElement("dialog", {is: "solid-context-dialog"})
        this.#resourceContextDialog.dataset.title = "Resource operations"
        this.#resourceContextDialog.addItem("open", "Open")
        this.#resourceContextDialog.addItem("openNew", "Open in new window")
        this.#resourceContextDialog.addItem("download", "Download")
        this.#resourceContextDialog.addItem("delete", "Delete")
        this.#resourceContextDialog.addItem("grantAccess", "Grant access")
        this.appendChild(this.#resourceContextDialog)

        this.#fileContextDialog = this.ownerDocument.createElement("dialog", {is: "solid-context-dialog"})
        this.#fileContextDialog.dataset.title = "App operations"
        this.#fileContextDialog.addItem("openNew", "Open new window")
        this.#fileContextDialog.addItem("clearCredentials", "Clear credentials")
        this.appendChild(this.#fileContextDialog)

        this.#grantRequestDialog = this.ownerDocument.createElement("dialog", {is: "solid-grant-request-dialog"})
        this.#grantRequestDialog.dataset.title = "Grant access"
        this.appendChild(this.#grantRequestDialog)

        this.#grantResponseDialog = this.ownerDocument.createElement("dialog", {is: "solid-grant-response-dialog"})
        this.#grantResponseDialog.dataset.title = "Access grant URI"
        this.appendChild(this.#grantResponseDialog)
    }

    #wireHandlers() {
        this.querySelector("#getSolidResourceUriFromWebIdButton").addEventListener("click", this.#getSolidResourceUriFromWebId.bind(this))

        this.#fileMenu.addEventListener("click", this.#onFileMenu.bind(this))
        this.#container.addEventListener("resourceClick", this.#onContainerResourceClick.bind(this))
        this.#container.addEventListener("resourceDoubleClick", this.#onContainerItemDoubleClick.bind(this))
        this.#container.addEventListener("resourceContextMenu", this.#onResourceContextMenu.bind(this))
        this.#tree.addEventListener("resourceContextMenu", this.#onResourceContextMenu.bind(this))

        this.addEventListener(ResourceSelectedEvent.TYPE, this.#onResourceSelected.bind(this))
        this.addEventListener(ResourceUriString.TYPE, this.#onResourceUriString.bind(this))
        this.addEventListener("needChildren", this.#onNeedChildren.bind(this))
        this.addEventListener("needResource", this.#onNeedResource.bind(this))
        this.addEventListener("needRoot", this.#onNeedRoot.bind(this))
        this.addEventListener("deleteResource", this.#onDeleteResource.bind(this))
        this.addEventListener("paste", this.#onPaste.bind(this))

        addEventListener("hashchange", this.#onHashChange.bind(this))
        addEventListener("load", this.#onLoad.bind(this))
    }


    // region element accessors

    get #tree() {
        return this.ownerDocument.getElementById("tree")
    }

    get #container() {
        return this.ownerDocument.getElementById("container")
    }

    get #preview() {
        return this.ownerDocument.getElementById("preview")
    }

    get #addressBar() {
        return this.querySelector("#addressBar form")
    }

    get #crumbTrail() {
        return this.querySelector("ul[is=solid-crumb-trail]")
    }

    get #confirmDialog() {
        return this.ownerDocument.getElementById("confirmDialog")
    }

    get #fileMenu() {
        return this.ownerDocument.getElementById("fileMenu")
    }

    get #uploadDialog() {
        return this.ownerDocument.getElementById("uploadDialog")
    }

    get #newContainerDialog() {
        return this.ownerDocument.getElementById("newContainerDialog")
    }

    get #notFoundDialog() {
        return this.ownerDocument.getElementById("notFoundDialog")
    }

    // endregion

    // region event handlers

    async #onLoad() {
        if (location.hash) {
            dispatchEvent(new HashChangeEvent("hashchange", {newURL: location.href}))
        }
    }

    async #onHashChange(e) {
        if (history.state) {
            const resourceUri = new ResourceUri(history.state.resourceUri, undefined, history.state.root)
            this.dispatchEvent(new ResourceSelectedEvent(resourceUri))
        } else {
            const resourceUriString = decodeURIComponent(new URL(e.newURL).hash.substring(1))
            const rootContainerUri = await this.#solid.getRootContainer(resourceUriString)
            const resourceUri = new ResourceUri(resourceUriString, undefined, rootContainerUri)
            this.dispatchEvent(new ResourceSelectedEvent(resourceUri))

            history.replaceState({resourceUri: resourceUriString, root: rootContainerUri.toString()}, null, location)
        }
    }

    async #onResourceUriString(e) {
        location.hash = encodeURIComponent(e.resourceUri)
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

    /**
     * @param {ResourceSelectedEvent} e
     * @return {Promise<void>}
     */
    async #onResourceSelected(e) {
        this.ownerDocument.title = `${e.resourceUri.name} - Solid Explorer`

        if (e.target === this) {
            return
        }

        const url = new URL(location)
        url.hash = encodeURIComponent(e.resourceUri)

        history.pushState({resourceUri: e.resourceUri.toString(), root: e.resourceUri.root.toString()}, null, url)
    }

    async #onDeleteResource(e) {
        e.detail.resolve(await this.#solid.deleteResource(e.detail.resourceUri))
    }

    async #onResourceContextMenu(e) {
        let command
        if (e.detail.resourceUri.isContainer) {
            command = await this.#containerContextDialog.getModalValue()
        } else {
            command = await this.#resourceContextDialog.getModalValue()
        }

        switch (command) {
            case "open":
                location.hash = encodeURIComponent(e.detail.resourceUri)

                break

            case "openNew":
                if (e.detail.resourceUri.isContainer) {
                    const newWindowUrl = new URL(location)
                    newWindowUrl.hash = encodeURIComponent(e.detail.resourceUri)
                    open(newWindowUrl)
                } else {
                    await this.#open(e.detail.resourceUri)
                }

                break

            case "upload":
                const upload = this.ownerDocument.createElement("input")
                upload.type = "file"
                upload.multiple = true

                upload.addEventListener("change", async () => {
                    await this.#uploadMultiple(e.detail.resourceUri, upload.files)
                    this.#container.refresh()
                })
                upload.click()

                break

            case "uploadVerbose":
                const modalResponse = await this.#uploadDialog.getModalValue()

                if (modalResponse) {
                    const resourceUri = `${e.detail.resourceUri}${modalResponse.name}`
                    await this.#upload(resourceUri, modalResponse.source, modalResponse.mime, modalResponse.file)
                    this.#container.refresh()
                }

                break

            case "newContainer":
                const newContainerName = await this.#newContainerDialog.getModalValue()

                if (newContainerName) {
                    const clean = encodeURIComponent(newContainerName)

                    await this.#solid.postResource(e.detail.resourceUri, Ldp.BasicContainer, Mime.Turtle, clean)
                    this.#container.refresh()
                }

                break

            case "download":
                await this.#download(e.detail.resourceUri)
                break

            case "delete":
                await this.#delete(e.detail.resourceUri)
                break

            case "deleteRecursive":
                await this.#deleteRecursive(e.detail.resourceUri)
                break

            case "grantAccess":
                await this.#grantAccess(e.detail.resourceUri)
                break
        }
    }

    async #onFileMenu() {
        let command = await this.#fileContextDialog.getModalValue()

        switch (command) {
            case "openNew":
                open(location.href)
                break

            case "getSolidResourceUriFromWebIdButton":
                await this.#getSolidResourceUriFromWebId()
                break

            case "clearCredentials":
                this.#oidc.clearCredentials()
                localStorage.clear()

                break
        }
    }

    async #onPaste(e) {
        if (e.clipboardData.files.length) {
            e.preventDefault()
            e.stopPropagation()

            await this.#uploadMultiple(this.#addressBar.resourceUri, e.clipboardData.files)
            this.#container.refresh()
        }
    }

    async #onNeedChildren(e) {
        e.detail.resolve(await this.#solid.getChildren(e.detail.resourceUri))
    }

    async #onNeedResource(e) {
        e.detail.resolve(await this.#solid.getResource(e.detail.resourceUri))
    }

    async #onNeedRoot(e) {
        e.detail.resolve(await this.#solid.getRootContainer(e.detail.resourceUri))
    }

    // endregion

    async #getSolidResourceUriFromWebId() {
        const storage = await this.#oidc.getStorageFromWebId()

        if (!storage) {
            return
        }

        location.hash = encodeURIComponent(storage)
    }

    async #uploadMultiple(containerUri, files) {
        for (const file of files) {
            const contentType = file.type || AppElement.#mapExtension(file.name)
            const rdfSourceMimes = new Set([Mime.Turtle, Mime.JsonLd, Mime.Trig])
            const sourceType = rdfSourceMimes.has(contentType) ? Ldp.RdfSource : Ldp.NonRdfSource
            const resourceUri = `${containerUri}${(encodeURIComponent(file.name))}`

            await this.#upload(resourceUri, sourceType, contentType, file)
        }
    }

    async #upload(resourceUri, sourceType, contentType, file) {
        try {
            await this.#solid.putResource(resourceUri, sourceType, contentType, file)
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
        await this.#solid.deleteResource(resourceUri)
    }

    async #deleteRecursive(resourceUri) {
        if (!await this.#confirmDialog.getModalValue()) {
            return
        }

        const resourcesToDelete = await this.#solid.getDescendantsDepthFirst(resourceUri)

        for (const resource of resourcesToDelete) {
            await this.#deleteWithoutConfirmation(resource)
        }

        await this.#container.refresh()
    }

    async #open(resourceUri) {
        const resourceResponse = await this.#solid.getResource(resourceUri)

        if (!resourceResponse.ok) {
            await this.#notFoundDialog.getModalValue()
            return
        }

        const blob = await resourceResponse.blob()
        const blobUrl = URL.createObjectURL(blob)

        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
        open(blobUrl)
    }

    async #download(resourceUri) {
        const resourceResponse = await this.#solid.getResource(resourceUri)

        if (!resourceResponse.ok) {
            await this.#notFoundDialog.getModalValue()
            return
        }

        const blob = await resourceResponse.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = this.ownerDocument.createElement("a")
        a.href = blobUrl
        a.download = decodeURIComponent(resourceUri.name)
        a.click()
    }

    static #mapExtension(name) {
        const extensionToMime = new Map(Object.entries({
            "txt": Mime.Text,
            "ttl": Mime.Turtle,
            "pdf": Mime.Pdf,
            "svg": Mime.Svg,
            "html": Mime.Html
        }))

        const extensionMatch = name.match(/(?<=\.)\w+$/) // period followed by 1 or more word chars to end of string
        if (extensionMatch) {
            if (extensionToMime.has(extensionMatch[0])) {
                return extensionToMime.get(extensionMatch[0])
            }
        }

        return Mime.OctetStream
    }

    async #grantAccess(resourceUri) {
        const grantRequestModalResponse = await this.#grantRequestDialog.getModalValue()
        if (!grantRequestModalResponse) {
            return
        }

        const accessGrantUri = await this.#solid.grantAccess(resourceUri, grantRequestModalResponse.webid, grantRequestModalResponse.modes)
        if (!accessGrantUri) {
            return
        }

        await this.#grantResponseDialog.showModal(accessGrantUri)
    }
}

customElements.define("solid-app", AppElement, {extends: "body"})
