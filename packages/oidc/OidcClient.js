import {HttpHeader, HttpMethod, Mime, Oidc, Solid} from "../common/Vocabulary.js"
import {Cache} from "../common/Cache.js"
import {basic} from "../common/Utils.js"
import {PKCE} from "./PKCE.js"
import {DPoP} from "./DPoP.js"

export class OidcClient {
    static #registrationMinTtlMillis = 10 * 1000

    #identityProvider
    #redirectUri
    #metadataCache
    #clientCache
    #pkceVerifier

    constructor(identityProvider, redirectUri, pkceVerifier) {
        this.#identityProvider = identityProvider
        this.#redirectUri = redirectUri
        this.#metadataCache = new Cache("oidc.metadata.cache")
        this.#clientCache = new Cache("oidc.client.cache")
        this.#pkceVerifier = pkceVerifier
    }

    async register() {
        if (!this.#clientCache.has(this.#identityProvider)) {
            const disco = await this.#discover()

            const response = await fetch(disco.registration_endpoint, {
                method: HttpMethod.Post,
                headers: {
                    [HttpHeader.ContentType]: Mime.Json
                },
                body: JSON.stringify({
                    redirect_uris: [this.#redirectUri]
                }),
                redirect: "manual" // NSS responds with 201
            })
            const oidcRegistration = await response.json()

            this.#clientCache.set(this.#identityProvider, oidcRegistration)
        }

        const registration = this.#clientCache.get(this.#identityProvider)

        if (expiresIn(registration, OidcClient.#registrationMinTtlMillis)) {
            this.#clientCache.clear(this.#identityProvider)
            return this.register()
        }

        return registration
    }

    async authorize(clientId) {
        const disco = await this.#discover()

        const authorizationRequest = new URLSearchParams({
            scope: [Oidc.Scope, Solid.WebIdScope].join(" "),
            response_type: Oidc.Code,
            client_id: clientId,
            redirect_uri: this.#redirectUri,
            code_challenge: await PKCE.createChallenge(this.#pkceVerifier),
            code_challenge_method: "S256",
        })

        const authorizationUrl = new URL(`?${authorizationRequest}`, disco.authorization_endpoint)
        location.assign(authorizationUrl)
    }

    async exchangeToken(code, clientId, clientSecret, dpopKey) {
        const disco = await this.#discover()

        const init = {
            method: HttpMethod.Post,
            body: new URLSearchParams({
                grant_type: Oidc.AuthorizationCode,
                client_id: clientId,
                code,
                redirect_uri: this.#redirectUri,
                code_verifier: this.#pkceVerifier,
            }),
            headers: new Headers
        }

        if (clientSecret) {
            init.headers.set(HttpHeader.Authorization, basic(clientId, clientSecret))
        }

        init.headers.set("DPoP", await DPoP.proof(disco.token_endpoint, HttpMethod.Post, dpopKey))

        const response = await fetch(disco.token_endpoint, init)
        return response.json()
    }

    async #discover() {
        if (!this.#metadataCache.has(this.#identityProvider)) {
            const response = await fetch(new URL(Oidc.Discovery, this.#identityProvider))
            const json = await response.json()

            this.#metadataCache.set(this.#identityProvider, json)
        }

        return this.#metadataCache.get(this.#identityProvider)
    }
}

function expiresIn(registration, expectedTtlMillis) {
    if (registration.client_secret_expires_at === 0) { // NSS says this
        return false
    }

    const expiresAtMillis = registration.client_secret_expires_at * 1000
    const expiresAt = new Date(expiresAtMillis)
    const ttlMillis = expiresAt - Date.now()

    return ttlMillis < expectedTtlMillis
}
