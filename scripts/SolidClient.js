import {DataFactory, Parser, Store, Writer} from "n3"
import {HttpHeader, HttpMethod, Ldp, Mime, Solid} from "../packages/common/Vocabulary.js"
import {bearer} from "../packages/common/Utils.js"
import {ResourceUri} from "./ResourceUri.js"
import {DatasetWrapper, NamedNodeAs, NamedNodeFrom, SetFrom, TermWrapper} from "@rdfjs/wrapper"

export class SolidClient extends EventTarget {
    #fetch

    constructor(fetch) {
        super()
        this.#fetch = fetch
    }

    async getAcrUri(resourceUri) {
        const response = await this.#fetch(resourceUri, {
            cache: "no-store",
            method: HttpMethod.Head
        })

        return response.headers.get(HttpHeader.Link).match(Solid.AclLinkHeaderParser)[0]
    }

    async getResource(resourceUri) {
        const init = {
            cache: "no-store",
            method: HttpMethod.Get
        }

        return await this.#fetch(resourceUri, init)
    }

    async deleteResource(resourceUri) {
        const init = {
            cache: "no-store",
            method: HttpMethod.Delete
        }

        return await this.#fetch(resourceUri, init)
    }

    async getChildren(resourceUri) {
        if (!(resourceUri instanceof ResourceUri)) {
            resourceUri = new ResourceUri(resourceUri)
        }

        if (!resourceUri.isContainer) {
            return []
        }

        const init = {
            cache: "no-store",
            method: HttpMethod.Get,
            headers: {
                [HttpHeader.Accept]: Mime.Turtle
            }
        }

        const resourceResponse = await this.#fetch(resourceUri, init)

        const resourceText = await resourceResponse.text()
        const dataset = new Store(new Parser({baseIRI: resourceUri.toString()}).parse(resourceText))
        const root = resourceUri.isRoot ? resourceUri : resourceUri.root
        const children = new ContainerGraph(dataset, DataFactory).resource?.contains || []
        return [...children].map(child => new ResourceUri(child, undefined, root))
    }

    async getDescendantsDepthFirst(resourceUri) {
        if (!resourceUri.isContainer) {
            return []
        }

        const descendants = []
        const traverse = async (resource) => {
            descendants.unshift(resource)

            for (const child of await this.getChildren(resource)) {
                await traverse(child)
            }
        }

        await traverse(resourceUri)

        return descendants
    }

    async getRootContainer(resourceUri) {
        const init = {
            cache: "no-store",
            method: HttpMethod.Head
        }

        const resourceResponse = await this.#fetch(resourceUri, init)
        const links = resourceResponse.headers.get(HttpHeader.Link)

        if (links.includes('<http://www.w3.org/ns/pim/space#Storage>; rel="type"')) {
            return new ResourceUri(resourceUri, undefined, resourceUri)
        }

        const a = links.match(/[^<]+(?=>; rel="http:\/\/www.w3.org\/ns\/pim\/space#storage")/)
        if (a) {
            const b = new URL(a[0], resourceUri)
            return new ResourceUri(b, undefined, b)
        }
    }

    async isRootContainer(resourceUri) {
        const init = {
            cache: "no-store",
            method: HttpMethod.Head
        }

        const resourceResponse = await this.#fetch(resourceUri, init)
        const links = resourceResponse.headers.get(HttpHeader.Link)

        return links.includes('<http://www.w3.org/ns/pim/space#Storage>; rel="type"')
    }

    async getAcr(acrUri, accessToken) {
        const acrResponse = await this.#fetch(acrUri, {
            cache: "no-store",
            headers: {
                [HttpHeader.Accept]: Mime.Turtle,
                [HttpHeader.Authorization]: bearer(accessToken)
            }
        })
        const acrBody = await acrResponse.text()

        return new Store(new Parser().parse(acrBody))
    }

    async setAcr(acrUri, dataset, accessToken) {
        const writer = new Writer()
        writer.addQuads([...dataset])

        const acpRdf = await new Promise((resolve, reject) => writer.end((error, result) => {
            if (error) {
                reject(error)
            } else {
                resolve(result)
            }
        }))

        await this.#fetch(acrUri, {
            cache: "no-store",
            method: HttpMethod.Put,
            headers: {
                [HttpHeader.ContentType]: Mime.Turtle,
                [HttpHeader.Authorization]: bearer(accessToken)
            },
            body: acpRdf
        })
    }

    async putResource(resourceUri, sourceType, contentType, body) {
        const init = {
            cache: "no-store",
            method: HttpMethod.Put,
            headers: {
                [HttpHeader.ContentType]: contentType,
                [HttpHeader.Link]: `<${sourceType}>; rel="type"`
            },
            body
        }

        return await this.#fetch(resourceUri, init)
    }

    async postResource(resourceUri, sourceType, contentType, slug) {
        const init = {
            cache: "no-store",
            method: HttpMethod.Post,
            headers: {
                [HttpHeader.Slug]: slug,
                [HttpHeader.ContentType]: contentType,
                [HttpHeader.Link]: `<${sourceType}>; rel="type"`
            }
        }

        return await this.#fetch(resourceUri, init)
    }
}

class ContainerGraph extends DatasetWrapper {
    /**
     * @return {Resource}
     */
    get resource() {
        for (const resource of this.subjectsOf(Ldp.Contains, Resource)) {
            return resource
        }
    }
}

class Resource extends TermWrapper {
    /**
     * @return {Set<URL>}
     */
    get contains() {
        return SetFrom.subjectPredicate(this, Ldp.Contains, NamedNodeAs.url, NamedNodeFrom.url)
    }
}
