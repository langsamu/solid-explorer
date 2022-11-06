const VERIFIER_LENGTH = 32
const CHALLENGE_HASH_ALGORITHM = "SHA-256"

export class PKCE {
    static createVerifier() {
        return this.#escape(crypto.getRandomValues(new Uint8Array(VERIFIER_LENGTH)))
    }

    static async createChallenge(verifier) {
        return this.#escape(await crypto.subtle.digest(CHALLENGE_HASH_ALGORITHM, new TextEncoder().encode(verifier)))
    }

    static #escape(data) {
        return btoa(String.fromCharCode(...new Uint8Array(data)))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "")
    }
}
