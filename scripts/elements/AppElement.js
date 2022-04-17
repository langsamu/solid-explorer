import {WebIdClient} from "../WebIdClient.js"
import {SolidClient} from "../SolidClient.js"
import {Ldp, Mime} from "../Vocabulary.js"
import {ResourceUri} from "../ResourceUri.js"
import {OidcCredentialManager} from "../OidcCredentialManager.js"

export class AppElement extends HTMLBodyElement {
    #oidc

    constructor() {
        super()

        this.#oidc = new OidcCredentialManager
    }

    connectedCallback() {
        addEventListener("load", async () => {
            document.getElementById("fileMenu").addEventListener("click", this.#onFileMenu.bind(this))

            document.getElementById("getIdpFromWebIdButton").addEventListener("click", this.#getIdpFromWebId.bind(this))

            this.#addressBar.addEventListener("resourceUriEntered", this.#onResourceUriEntered.bind(this))
            this.#tree.addEventListener("resourceClick", this.#onTreeResourceClick.bind(this))
            this.#crumbTrail.addEventListener("resourceClick", this.#onCrumbTrailResourceClick.bind(this))
            this.#container.addEventListener("resourceClick", this.#onContainerResourceClick.bind(this))
            this.#container.addEventListener("resourceDoubleClick", this.#onContainerItemDoubleClick.bind(this))

            this.#container.addEventListener("resourceContextMenu", this.#onResourceContextMenu.bind(this))
            this.#tree.addEventListener("resourceContextMenu", this.#onResourceContextMenu.bind(this))

            this.#oidc.addEventListener("needIdp", this.#onNeedIdp.bind(this))
            this.#oidc.addEventListener("needInteraction", this.#onNeedInteraction.bind(this))
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

    get #authenticationDialog() {
        return document.getElementById("authenticationDialog")
    }


    async #getSolidResourceUriFromWebId() {
        const profile = await this.#getWebIdProfile()
        if (!profile) {
            return
        }

        let storage
        if (profile.storages.length === 1) {
            storage = profile.storages
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
        const resourceUri = new ResourceUri(profile.storages, undefined, rootContainerUri)
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

    async #onNeedInteraction(e) {
        if (!await this.#authenticationDialog.getModalValue()) {
            return
        }

        e.detail.resolve()
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
        if (e.detail.resourceUri.isContainer) {
            location.hash = encodeURIComponent(e.detail.resourceUri)
        } else {
            await this.#open(e.detail.resourceUri)
        }
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
            command = await document.getElementById("containerContextDialog").getModalValue()
        } else {
            command = await document.getElementById("resourceContextDialog").getModalValue()
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
        }
    }

    async #onFileMenu() {
        let command = await document.getElementById("fileMenuContextDialog").getModalValue()

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
}
