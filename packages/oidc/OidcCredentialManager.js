import "./SolidOidcUi.js"
import {OidcClient} from "./OidcClient.js"
import {Oauth, Oidc, OidcRegistration, Pkce} from "../common/Vocabulary.js"
import {PKCE} from "./PKCE.js"

export class OidcCredentialManager {
    static #registrationMinTtlMillis = 10 * 1000

    #credentials
    #gettingCredentials
    #ui
    #clientCredentials

    addUi(container) {
        this.#ui = container.appendChild(container.ownerDocument.createElement("solid-oidc-ui"))
    }

    async getCredentials() {
        if (this.#gettingCredentials instanceof Promise) {
            console.log("`OidcCredentialManager#getCredentials` waiting")
            await this.#gettingCredentials
        }

        // See if we have cached credentials
        if (this.#credentials) {
            // Assuming ID token and access token have same expiry
            const expiry = JSON.parse(atob(this.#credentials.tokenResponse[Oidc.IdToken].split(".")[1])).exp * 1000

            // Make sure there's at least ten seconds to go until token expires
            if (new Date(expiry) - Date.now() > 10000) {
                return this.#credentials
            }
        }

        let releaseLock
        this.#gettingCredentials = new Promise(resolve => releaseLock = () => resolve(this.#gettingCredentials = null))

        const idp = await this.#ui.getIdpUri()
        if (!idp) {
            return releaseLock()
        }

        const redirectUri = new URL("./authentication.html", new URL(location.pathname, location.origin))
        const codeVerifier = PKCE.createVerifier()
        const codeChallenge = await PKCE.createChallenge(codeVerifier);
        const oidcClient = new OidcClient(idp, redirectUri);
        let {client_id, client_secret} = await this.#register(oidcClient)

        const authenticationUrl = `${redirectUri}?${new URLSearchParams({
            idp,
            [Oauth.ClientId]: client_id,
            [Pkce.CodeChallenge]: codeChallenge
        })}`

        const code = await this.#getCodeFromAuthNWindow(authenticationUrl)
        const dpopKey = await crypto.subtle.generateKey({name: "ECDSA", namedCurve: "P-256"}, true, ["sign"])
        const tokenResponse = await oidcClient.exchangeToken(code, client_id, client_secret, dpopKey, codeVerifier)
        const credentials = {dpopKey, tokenResponse}

        return releaseLock() || (this.#credentials = credentials)
    }

    clearCredentials() {
        this.#credentials = null
        this.#clientCredentials = null
    }

    async getStorageFromWebId() {
        return this.#ui.getStorageFromWebId()
    }

    async #getCodeFromAuthNWindow(authenticationUrl) {
        // Open the authN window and wait for it to post us a message with the encrypted OIDC token response
        return await new Promise(async resolve => {
            window.addEventListener("message", async e => {
                // Notify that user interaction is no longer needed
                this.#ui.gotInteraction()

                resolve(e.data)
            }, {once: true})

            const authenticationWindow = open(authenticationUrl)

            // If popup was blocked then request user interaction to open authentication window
            if (!authenticationWindow) {
                this.#ui.needInteraction(authenticationUrl)
            }
        })
    }

    async #register(oidcClient) {
        if (!this.#clientCredentials) {
            this.#clientCredentials = {
                [Oauth.ClientId]: new URL("./id.jsonld", location)
            }

            // Use public client ID without secret by default but register client dynamically if on localhost.
            if (["localhost", "127.0.0.1", "::1"].includes(location.hostname)) {
                Object.assign(this.#clientCredentials, await oidcClient.register())
            }
        }

        if (expiresIn(this.#clientCredentials, OidcCredentialManager.#registrationMinTtlMillis)) {
            this.#clientCredentials = null
            return this.#register(oidcClient)
        }

        return this.#clientCredentials
    }
}

function expiresIn(registration, expectedTtlMillis) {
    if (registration[OidcRegistration.ClientSecretExpiresAt] === 0) { // NSS says this
        return false
    }

    const expiresAtMillis = registration[OidcRegistration.ClientSecretExpiresAt] * 1000
    const expiresAt = new Date(expiresAtMillis)
    const ttlMillis = expiresAt - Date.now()

    return ttlMillis < expectedTtlMillis
}
