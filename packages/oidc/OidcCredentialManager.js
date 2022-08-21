import "./SolidOidcUi.js"

export class OidcCredentialManager {
    #credentials
    #gettingCredentials
    #ui

    addUi(container){
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
            const expiry = JSON.parse(atob(this.#credentials.id_token.split(".")[1])).exp * 1000

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

        // These keys will be used
        // (1) by an authN child window to wrap the symmetric key it uses to encrypt the OIDC response and
        // (2) by this window to unwrap that symmetric key so we can decrypt the OIDC response.
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 4096,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: "SHA-256",
            },
            true,
            ["wrapKey", "unwrapKey"]
        )

        const key = btoa(JSON.stringify(await crypto.subtle.exportKey("jwk", keyPair.publicKey)))
        const authenticationUrl = `./authentication.html?${new URLSearchParams({idp, key})}`;
        const credentials = await this.#getOidcCredentialsFromAuthNWindow(authenticationUrl, keyPair.privateKey)

        return releaseLock() || (this.#credentials = credentials)
    }

    clearCredentials() {
        this.#credentials = null
    }

    async getStorageFromWebId() {
        return this.#ui.getStorageFromWebId()
    }

    async #getOidcCredentialsFromAuthNWindow(authenticationUrl, encryptionKey) {
        // Open the authN window and wait for it to post us a message with the encrypted OIDC token response
        return await new Promise(async resolve => {
            window.addEventListener("message", async e => {
                // Notify that user interaction is no longer needed
                this.#ui.gotInteraction()

                resolve(await OidcCredentialManager.#decryptOidcTokenResponse(e.data, encryptionKey))
            }, {once: true})

            const authenticationWindow = open(authenticationUrl)

            // If popup was blocked then request user interaction to open authentication window
            if (!authenticationWindow) {
                this.#ui.needInteraction(authenticationUrl)
            }
        })
    }

    static async #decryptOidcTokenResponse(data, decryptionKey) {
        // Get symmetric key from event data and unwrap using our own private key
        const key = await crypto.subtle.unwrapKey(
            "jwk",
            data.key,
            decryptionKey,
            {name: "RSA-OAEP"},
            data.algorithm,
            false,
            ["decrypt"])

        // Decrypt response from event data using the unwrapped key it was encrypted with
        const tokenResponseBytes = await crypto.subtle.decrypt(
            data.algorithm,
            key,
            data.response)

        // Convert back from bytes to OIDC response JSON
        return JSON.parse(new TextDecoder().decode(tokenResponseBytes))
    }
}
