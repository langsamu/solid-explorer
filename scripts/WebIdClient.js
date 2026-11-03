import {HttpHeader, Mime, Pim, Solid} from "../packages/common/Vocabulary.js"
import {Cache} from "../packages/common/Cache.js"
import {DatasetWrapper, NamedNodeAs, NamedNodeFrom, SetFrom, TermWrapper} from "https://unpkg.com/@rdfjs/wrapper@0.34.0/dist/mod.js"
import "../packages/unpkg.com/n3@1.16.2/browser/n3.min.js"

export class WebIdClient {
    static #profileCache = new Cache("webid.profile.cache")

    /**
     *
     * @param webId
     * @return {Promise<Profile>}
     */
    static async dereference(webId) {
        if (!this.#profileCache.has(webId)) {
            const response = await fetch(webId, {
                cache: "no-store",
                headers: {
                    [HttpHeader.Accept]: Mime.Turtle
                }
            })

            this.#profileCache.set(webId, await response.text())
        }

        const rdf = this.#profileCache.get(webId)
        const dataset = new N3.Store(new N3.Parser().parse(rdf))
        return new Profile(dataset, N3.DataFactory)
    }
}

class Profile extends DatasetWrapper {
    /**
     * @return {Agent}
     */
    get agent() {
        for (const agent of this.objectsOf(Foaf.primaryTopic, Agent)) {
            return agent
        }
        for (const agent of this.subjectsOf(Foaf.isPrimaryTopicOf, Agent)) {
            return agent
        }
    }
}

class Agent extends TermWrapper {
    /**
     * @return {Set<string>}
     */
    get issuer() {
        return SetFrom.subjectPredicate(this, Solid.OidcIssuer, NamedNodeAs.string, NamedNodeFrom.string)
    }

    /**
     * @return {Set<string>}
     */
    get storage() {
        return SetFrom.subjectPredicate(this, Pim.Storage, NamedNodeAs.string, NamedNodeFrom.string)
    }
}

class Foaf {
    static primaryTopic = "http://xmlns.com/foaf/0.1/primaryTopic"
    static isPrimaryTopicOf = "http://xmlns.com/foaf/0.1/isPrimaryTopicOf"
}
