import {Jwa, Jws, WebCrypto} from "../common/Vocabulary.js"

export class JWS {
    /**
     * @param {JWT} jwt
     * @param {CryptoKeyPair} key
     */
    static async sign(jwt, key) {
        jwt.header[Jws.Algorithm] = Jwa.ECDSAUsingP256AndSha256
        jwt.header[Jws.JsonWebKey] = await this.#extractPublicKey(key)

        const headAndBody = jwt.toString()
        const algorithm = {
            [WebCrypto.AlgorithmName]: WebCrypto.ECDSA,
            [WebCrypto.HashAlgorithm]: WebCrypto.SHA256,
        }
        const jwtBytes = new TextEncoder().encode(headAndBody);
        const signatureBytes = await crypto.subtle.sign(algorithm, key.privateKey, jwtBytes)
        const signature = JWS.base64UrlEncode(String.fromCharCode(...new Uint8Array(signatureBytes)))

        return [headAndBody, signature].join(".")
    }

    static base64UrlEncode(str) {
        return btoa(str)
            .replace(/=+$/, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
    }

    /**
     * @param {CryptoKeyPair} key
     * @return {Promise<JsonWebKey>}
     */
    static async #extractPublicKey(key) {
        return await crypto.subtle.exportKey(Jws.JsonWebKey, key.publicKey)
    }
}
