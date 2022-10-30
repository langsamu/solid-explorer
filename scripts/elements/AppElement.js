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

        addEventListener("load", async () => {
            this.#containerContextDialog = document.createElement("dialog", {is: "solid-context-dialog"})
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
            document.body.appendChild(this.#containerContextDialog)

            this.#resourceContextDialog = document.createElement("dialog", {is: "solid-context-dialog"})
            this.#resourceContextDialog.dataset.title = "Resource operations"
            this.#resourceContextDialog.addItem("open", "Open")
            this.#resourceContextDialog.addItem("openNew", "Open in new window")
            this.#resourceContextDialog.addItem("download", "Download")
            this.#resourceContextDialog.addItem("delete", "Delete")
            this.#resourceContextDialog.addItem("grantAccess", "Grant access")
            document.body.appendChild(this.#resourceContextDialog)

            this.#fileContextDialog = document.createElement("dialog", {is: "solid-context-dialog"})
            this.#fileContextDialog.dataset.title = "App operations"
            this.#fileContextDialog.addItem("openNew", "Open new window")
            this.#fileContextDialog.addItem("getSolidResourceUriFromWebIdButton", "Get resource URI from WebID")
            this.#fileContextDialog.addItem("clearCredentials", "Clear credentials")
            document.body.appendChild(this.#fileContextDialog)

            document.getElementById("fileMenu").addEventListener("click", this.#onFileMenu.bind(this))

            this.#grantRequestDialog = document.createElement("dialog", {is: "solid-grant-request-dialog"})
            this.#grantRequestDialog.dataset.title = "Grant access"
            document.body.appendChild(this.#grantRequestDialog)

            this.#grantResponseDialog = document.createElement("dialog", {is: "solid-grant-response-dialog"})
            this.#grantResponseDialog.dataset.title = "Access grant URI"
            document.body.appendChild(this.#grantResponseDialog)

            this.#addressBar.addEventListener("resourceUriEntered", this.#onResourceUriEntered.bind(this))
            this.#tree.addEventListener("resourceClick", this.#onTreeResourceClick.bind(this))
            this.#crumbTrail.addEventListener("resourceClick", this.#onCrumbTrailResourceClick.bind(this))
            this.#container.addEventListener("resourceClick", this.#onContainerResourceClick.bind(this))
            this.#container.addEventListener("resourceDoubleClick", this.#onContainerItemDoubleClick.bind(this))

            this.#container.addEventListener("resourceContextMenu", this.#onResourceContextMenu.bind(this))
            this.#tree.addEventListener("resourceContextMenu", this.#onResourceContextMenu.bind(this))

            this.addEventListener("needChildren", this.#onNeedChildren.bind(this))
            this.addEventListener("needResource", this.#onNeedResource.bind(this))
            this.addEventListener("needRoot", this.#onNeedRoot.bind(this))
            this.addEventListener("deleteResource", this.#onDeleteResource.bind(this))
            this.addEventListener("paste", this.#onPaste.bind(this))

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

    get #confirmDialog() {
        return document.getElementById("confirmDialog")
    }


    async #getSolidResourceUriFromWebId() {
        const storage = await this.#oidc.getStorageFromWebId()

        const rootContainerUri = await this.#solid.getRootContainer(storage)
        this.#addressBar.resourceUri = new ResourceUri(storage, undefined, rootContainerUri)
        this.#addressBar.focus()
    }

    async #onHashChange(e) {
        const resourceUriString = decodeURIComponent(new URL(e.newURL).hash.substring(1))

        const rootContainerUri = await this.#solid.getRootContainer(resourceUriString)
        const resourceUri = new ResourceUri(resourceUriString, undefined, rootContainerUri)

        this.#tree.resourceUri = resourceUri.root
        this.#container.resourceUri = resourceUri.isContainer ? resourceUri : resourceUri.parent
        this.#addressBar.resourceUri = resourceUri
        this.#crumbTrail.resourceUri = resourceUri
        this.#preview.resourceUri = resourceUri
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
        location.hash = encodeURIComponent(e.detail.resourceUri)
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
                    const resourceUri = `${e.detail.resourceUri}${modalResponse.name}`
                    await this.#upload(resourceUri, modalResponse.source, modalResponse.mime, modalResponse.file)
                    this.#container.refresh()
                }

                break

            case "newContainer":
                const newContainerName = await document.getElementById("newContainerDialog").getModalValue()

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
            await document.getElementById("notFoundDialog").getModalValue()
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
