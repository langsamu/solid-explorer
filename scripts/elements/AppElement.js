import "./GrantRequestDialog.js"
import "./GrantResponseDialog.js"
import "../../packages/dialog/ContextMenuDialog.js"

import {SolidClient} from "../SolidClient.js"
import {HttpHeader, Ldp, Mime} from "../../packages/common/Vocabulary.js"
import {ResourceUri} from "../ResourceUri.js"
import {OidcCredentialManager} from "../../packages/oidc/OidcCredentialManager.js"
import {ReactiveAuthenticationClient} from "../ReactiveAuthenticationClient.js"
import {UmaTokenProvider} from "../UmaTokenProvider.js"
import {OidcTokenProvider} from "../../packages/oidc/OidcTokenProvider.js"
import {ResourceSelectedEvent} from "../ResourceSelectedEvent.js"
import {ResourceUriString} from "../ResourceUriStringEvent.js"
import {ContentType} from "../../packages/common/ContentType.js"

class AppElement extends HTMLBodyElement {
    #oidc
    #containerContextDialog
    #resourceContextDialog
    #fileContextDialog
    #grantRequestDialog
    #grantResponseDialog
    #solid
    #gettingStartedDialog
    #loadingDialog
    #loadingCounter = 0

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
        this.#containerContextDialog.addItem("newContainer", "New container…")
        this.#containerContextDialog.addItem("newResource", "New resource…")
        this.#containerContextDialog.addItem("upload", "Upload")
        this.#containerContextDialog.addItem("uploadVerbose", "Upload…")
        this.#containerContextDialog.addItem("grantAccess", "Grant access")
        if (window.ClipboardItem instanceof Function) {
            this.#containerContextDialog.addItem("copy", "Copy")
        }
        this.#containerContextDialog.addItem("copyUri", "Copy URI")
        this.appendChild(this.#containerContextDialog)

        this.#resourceContextDialog = this.ownerDocument.createElement("dialog", {is: "solid-context-dialog"})
        this.#resourceContextDialog.dataset.title = "Resource operations"
        this.#resourceContextDialog.addItem("open", "Open")
        this.#resourceContextDialog.addItem("openNew", "Open in new window")
        this.#resourceContextDialog.addItem("download", "Download")
        this.#resourceContextDialog.addItem("delete", "Delete")
        this.#resourceContextDialog.addItem("grantAccess", "Grant access")
        if (window.ClipboardItem instanceof Function) {
            this.#resourceContextDialog.addItem("copy", "Copy")
        }
        this.#resourceContextDialog.addItem("copyUri", "Copy URI")
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

        this.#gettingStartedDialog = this.ownerDocument.createElement("dialog", {is: "solid-ok-dialog"})
        this.#gettingStartedDialog.dataset.title = "Getting started"
        this.#gettingStartedDialog.contents.innerHTML = `
            <h1>Solid Explorer</h1>
            <p>An experimental application to interact with Solid resources.</p>
            <p>
                <span><strong>To start</strong>, either </span>
                <ul>
                    <li>click the <q><a href="#getSolidResourceUriFromWebIdButton">Get resource URI from WebID</a></q> button or</li>
                    <li>type a Solid resource URI in the <q><a href="#resourceUriInput">Resource URI</a></q> field, then hit <code>Enter</code> or click the <q><a href="#goButton">go</a></q> button.</li>
                    <li>Click the <q><a href="#helpButton">Help</a></q> button to show this message.</li>
                </ul></p>
            <p>
            <p><a href="https://github.com/langsamu/solid-explorer">Source code</a> on <svg style="height: 0.75em" viewBox="0 0 127.06 34.36" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M112.83 27.61v-9.96s1.38-.85 3.08-1c2.15-.2 4.22.45 4.22 5.58 0 5.4-.93 6.47-3.83 6.38-2.07-.06-3.47-1-3.47-1zm.13-15.21V1.75a.5.5 0 0 0-.5-.5h-6.02a.5.5 0 0 0-.5.5V33.2c0 .27.22.5.5.5h4.18c.19 0 .33-.1.44-.27.1-.17.25-1.45.25-1.45s2.47 2.34 7.13 2.34c5.48 0 8.62-2.78 8.62-12.48 0-9.7-5.01-10.96-8.4-10.96-3.4 0-5.7 1.51-5.7 1.51zm-10.61-.8h-5.97a.5.5 0 0 0-.5.5v15.42s-1.5 1.11-3.66 1.11c-2.15 0-2.72-.97-2.72-3.08V12.1a.5.5 0 0 0-.5-.5h-6.05a.5.5 0 0 0-.5.5v14.47c0 6.25 3.49 7.79 8.28 7.79 3.94 0 7.11-2.18 7.11-2.18s.15 1.15.22 1.28c.07.14.25.28.44.28l3.85-.02a.5.5 0 0 0 .5-.5V12.1a.5.5 0 0 0-.5-.5m-66.96.45a.5.5 0 0 0-.5-.5h-6c-.27 0-.51.28-.51.56v20.8c0 .61.38.8.87.8h5.4c.6 0 .74-.3.74-.8zM31.94 1.96a3.9 3.9 0 0 0-3.87 3.92 3.9 3.9 0 0 0 3.87 3.91 3.9 3.9 0 0 0 3.88-3.91 3.9 3.9 0 0 0-3.88-3.92zM13.8 14.71a.5.5 0 0 0-.5.5v5.22c0 .27.22.5.5.5h4.16v6.48s-.93.32-3.52.32c-3.05 0-7.31-1.11-7.31-10.48 0-9.38 4.44-10.61 8.6-10.61 3.6 0 5.16.63 6.15.94.31.1.6-.21.6-.49l1.19-5.04a.47.47 0 0 0-.2-.4C23.08 1.38 20.64 0 14.45 0 7.31 0 0 3.03 0 17.61s8.37 16.75 15.43 16.75c5.84 0 9.38-2.5 9.38-2.5.15-.07.16-.28.16-.37V15.2a.5.5 0 0 0-.5-.5zM79.5 1.75a.5.5 0 0 0-.5-.5h-6a.5.5 0 0 0-.5.5v11.62h-9.37V1.75a.5.5 0 0 0-.5-.5h-6.01a.5.5 0 0 0-.5.5V33.2c0 .27.22.5.5.5h6a.5.5 0 0 0 .5-.5V19.75h9.38l-.02 13.46c0 .27.22.5.5.5H79a.5.5 0 0 0 .5-.5zm-31.34 9.8V5.58c0-.23-.13-.34-.39-.34h-6.14c-.24 0-.37.1-.37.33v6.16l-3.29.8a.5.5 0 0 0-.36.48v3.87c0 .28.22.5.5.5h3.15v9.31c0 6.92 4.85 7.6 8.12 7.6 1.5 0 3.29-.49 3.58-.6.18-.06.28-.25.28-.45V29a.5.5 0 0 0-.49-.5c-.26 0-.93.1-1.63.1-2.21 0-2.96-1.03-2.96-2.36v-8.85h4.5a.5.5 0 0 0 .5-.5v-4.84a.5.5 0 0 0-.5-.5z" fill="#0f0e0f"></path></svg>.</p>
            <label>
                <input autofocus type="checkbox">
                <span>Show on startup</span>
            </label>`
        this.appendChild(this.#gettingStartedDialog)

        this.#loadingDialog = this.ownerDocument.createElement("dialog")
        this.#loadingDialog.innerText = "⟳ Loading"
        this.appendChild(this.#loadingDialog)
    }

    #wireHandlers() {
        this.querySelector("#getSolidResourceUriFromWebIdButton").addEventListener("click", this.#getSolidResourceUriFromWebId.bind(this))
        this.querySelector("#helpButton").addEventListener("click", this.#onHelp.bind(this))

        this.#fileMenu.addEventListener("click", this.#onFileMenu.bind(this))
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
        this.addEventListener("resourceChanged", this.#onResourceChanged.bind(this))

        addEventListener("hashchange", this.#onHashChange.bind(this))
        addEventListener("load", this.#onLoad.bind(this))

        this.#solid.addEventListener("fetching", () => {
            this.#loadingCounter++

            if (!this.#loadingDialog.open) {
                return this.#loadingDialog.show()
            }
        })
        this.#solid.addEventListener("fetched", () => {
            if (--this.#loadingCounter === 0) {
                return this.#loadingDialog.close()
            }
        })
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

    get #newResourceDialog() {
        return this.ownerDocument.getElementById("newResourceDialog")
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
        let resourceUriString
        try {
            resourceUriString = new URL(decodeURIComponent(location.hash.substring(1)))
        } catch {
        }

        if (resourceUriString) {
            dispatchEvent(new HashChangeEvent("hashchange", {newURL: location.href}))
        } else {
            const previousShow = JSON.parse(localStorage.getItem("gettingStarted.showOnStartup"))
            if (previousShow === null || previousShow) {
                await this.#onHelp()
            }
        }
    }

    async #onHelp() {
        const showOnStartupInput = this.#gettingStartedDialog.contents.querySelector("input");
        showOnStartupInput.removeAttribute("checked")
        if (localStorage.getItem("gettingStarted.showOnStartup") !== "false") {
            showOnStartupInput.setAttribute("checked", "true")
        }

        await this.#gettingStartedDialog.getModalValue()

        localStorage.setItem("gettingStarted.showOnStartup", JSON.stringify(showOnStartupInput.checked))
    }

    async #onHashChange(e) {
        const resourceUriString = decodeURIComponent(new URL(e.newURL).hash.substring(1));
        try {
            new URL(resourceUriString)
        } catch {
            return
        }

        if (history.state) {
            const resourceUri = new ResourceUri(history.state.resourceUri, undefined, history.state.root)
            this.dispatchEvent(new ResourceSelectedEvent(resourceUri))
        } else {
            const rootContainerUri = await this.#solid.getRootContainer(resourceUriString)
            const resourceUri = new ResourceUri(resourceUriString, undefined, rootContainerUri)
            this.dispatchEvent(new ResourceSelectedEvent(resourceUri))

            history.replaceState({resourceUri: resourceUriString, root: rootContainerUri.toString()}, null, location)
        }
    }

    async #onResourceUriString(e) {
        location.hash = encodeURIComponent(e.resourceUri)
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

        history.pushState({
            resourceUri: e.resourceUri.toString(),
            root: e.resourceUri.isRoot ? e.resourceUri.toString() : e.resourceUri.root.toString()
        }, null, url)
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

            case "newResource":
                const newResourceResponse = await this.#newResourceDialog.getModalValue()

                if (newResourceResponse) {
                    const resourceUri = `${e.detail.resourceUri}${newResourceResponse.name}`
                    await this.#upload(resourceUri, newResourceResponse.source, newResourceResponse.mime)
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

            case "copy":
                await this.#copy(e.detail.resourceUri)
                break

            case "copyUri":
                await this.#copyUri(e.detail.resourceUri)
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

    async #onResourceChanged(e) {
        const response = await this.#solid.putResource(e.detail.resourceUri, e.detail.resourceType, e.detail.contentType, e.detail.body);
        e.detail.resolve(response)
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

    async #copy(resourceUri) {
        const response = await this.#solid.getResource(resourceUri)

        if (!response.ok) {
            await this.#notFoundDialog.getModalValue()
            return
        }

        const mime = new ContentType(response.headers.get(HttpHeader.ContentType)).mime

        if (mime.type === "image") {
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)

            const img = new Image()
            img.addEventListener("load", async () => {
                URL.revokeObjectURL(url)

                const canvas = this.ownerDocument.createElement("canvas")
                canvas.width = img.width
                canvas.height = img.height
                canvas.getContext("2d").drawImage(img, 0, 0)

                const result = await new Promise(resolve => canvas.toBlob(resolve))
                const clipboardItem = new ClipboardItem({[result.type]: result})
                await navigator.clipboard.write([clipboardItem])
            })

            img.src = url
        } else {
            await navigator.clipboard.writeText(await response.text())
        }
    }

    async #copyUri(resourceUri) {
        await navigator.clipboard.writeText(resourceUri.toString())
    }
}

customElements.define("solid-app", AppElement, {extends: "body"})
