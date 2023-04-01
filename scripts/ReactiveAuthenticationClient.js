import {DPoP} from "../packages/oidc/DPoP.js"
import {Dpop, HttpHeader, HttpStatus, Oauth} from "../packages/common/Vocabulary.js"
import {DPopBoundAccessToken} from "./DPopBoundAccessToken.js"

const DEFAULT_AUTHENTICATION_MECHANISM = "Bearer"

export class ReactiveAuthenticationClient {
    /** @type {TokenProvider[]} */
    #tokenProviders

    #challengeCache

    /** @type {function(input: RequestInfo | URL, init?: RequestInit): Promise<Response>} */
    #underlyingFetch

    /**
     * @param {Map} cache
     * @param {TokenProvider[]} tokenProviders
     * @param {function(input: RequestInfo | URL, init?: RequestInit): Promise<Response>} fetch
     */
    constructor(cache, tokenProviders, fetch) {
        this.#challengeCache = cache
        this.#tokenProviders = tokenProviders
        this.#underlyingFetch = fetch
    }

    /**
     * @param {RequestInfo|URL} input
     * @param {RequestInit?} init
     * @return {Promise<Response>}
     */
    async fetch(input, init) {
        const original = new Request(input, init)

        // We might be dealing with a request that already has an authorization header.
        // It might actually be one of our own upgraded requests.
        // There's nothing we should do in this case, so we pipe it to the normal fetch.
        if (ReactiveAuthenticationClient.#isAuthenticated(original)) {
            return await this.#underlyingFetch.call(undefined, original)
        }

        // We might have already encountered this unauthenticated request.
        // Let's see if we can upgrade it with an authorization header generated from a cached challenge.
        // This is so we can skip the initial, unauthenticated request.
        const upgradedFromCache = await this.#tryUpgradingFromCachedChallenge(original)
        if (upgradedFromCache) {
            return await this.#underlyingFetch.call(undefined, upgradedFromCache)
        }

        // This unauthenticated request is new to us.
        // We must issue it using the normal fetch.
        // Our job is done if the response status is anything but 401.
        const response = await this.#underlyingFetch.call(undefined, original.clone())
        if (response.status !== HttpStatus.Unauthorized) {
            return response
        }

        // We are not authorized.
        // Let's extract and cache the challenge, so we can skip the initial request next time.
        // If there isn't one (or the header is not exposed to CORS), assume bearer tokens.
        const challenge = response.headers.get(HttpHeader.WwwAuthenticate) ?? DEFAULT_AUTHENTICATION_MECHANISM
        this.#challengeCache.set(original.url, challenge)

        // We will need a token provider that is familiar with this type of challenge.
        // If none of ours can do it then we bail with the unauthorized response.
        const tokenProvider = this.#tokenProviders.find(provider => provider.matches(challenge))
        if (tokenProvider === undefined) {
            return response
        }

        // We have everything we need.
        // Let's get a token suitable for the challenge, add it to the request and go home.
        const token = await tokenProvider.getToken(challenge)
        const upgraded = await ReactiveAuthenticationClient.#upgrade(original, token)
        return await this.#underlyingFetch.call(undefined, upgraded)
    }

    /**
     * @param {Request} request
     * @return {Promise<Request>}
     */
    async #tryUpgradingFromCachedChallenge(request) {
        const cachedChallenge = this.#challengeCache.get(request.url)
        if (cachedChallenge === null) {
            return null
        }

        const tokenProvider = this.#tokenProviders.find(provider => provider.matches(cachedChallenge));
        if (tokenProvider === undefined) {
            return null
        }

        const token = await tokenProvider.getToken(cachedChallenge)
        return await ReactiveAuthenticationClient.#upgrade(request, token)
    }

    /**
     * @param {Request} request
     * @return {boolean}
     */
    static #isAuthenticated(request) {
        return request.headers.has(HttpHeader.Authorization)
    }

    /**
     * @param {Request} request
     * @param {AccessToken} token
     * @return {Promise<Request>}
     */
    static async #upgrade(request, token) {
        const upgraded = new Request(request)

        if (token instanceof DPopBoundAccessToken) {
            upgraded.headers.set(HttpHeader.Authorization, [Dpop.Scheme, token.accessToken].join(" "))
            upgraded.headers.set(Dpop.Header, await DPoP.proof(request.url, request.method, token.dpopKey))
        } else {
            upgraded.headers.set(HttpHeader.Authorization, [Oauth.Bearer, token.accessToken].join(" "))
        }

        return upgraded
    }
}
