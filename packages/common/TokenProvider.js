export class TokenProvider extends EventTarget {
    /**
     * @abstract
     * @param challenge {string}
     * @return {boolean}
     */
    matches(challenge) {
        throw new Error("Not implemented")
    }

    /**
     * @abstract
     * @param challenge {string}
     * @return {Promise<AccessToken>}
     */
    async getToken(challenge) {
        throw new Error("Not implemented")
    }
}
