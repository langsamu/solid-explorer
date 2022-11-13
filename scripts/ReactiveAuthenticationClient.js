import {DPoP} from "../packages/oidc/DPoP.js"

const AUTHORIZATION = "Authorization"
const UNAUTHORIZED = 401;
const WWW_AUTHENTICATE = "Www-Authenticate";
const DEFAULT_AUTHENTICATION_MECHANISM = "Www-Bearer";

export class ReactiveAuthenticationClient {
    /** @type {TokenProvider[]} */
    #tokenProviders

    #challengeCache = new Map

    #underlyingFetch

    /**
     * @param {TokenProvider[]} tokenProviders
     * @param fetch
     */
    constructor(tokenProviders, fetch = window.fetch) {
        this.#tokenProviders = tokenProviders
        this.#underlyingFetch = fetch
    }

    /**
     * @param {RequestInfo|URL} input
     * @param {RequestInit?} init
     * @return {Promise<Response>}
     */
    async fetch(input, init) {
        const request = new Request(input, init)

        if (ReactiveAuthenticationClient.#isAuthenticated(request)) {
            return this.#underlyingFetch.call(undefined, request)
        }

        const cachedChallenge = this.#challengeCache.get(request.url)

        if (cachedChallenge) {
            const token = await this.#tokenProviders.find(provider => provider.matches(cachedChallenge)).getToken(cachedChallenge)

            if (token !== null) {
                const upgraded = await ReactiveAuthenticationClient.#upgrade(request, token)
                return this.fetch(upgraded)
            }
        }

        const originalResponse = await this.#underlyingFetch.call(undefined, request)
        if (originalResponse.status !== UNAUTHORIZED) {
            return originalResponse
        }

        // Extract challenge from unauthorized response.
        // In case there isn't one (or this header is not exposed to CORS) assume bearer authentication.
        const challenge = originalResponse.headers.get(WWW_AUTHENTICATE) ?? DEFAULT_AUTHENTICATION_MECHANISM

        this.#challengeCache.set(request.url, challenge)
        const token = await this.#tokenProviders.find(provider => provider.matches(challenge)).getToken(challenge)
        const upgraded = await ReactiveAuthenticationClient.#upgrade(request, token)
        return this.fetch(upgraded)
    }

    /**
     * @param {Request} request
     * @return {boolean}
     */
    static #isAuthenticated(request) {
        return request.headers.has(AUTHORIZATION)
    }

    /**
     * @param {Request} request
     * @param {DPopBoundAccessToken} token
     * @return {Request}
     */
    static async #upgrade(request, token) {
        const upgraded = new Request(request)
        upgraded.headers.set(AUTHORIZATION, `DPoP ${token.accessToken}`)
        upgraded.headers.set("DPoP", await DPoP.proof(request.url, request.method, token.dpopKey))

        return upgraded
    }
}
