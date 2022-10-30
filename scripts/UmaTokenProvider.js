import {TokenProvider} from "../packages/common/TokenProvider.js"
import {UmaClient} from "./UmaClient.js"

const umaMatcher = /UMA as_uri="([^"]+)", ticket="([^"]+)"/;

export class UmaTokenProvider extends TokenProvider {
    #cache = new Map
    #oidc

    constructor(oidc) {
        super()

        this.#oidc = oidc;
    }

    /**
     * @param challenge {String}
     * @return {boolean}
     */
    matches(challenge) {
        return umaMatcher.test(challenge)
    }

    /**
     * @param challenge {string}
     * @return {Promise<string>}
     */
    async getToken(challenge) {
        if (this.#cache.has(challenge)) {
            const umaToken = this.#cache.get(challenge);
            if (expired(umaToken)) {
                return null
            }

            return umaToken
        }

        const [, asUri, ticket] = umaMatcher.exec(challenge)
        const umaClient = new UmaClient(asUri)
        const credentials = await this.#oidc.getCredentials()
        const umaToken = await umaClient.exchangeTicket(ticket, credentials.id_token)
        this.#cache.set(challenge, umaToken)

        return umaToken
    }
}

function expired(token) {
    const b = token.split(".")
    const c = atob(b[1])
    const d = JSON.parse(c)
    const e = d.exp
    const f = e * 1000
    const expiresAt = new Date(f)
    const ttlMillis = expiresAt - Date.now()

    return ttlMillis < 10 * 1000
}
