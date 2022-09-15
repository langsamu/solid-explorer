import {HttpHeader, Mime, Pim, Solid} from "../packages/common/Vocabulary.js"
import {toTriples} from "../packages/common/Utils.js"
import {Cache} from "../packages/common/Cache.js"
import "https://unpkg.com/jsonld@5.2.0/dist/jsonld.esm.min.js"

export class WebIdClient {
    static #profileCache = new Cache("webid.profile.cache")

    static async dereference(webId) {
        if (!this.#profileCache.has(webId)) {
            const response = await fetch(webId, {
                cache: "no-store",
                headers: {
                    [HttpHeader.Accept]: Mime.JsonLd
                }
            })
            const json = await response.json()

            const quads = toTriples(await jsonld.flatten(json))

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
