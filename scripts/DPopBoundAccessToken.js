import {AccessToken} from "./AccessToken.js"

export class DPopBoundAccessToken extends AccessToken {
    #dpopKey

    /**
     * @param {string} accessToken
     * @param {CryptoKeyPair} dpopKey
     */
    constructor(accessToken, dpopKey) {
        super(accessToken)

        this.#dpopKey = dpopKey
    }

    /** @type {CryptoKeyPair} */
    get dpopKey() {
        return this.#dpopKey
    }
}
