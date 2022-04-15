import {HttpHeader, Mime, Pim, Solid} from "./Vocabulary.js"
import {fetchJson, toTriples} from "./Utils.js"
import {Cache} from "./Cache.js"
import "https://unpkg.com/jsonld@5.2.0/dist/jsonld.esm.min.js"

export class WebIdClient {
    static #profileCache = new Cache("webid.profile.cache")

    static async dereference(webId) {
        if (!this.#profileCache.has(webId)) {
            const response = await fetchJson(webId, {
                headers: {
                    [HttpHeader.Accept]: Mime.JsonLd
                }
            })

            const quads = toTriples(await jsonld.flatten(response))

            let agent = quads.filter(q => q.subject === webId);
            const storages = agent.filter(q => q.predicate === Pim.Storage).map(q => q.object)
            const issuers = agent.filter(q => q.predicate === Solid.OidcIssuer).map(q => q.object)

            this.#profileCache.set(webId, {
                issuers,
                storages
            })
        }

        return this.#profileCache.get(webId)
    }
}
