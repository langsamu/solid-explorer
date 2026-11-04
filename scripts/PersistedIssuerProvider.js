export class PersistedIssuerProvider {
    #fallback

    constructor(fallback) {
        this.#fallback = fallback
    }

    async getIssuer(request) {
        const stored = localStorage.getItem("idpUri")
        if (stored) {
            return new URL(stored)
        }

        const issuer = await this.#fallback.getIssuer(request)
        localStorage.setItem("idpUri", issuer.href)

        return issuer
    }
}
