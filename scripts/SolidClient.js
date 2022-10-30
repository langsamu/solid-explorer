import "../packages/unpkg.com/n3@1.16.2/browser/n3.min.js"
import "../packages/unpkg.com/jsonld@8.1.0/dist/jsonld.esm.min.js"
import {UmaClient} from "./UmaClient.js"
import {HttpHeader, HttpMethod, Ldp, Mime, Solid} from "../packages/common/Vocabulary.js"
import {bearer, toTriples} from "../packages/common/Utils.js"
import {ResourceUri} from "./ResourceUri.js"

export class SolidClient {
    /** @type {ReactiveAuthenticationClient} */
    #authenticationClient

    constructor(authenticationClient) {
        this.#authenticationClient = authenticationClient;
    }

    async getAcrUri(resourceUri) {
        const response = await this.#authenticationClient.fetch(resourceUri, {
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

        return await this.#authenticationClient.fetch(resourceUri, init)
    }

    async deleteResource(resourceUri) {
        const init = {
            cache: "no-store",
            method: HttpMethod.Delete
        }

        return await this.#authenticationClient.fetch(resourceUri, init)
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
                [HttpHeader.Accept]: Mime.JsonLd
            }
        }

        const resourceResponse = await this.#authenticationClient.fetch(resourceUri, init)

        const resourceJson = await resourceResponse.json()
        const triples = toTriples(await jsonld.flatten(resourceJson))

        return triples
            .filter(t => t.subject === resourceUri.toString())
            .filter(t => t.predicate === Ldp.Contains)
            .map(t => t.object)
            .map(o => new ResourceUri(o, resourceUri, resourceUri.root))
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

        const resourceResponse = await this.#authenticationClient.fetch(resourceUri, init)
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

        const resourceResponse = await this.#authenticationClient.fetch(resourceUri, init)
        const links = resourceResponse.headers.get(HttpHeader.Link)

        return links.includes('<http://www.w3.org/ns/pim/space#Storage>; rel="type"')
    }

    async getAcr(acrUri, accessToken) {
        const acrResponse = await this.#authenticationClient.fetch(acrUri, {
            cache: "no-store",
            headers: {
                [HttpHeader.Accept]: Mime.Turtle,
                [HttpHeader.Authorization]: bearer(accessToken)
            }
        })
        const acrBody = await acrResponse.text()

        return new N3.Store(new N3.Parser().parse(acrBody))
    }

    async setAcr(acrUri, dataset, accessToken) {
        const writer = new N3.Writer()
        dataset.forEach(writer.addQuad.bind(writer))

        const acpRdf = await new Promise((resolve, reject) => writer.end((error, result) => {
            if (error) {
                reject(error)
            } else {
                resolve(result)
            }
        }))

        await this.#authenticationClient.fetch(acrUri, {
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

        return await this.#authenticationClient.fetch(resourceUri, init)
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

        return await this.#authenticationClient.fetch(resourceUri, init)
    }

    async grantAccess(resourceUri, isProvidedTo, mode) {
        const [, umaServer] = await UmaClient.parseUmaChallenge(resourceUri, {method: HttpMethod.Head})
        if (!umaServer) {
            console.log("UMA not supported")
            return
        }

        const uma = new UmaClient(umaServer)
        const umaDisco = await uma.discover()
        const vcServer = umaDisco.verifiable_credential_issuer

        const vcDiscoSuffix = "/.well-known/vc-configuration"
        const response = await fetch(new URL(vcDiscoSuffix, vcServer))
        const vcDisco = await response.json()
        const issueEndpoint = vcDisco.issuerService

        const issuanceRequest = {
            credential: {
                "@context": [
                    "https://vc.inrupt.com/credentials/v1",
                    "https://www.w3.org/2018/credentials/v1",
                ],
                type: ["SolidAccessGrant"],
                credentialSubject: {
                    providedConsent: {
                        forPersonalData: [resourceUri],
                        mode,
                        isProvidedTo,
                        hasStatus: "ConsentStatusExplicitlyGiven",
                    }
                }
            }
        }
        const accessGrantResponse = await this.#authenticationClient.fetch(issueEndpoint, {
            method: HttpMethod.Post,
            headers: {
                [HttpHeader.ContentType]: Mime.Json
            },
            body: JSON.stringify(issuanceRequest)
        })

        return accessGrantResponse.headers.get(HttpHeader.Location)
    }
}
