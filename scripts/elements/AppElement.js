import {WebIdClient} from "../WebIdClient.js"
import {SolidClient} from "../SolidClient.js"
import {Ldp, Mime} from "../Vocabulary.js"
import {ResourceUri} from "../ResourceUri.js"
import {OidcCredentialManager} from "../../packages/oidc/index.js"

export class AppElement extends HTMLBodyElement {
    #oidc
    #webIdUriDialog
    #idpUriDialog
    #containerContextDialog
    #resourceContextDialog
    #fileContextDialog
    #authenticationDialog
    #grantRequestDialog
    #grantResponseDialog

    constructor() {
        super()

        this.#oidc = new OidcCredentialManager
    }

    connectedCallback() {
        addEventListener("load", async () => {
            this.#webIdUriDialog = document.createElement("dialog", {is: "solid-input-dialog"})
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
            document.body.appendChild(this.#webIdUriDialog)

            this.#idpUriDialog = document.createElement("dialog", {is: "solid-input-dialog"})
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
            const idpDescriptionDiv = document.createElement("aside")
            idpDescriptionDiv.innerHTML = `
The operation you attempted requires proof that you are who you say you are.<br>
Please provide the address of an identity provider that can vouch for you.<br>
The provider will open in a new window where you'll likely login/register.<br>
The window will then close and the operation will continue.<br>
💡 You can also <button type="button">get the IDP URI from your WebID</button>. You might need to provide your WebID if you haven't yet.`
            const getIdpFromWebIdButton = idpDescriptionDiv.querySelector("button")
            getIdpFromWebIdButton.addEventListener("click", this.#getIdpFromWebId.bind(this))
            this.#idpUriDialog.contents.appendChild(idpDescriptionDiv)
            document.body.appendChild(this.#idpUriDialog)

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
            this.#fileContextDialog.addItem("getSolidResourceUriFromWebIdButton", "Get resourceuri from webid")
            this.#fileContextDialog.addItem("clearCredentials", "Clear credentials")
            document.body.appendChild(this.#fileContextDialog)

            document.getElementById("fileMenu").addEventListener("click", this.#onFileMenu.bind(this))

            this.#authenticationDialog = document.createElement("dialog", {is: "solid-authentication-dialog"})
            document.body.appendChild(this.#authenticationDialog)

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

            this.#oidc.addEventListener("needIdp", this.#onNeedIdp.bind(this))
            this.#oidc.addEventListener("needInteraction", this.#onNeedInteraction.bind(this))
            this.#oidc.addEventListener("gotInteraction", this.#onGotInteraction.bind(this))
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

    get #idpSelectDialog() {
        return document.getElementById("idpSelectDialog")
    }

    get #confirmDialog() {
        return document.getElementById("confirmDialog")
    }


    async #getSolidResourceUriFromWebId() {
        const profile = await this.#getWebIdProfile()
        if (!profile) {
            return
        }

        let storage
        if (profile.storages.length === 1) {
            storage = profile.storages[0]
        } else {
            storage = await storageSelectDialog.getModalValue(profile.storages)
            if (!storage) {
                return
            }
        }

        const credentials = await this.#oidc.getCredentials()
        if (!credentials) {
            return
        }

        const rootContainerUri = await SolidClient.getRootContainer(storage, credentials.id_token)
        const resourceUri = new ResourceUri(storage, undefined, rootContainerUri)
        this.#addressBar.resourceUri = resourceUri
        this.#addressBar.focus()
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
            if (!value) {
                return
            }

            localStorage.setItem("idpUri", value)
        }

        return localStorage.getItem("idpUri")
    }

    async #onNeedIdp(e) {
        e.detail.resolve(await this.#getIdpUri())
    }

    #onNeedInteraction(e) {
        this.#authenticationDialog.showModal(e.detail.authenticationUrl)
    }

    #onGotInteraction() {
        this.#authenticationDialog.close()
    }

    async #onHashChange(e) {
        const resourceUriString = decodeURIComponent(new URL(e.newURL).hash.substring(1))
        const credentials = await this.#oidc.getCredentials()
        if (!credentials) {
            return
        }

        const rootContainerUri = await SolidClient.getRootContainer(resourceUriString, credentials.id_token)
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
        const credentials = await this.#oidc.getCredentials()
        if (!credentials) {
            return
        }

        const resource = await SolidClient.deleteResource(e.detail.resourceUri, credentials.id_token)
        e.detail.resolve(resource)
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
                    const credentials = await this.#oidc.getCredentials()
                    if (!credentials) {
                        return
                    }

                    await SolidClient.postResource(e.detail.resourceUri, Ldp.BasicContainer, Mime.Turtle, clean, credentials.id_token)
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
        const credentials = await this.#oidc.getCredentials()
        if (!credentials) {
            return
        }

        const children = await SolidClient.getChildren(e.detail.resourceUri, credentials.id_token)
        e.detail.resolve(children)
    }

    async #onNeedResource(e) {
        const credentials = await this.#oidc.getCredentials()
        if (!credentials) {
            return
        }

        const resource = await SolidClient.getResource(e.detail.resourceUri, credentials.id_token, e.detail.signal)
        e.detail.resolve(resource)
    }

    async #onNeedRoot(e) {
        const credentials = await this.#oidc.getCredentials()
        if (!credentials) {
            return
        }

        const resource = await SolidClient.getRootContainer(e.detail.resourceUri, credentials.id_token, e.detail.signal)
        e.detail.resolve(resource)
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
        const credentials = await this.#oidc.getCredentials()
        if (!credentials) {
            return
        }


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
        const credentials = await this.#oidc.getCredentials()
        if (!credentials) {
            return
        }

        await SolidClient.deleteResource(resourceUri, credentials.id_token)
    }

    async #deleteRecursive(resourceUri) {
        if (!await this.#confirmDialog.getModalValue()) {
            return
        }

        const credentials = await this.#oidc.getCredentials()
        if (!credentials) {
            return
        }

        const resourcesToDelete = await SolidClient.getDescendantsDepthFirst(resourceUri, credentials.id_token)

        for (const resource of resourcesToDelete) {
            await this.#deleteWithoutConfirmation(resource)
        }
        await this.#container.refresh()
    }

    async #open(resourceUri) {
        const credentials = await this.#oidc.getCredentials()
        if (!credentials) {
            return
        }

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
        const credentials = await this.#oidc.getCredentials()
        if (!credentials) {
            return
        }

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

        const credentials = await this.#oidc.getCredentials()
        const accessGrantUri = await SolidClient.grantAccess(resourceUri, grantRequestModalResponse.webid, grantRequestModalResponse.modes, credentials.id_token)
        if (!accessGrantUri) {
            return
        }

        await this.#grantResponseDialog.showModal(accessGrantUri)
    }
}
