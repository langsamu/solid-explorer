import {Dpop} from "../common/Vocabulary.js"
import {JWT} from "./JWT.js"
import {JWS} from "./JWS.js"

export class DPoP {
    /**
     * @param {string} httpTargetUri
     * @param {string} httpMethod
     * @param {CryptoKeyPair} key
     * @return {Promise<string>}
     */
    static async proof(httpTargetUri, httpMethod, key) {
        const claims = {
            [Dpop.HttpMethod]: httpMethod,
            [Dpop.HttpTargetUri]: httpTargetUri,
        }

        const jwt = new JWT(Dpop.MediaType, claims)
        return JWS.sign(jwt, key)
    }
}
