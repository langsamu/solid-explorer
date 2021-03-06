import "https://unpkg.com/n3@1.16.2/browser/n3.min.js"
import "https://unpkg.com/jsonld@5.2.0/dist/jsonld.esm.min.js"
import {UmaClient} from "./UmaClient.js"
import {HttpHeader, HttpMethod, Ldp, Mime, Solid} from "./Vocabulary.js"
import {bearer, fetchJson, toTriples} from "./Utils.js"
import {ResourceUri} from "./ResourceUri.js"

export class SolidClient {
    static async getAcrUri(resourceUri, idToken) {
        const umaFetch = UmaClient.fetch.bind(undefined, idToken)
        const resourceResponse = await umaFetch(resourceUri, {cache: "no-store", method: HttpMethod.Head})
        const acrUri = resourceResponse.headers.get(HttpHeader.Link).match(Solid.AclLinkHeaderParser)[0]

        return acrUri
    }

    static async getResource(resourceUri, idToken, abortSignal) {
        const umaFetch = UmaClient.fetch.bind(undefined, idToken)
        const init = {
            cache: "no-store",
            method: HttpMethod.Get
        }

        if (abortSignal) {
            init.signal = abortSignal
        }

        const resourceResponse = await umaFetch(resourceUri, init)

        return resourceResponse
    }

    static async deleteResource(resourceUri, idToken) {
        const umaFetch = UmaClient.fetch.bind(undefined, idToken)
        const init = {
            cache: "no-store",
            method: HttpMethod.Delete
        }

        const resourceResponse = await umaFetch(resourceUri, init)

        return resourceResponse
    }

    static async getChildren(resourceUri, idToken, abortSignal) {
        if (!(resourceUri instanceof ResourceUri)) {
            resourceUri = new ResourceUri(resourceUri)
        }

        if (!resourceUri.isContainer) {
            return []
        }

        const umaFetch = UmaClient.fetch.bind(undefined, idToken)
        const init = {
            cache: "no-store",
            method: HttpMethod.Get,
            headers: {
                [HttpHeader.Accept]: Mime.JsonLd
            }
        }

        if (abortSignal) {
            init.signal = abortSignal
        }

        const resourceResponse = await umaFetch(resourceUri, init)

        const resourceJson = await resourceResponse.json()
        const triples = toTriples(await jsonld.flatten(resourceJson))

        return triples
            .filter(t => t.subject === resourceUri.toString())
            .filter(t => t.predicate === Ldp.Contains)
            .map(t => t.object)
            .map(o => new ResourceUri(o, resourceUri, resourceUri.root))
    }

    static async getDescendantsDepthFirst(resourceUri, idToken, abortSignal) {
        if (!resourceUri.isContainer) {
            return []
        }

        const descendants = []
        const traverse = async (resource) => {
            descendants.unshift(resource)

            for (const child of await this.getChildren(resource, idToken, abortSignal)) {
                await traverse(child)
            }
        }

        await traverse(resourceUri)

        return descendants
    }

    static async getRootContainer(resourceUri, idToken, abortSignal) {
        const umaFetch = UmaClient.fetch.bind(undefined, idToken)
        const init = {
            cache: "no-store",
            method: HttpMethod.Head
        }

        if (abortSignal) {
            init.signal = abortSignal
        }

        const resourceResponse = await umaFetch(resourceUri, init)
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

    async isRootContainer(resourceUri, idToken, abortSignal) {
        const umaFetch = UmaClient.fetch.bind(undefined, idToken)
        const init = {
            cache: "no-store",
            method: HttpMethod.Head
        }

        if (abortSignal) {
            init.signal = abortSignal
        }

        const resourceResponse = await umaFetch(resourceUri, init)
        const links = resourceResponse.headers.get(HttpHeader.Link)

        return links.includes('<http://www.w3.org/ns/pim/space#Storage>; rel="type"')
    }

    static async getAcr(acrUri, accessToken) {
        const acrResponse = await fetch(acrUri, {
            cache: "no-store",
            headers: {
                [HttpHeader.Accept]: Mime.Turtle,
                [HttpHeader.Authorization]: bearer(accessToken)
            }
        })
        const acrBody = await acrResponse.text()

        const dataset = new N3.Store()
        dataset.addQuads(new N3.Parser().parse(acrBody))

        return dataset
    }

    static async setAcr(acrUri, dataset, accessToken) {
        const writer = new N3.Writer()
        dataset.forEach(writer.addQuad.bind(writer))

        const acpRdf = await new Promise((resolve, reject) => writer.end((error, result) => {
            if (error) {
                reject(error)
            } else {
                resolve(result)
            }
        }))

        await fetch(acrUri, {
            cache: "no-store",
            method: HttpMethod.Put,
            headers: {
                [HttpHeader.ContentType]: Mime.Turtle,
                [HttpHeader.Authorization]: bearer(accessToken)
            },
            body: acpRdf
        })
    }

    static async putResource(resourceUri, sourceType, contentType, body, idToken) {
        const umaFetch = UmaClient.fetch.bind(undefined, idToken)
        const init = {
            cache: "no-store",
            method: HttpMethod.Put,
            headers: {
                [HttpHeader.ContentType]: contentType,
                [HttpHeader.Link]: `<${sourceType}>; rel="type"`
            },
            body
        }

        return await umaFetch(resourceUri, init)
    }

    static async postResource(resourceUri, sourceType, contentType, slug, idToken) {
        const umaFetch = UmaClient.fetch.bind(undefined, idToken)
        const init = {
            cache: "no-store",
            method: HttpMethod.Post,
            headers: {
                [HttpHeader.Slug]: slug,
                [HttpHeader.ContentType]: contentType,
                [HttpHeader.Link]: `<${sourceType}>; rel="type"`
            }
        }

        return await umaFetch(resourceUri, init)
    }

    static async grantAccess(resourceUri, isProvidedTo, mode, idToken) {
        const [, umaServer] = await UmaClient.parseUmaChallenge(resourceUri, {method: HttpMethod.Head})
        if (!umaServer) {
            console.log("UMA not supported")
            return
        }

        const uma = new UmaClient(umaServer)
        const umaDisco = await uma.discover()
        const vcServer = umaDisco.verifiable_credential_issuer

        const vcDiscoSuffix = "/.well-known/vc-configuration"
        const vcDisco = await fetchJson(new URL(vcDiscoSuffix, vcServer))
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
        const accessGrantResponse = await fetch(issueEndpoint, {
            method: HttpMethod.Post,
            headers: {
                [HttpHeader.Authorization]: bearer(idToken),
                [HttpHeader.ContentType]: Mime.Json
            },
            body: JSON.stringify(issuanceRequest)
        })

        return accessGrantResponse.headers.get(HttpHeader.Location)
    }
}
