import {TokenProvider} from "../common/TokenProvider.js"

const oidcMatcher = /Bearer/;

export class OidcTokenProvider extends TokenProvider {
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
        return oidcMatcher.test(challenge)
    }

    /**
     * @param challenge {string}
     * @return {Promise<string>}
     */
    async getToken(challenge) {
        const credentials = await this.#oidc.getCredentials()

        return credentials.id_token
    }
}
