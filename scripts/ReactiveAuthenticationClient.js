const AUTHORIZATION = "Authorization"
const UNAUTHORIZED = 401;
const WWW_AUTHENTICATE = "Www-Authenticate";

export class ReactiveAuthenticationClient {
    /** @type {TokenProvider[]} tokenProviders */
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
        if (ReactiveAuthenticationClient.#isAuthenticated(input, init)) {
            return await fetch(input, init)
        }

        const requestUri = ReactiveAuthenticationClient.#getRequestUri(input)
        const cachedChallenge = this.#challengeCache.get(requestUri)

        if (cachedChallenge) {
            const token = await this.#tokenProviders.find(provider => provider.matches(cachedChallenge)).getToken(cachedChallenge)

            if (token !== null) {
                const {
                    input: upgradedInput,
                    init: upgradedInit
                } = ReactiveAuthenticationClient.#upgrade(input, init, token)
                return await this.fetch(upgradedInput, upgradedInit)
            }
        }

        const originalResponse = await this.#underlyingFetch.call(undefined, input, init)
        if (originalResponse.status !== UNAUTHORIZED) {
            return originalResponse
        }

        const challenge = originalResponse.headers.get(WWW_AUTHENTICATE)
        if (!challenge) {
            return originalResponse
        }

        this.#challengeCache.set(requestUri, challenge)
        const token = await this.#tokenProviders.find(provider => provider.matches(challenge)).getToken(challenge)
        const {input: upgradedInput, init: upgradedInit} = ReactiveAuthenticationClient.#upgrade(input, init, token)
        return await this.fetch(upgradedInput, upgradedInit)
    }

    /**
     * @param {RequestInfo|URL} input
     * @param {RequestInit?} init
     * @return {boolean}
     */
    static #isAuthenticated(input, init) {
        if (input instanceof Request) {
            return input.headers.has(AUTHORIZATION)
        } else {
            if (!init) {
                return false
            }

            if (!init.headers) {
                return false
            }

            if (init.headers instanceof Headers) {
                return init.headers.has(AUTHORIZATION)
            }

            return init.headers.hasOwnProperty(AUTHORIZATION)
        }
    }

    /**
     * @param {RequestInfo|URL} input
     * @return {string}
     */
    static #getRequestUri(input) {
        if (input instanceof Request) {
            return input.url.toString()
        } else {
            return input.toString()
        }
    }

    /**
     * @param {RequestInfo|URL} input
     * @param {RequestInit?} init
     * @param {string} token
     * @return {{input: RequestInfo|URL, init: RequestInit}}
     */
    static #upgrade(input, init, token) {
        const upgraded = {input, init}

        if (input instanceof Request) {
            upgraded.input = new Request(input, init)
            upgraded.input.headers.set(AUTHORIZATION, `Bearer ${token}`)
        } else {
            const newHeaders = new Headers(init?.headers)
            newHeaders.set(AUTHORIZATION, `Bearer ${token}`)

            upgraded.init = Object.assign({}, init, {headers: newHeaders})
        }

        return upgraded
    }
}
