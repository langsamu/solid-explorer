import {HttpHeader, HttpMethod, Mime, Oidc, Uma} from "../packages/common/Vocabulary.js"
import {Cache} from "../packages/common/Cache.js"
import {DPoP} from "../packages/oidc/DPoP.js"
import {DPopBoundAccessToken} from "./DPopBoundAccessToken.js"

export class UmaClient {
    #authorizationServer
    #metadataCache

    constructor(authorizationServer) {
        this.#authorizationServer = authorizationServer
        this.#metadataCache = new Cache("uma.metadata.cache")
    }

    /**
     * @param {string} ticket
     * @param {string} idToken
     * @param {CryptoKeyPair} dpopKey
     * @return {Promise<DPopBoundAccessToken>}
     */
    async exchangeTicket(ticket, idToken, dpopKey) {
        const umaDiscovery = await this.discover()

        const response = await fetch(umaDiscovery.token_endpoint, {
            method: HttpMethod.Post,
            headers: {
                [HttpHeader.ContentType]: Mime.Form,
                [HttpHeader.Accept]: Mime.Json,
                "DPoP": await DPoP.proof(umaDiscovery.token_endpoint, HttpMethod.Post, dpopKey)
            },
            body: new URLSearchParams({
                ticket,
                grant_type: Uma.TicketGrant,
                claim_token: idToken,
                claim_token_format: Oidc.IdToken
            })
        })
        const umaToken = await response.json()

        return new DPopBoundAccessToken(umaToken.access_token, dpopKey)
    }

    static async parseUmaChallenge(input, init) {
        const response = await fetch(input, init)

        if (response.ok || response.status !== 401) {
            return [response]
        }

        const challenge = response.headers.get(HttpHeader.WwwAuthenticate)
        const [, umaServer, umaTicket] = Uma.TicketParser.exec(challenge)

        return [response, umaServer, umaTicket]
    }

    async discover() {
        if (!this.#metadataCache.has(this.#authorizationServer)) {
            const response = await fetch(new URL(Uma.Discovery, this.#authorizationServer))
            const json = await response.json()

            this.#metadataCache.set(this.#authorizationServer, json)
        }

        return this.#metadataCache.get(this.#authorizationServer)
    }
}
