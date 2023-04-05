import {Jws, Jwt} from "../common/Vocabulary.js"
import {JWS} from "./JWS.js"

export class JWT {
    // TODO: DPoP proof JWT should be short lived
    static #defaultExpiry = 60 * 5
    #header
    #body

    constructor(type, claims) {
        const issuedAt = JWT.#epoch()

        this.#body = {
            ...claims,

            [Jwt.ExpirationTime]: issuedAt + JWT.#defaultExpiry,
            [Jwt.IssuedAt]: issuedAt,
            [Jwt.JwtId]: JWT.#generateId(),
        }

        this.#header = {
            [Jws.Type]: type,
        }
    }

    get header() {
        return this.#header
    }

    toString() {
        const head = JWS.base64UrlEncode(JSON.stringify(this.#header))
        const body = JWS.base64UrlEncode(JSON.stringify(this.#body))

        return [head, body].join(".")
    }

    static #epoch() {
        return Math.floor(Date.now() / 1000)
    }

    /**
     * @return {string}
     */
    static #generateId() {
        return JWS.base64UrlEncode(JSON.stringify(crypto.getRandomValues(new Uint8Array(32))))
    }
}
