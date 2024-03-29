import {TokenProvider} from "../common/TokenProvider.js"
import {AccessToken} from "../../scripts/AccessToken.js"
import {Oidc} from "../common/Vocabulary.js"

const oidcMatcher = /Bearer/

export class OidcTokenProvider extends TokenProvider {
    /** @inheritDoc */
    matches(challenge) {
        return oidcMatcher.test(challenge)
    }

    /** @inheritDoc */
    async getToken(challenge) {
        const credentials = await this.#getCredentials()

        return new AccessToken(credentials.tokenResponse[Oidc.IdToken])
    }

    async #getCredentials() {
        return await new Promise(resolve => this.dispatchEvent(new CustomEvent("needCredentials", {detail: {resolve}})))
    }
}
