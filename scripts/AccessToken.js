export class AccessToken {
    #accessToken

    /**
     * @param {string} accessToken
     */
    constructor(accessToken) {
        this.#accessToken = accessToken
    }

    /** @type {string} */
    get accessToken() {
        return this.#accessToken
    }
}
