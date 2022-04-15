import {HttpHeader, HttpMethod, Mime, Oidc, Uma} from "./Vocabulary.js"
import {bearer, fetchJson} from "./Utils.js"
import {Cache} from "./Cache.js"

export class UmaClient {
    #authorizationServer
    #metadataCache

    constructor(authorizationServer) {
        this.#authorizationServer = authorizationServer
        this.#metadataCache = new Cache("uma.metadata.cache")
    }

    async exchangeTicket(ticket, idToken) {
        const umaDiscovery = await this.#discover()

        const umaToken = await fetchJson(umaDiscovery.token_endpoint, {
            method: HttpMethod.Post,
            headers: {
                [HttpHeader.ContentType]: Mime.Form,
                [HttpHeader.Accept]: Mime.Json
            },
            body: new URLSearchParams({
                ticket,
                grant_type: Uma.TicketGrant,
                claim_token: idToken,
                claim_token_format: Oidc.IdToken
            })
        })

        return umaToken.access_token
    }

    static async fetch(idToken, input, init) {
        const response = await fetch(input, init)

        if (response.ok || response.status !== 401) {
            return response
        }

        const challenge = response.headers.get(HttpHeader.WwwAuthenticate)
        const [, umaServer, umaTicket] = Uma.TicketParser.exec(challenge)
        const uma = new UmaClient(umaServer)

        const umaAccessToken = await uma.exchangeTicket(umaTicket, idToken)
        const newHeaders = Object.assign({}, init?.headers ?? {}, {[HttpHeader.Authorization]: bearer(umaAccessToken)})
        const newInit = Object.assign({}, init ?? {}, {headers: newHeaders})

        return await fetch(input, newInit)
    }

    async #discover() {
        if (!this.#metadataCache.has(this.#authorizationServer)) {
            const response = await fetchJson(new URL(Uma.Discovery, this.#authorizationServer))

            this.#metadataCache.set(this.#authorizationServer, response)
        }

        return this.#metadataCache.get(this.#authorizationServer)
    }
}
