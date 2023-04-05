import {TokenProvider} from "../common/TokenProvider.js"
import {DPopBoundAccessToken} from "../../scripts/DPopBoundAccessToken.js"
import {Oidc} from "../common/Vocabulary.js"

const dpopMatcher = /DPoP/

export class DPoPTokenProvider extends TokenProvider {
    /** @inheritDoc */
    matches(challenge) {
        return dpopMatcher.test(challenge)
    }

    /** @inheritDoc */
    async getToken(challenge) {
        const credentials = await this.#getCredentials()

        return new DPopBoundAccessToken(credentials.tokenResponse[Oidc.IdToken], credentials.dpopKey)
    }

    async #getCredentials() {
        return await new Promise(resolve => this.dispatchEvent(new CustomEvent("needCredentials", {detail: {resolve}})))
    }
}
